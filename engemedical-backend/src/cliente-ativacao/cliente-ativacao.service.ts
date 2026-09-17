import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CommitmentsService } from '../commitments/commitments.service';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ClienteCompanyAccessService } from '../cliente-funcionarios/cliente-company-access.service';
import { MongoService } from '../mongo/mongo.service';
import { ClientActivationRepository } from './cliente-ativacao.repository';
import { ClientActivationDocument, ClientActivationRepositoryPort, ClientActivationResponse } from './cliente-ativacao.types';
import { validateEmployeeSheet } from './employee-sheet.validator';
import { isActivationMeetingSlot } from './activation-schedule';

@Injectable()
export class ClientActivationService {
  constructor(
    private readonly accessService: ClienteCompanyAccessService,
    private readonly repository: ClientActivationRepository,
    private readonly companyReader: MongoService,
    private readonly commitments: CommitmentsService,
  ) {}

  async getActivation(companyCode: string, registrationCode: string, userId: string): Promise<ClientActivationResponse> {
    const access = await this.accessService.assertCanAccess(companyCode, registrationCode);
    const company = await this.companyReader.findEmpresaByCode(access.companyCode);
    const record = await this.repository.findByUserAndCompany(userId, access.companyCode);

    return {
      company: {
        companyCode: access.companyCode,
        companyName: String(company?.RAZAOSOCIAL ?? access.companyName ?? 'Empresa').trim(),
        cnpj: String(company?.CNPJ ?? '').trim(),
        filialId: String(company?.FILIALID ?? company?.FILIAL_ID ?? company?.CODIGOFILIAL ?? '').trim(),
      },
      activation: this.toSummary(record),
    };
  }

  async start(companyCode: string, registrationCode: string, userId: string): Promise<ClientActivationResponse> {
    const access = await this.accessService.assertCanAccess(companyCode, registrationCode);
    const company = await this.companyReader.findEmpresaByCode(access.companyCode);
    const existing = await this.repository.findByUserAndCompany(userId, access.companyCode);
    if (existing) return this.getActivation(companyCode, registrationCode, userId);
    if (!this.repository.start) throw new Error('Repositório de ativação sem suporte a início');
    await this.repository.start({
      id: randomUUID(), userId, companyCode: access.companyCode,
      companyName: String(company?.RAZAOSOCIAL ?? access.companyName ?? 'Empresa').trim(),
      cnpj: String(company?.CNPJ ?? '').trim(),
      filialId: String(company?.FILIALID ?? company?.FILIAL_ID ?? company?.CODIGOFILIAL ?? '').trim(),
      status: 'IN_PROGRESS', currentStep: 'APPOINTMENT', completedSteps: [], pendingItems: ['APPOINTMENT'], progress: 0,
      createdAt: new Date(), updatedAt: new Date(),
    });
    return this.getActivation(companyCode, registrationCode, userId);
  }

  async saveAppointment(id: string, companyCode: string, registrationCode: string, userId: string, input: { start_time: string; end_time: string; emails_comunicado?: string[] }) {
    if (!isActivationMeetingSlot(input.start_time, input.end_time)) {
      throw new BadRequestException('A reunião deve ser agendada de segunda a sexta-feira, em um slot de 60 minutos entre 09:00 e 18:00, com intervalo das 12:00 às 13:00.');
    }
    const activation = await this.requireOwned(id, companyCode, registrationCode, userId);
    const commitment = await this.commitments.create({
      participants: ['IMPLANTACAO'], title: `Reunião de implantação - ${activation.companyName ?? companyCode}`,
      type: 'ATIVACAO_CLIENTE',
      description: `Reunião inicial da ativação do cliente. Código da empresa: ${companyCode}. Identificador da ativação: ${id}.`,
      start_time: input.start_time, end_time: input.end_time,
      company: activation.companyName, company_contact: activation.contact?.email, emails_comunicado: input.emails_comunicado ?? [],
    });
    if (!this.repository.update) throw new Error('Repositório de ativação sem suporte a atualização');
    await this.repository.update(id, userId, companyCode, { appointmentId: String(commitment.id), currentStep: 'COMPANY', completedSteps: ['APPOINTMENT'], pendingItems: ['COMPANY'], progress: 20 });
    return this.getActivation(companyCode, registrationCode, userId);
  }

  async saveCompanyContact(id: string, companyCode: string, registrationCode: string, userId: string, input: { confirmed: boolean; name: string; email: string; phone?: string }) {
    if (!input.confirmed || !input.name?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email ?? '')) throw new BadRequestException('Confirme os dados e informe um contato válido.');
    await this.requireOwned(id, companyCode, registrationCode, userId);
    if (!this.repository.update) throw new Error('Repositório de ativação sem suporte a atualização');
    await this.repository.update(id, userId, companyCode, { contact: { name: input.name.trim(), email: input.email.trim(), phone: input.phone?.trim() }, currentStep: 'EMPLOYEES', completedSteps: ['APPOINTMENT', 'COMPANY', 'CONTACT'], pendingItems: ['EMPLOYEES'], progress: 50 });
    return this.getActivation(companyCode, registrationCode, userId);
  }

  async confirmCompany(id: string, companyCode: string, registrationCode: string, userId: string) {
    await this.requireOwned(id, companyCode, registrationCode, userId);
    if (!this.repository.update) throw new Error('Repositório de ativação sem suporte a atualização');
    await this.repository.update(id, userId, companyCode, { currentStep: 'CONTACT', completedSteps: ['APPOINTMENT', 'COMPANY'], pendingItems: ['CONTACT'], progress: 30 });
    return this.getActivation(companyCode, registrationCode, userId);
  }

  async uploadEmployeeSheet(id: string, companyCode: string, registrationCode: string, userId: string, file: Express.Multer.File) {
    const activation = await this.requireOwned(id, companyCode, registrationCode, userId);
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const validation = validateEmployeeSheet(file.originalname, file.buffer);
    if (!validation.valid) throw new BadRequestException(`Planilha inválida. Colunas ausentes: ${validation.missingHeaders.join(', ')}`);
    const key = `cliente-ativacoes/${companyCode}/${id}/funcionarios-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const client = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID || '', secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '' } });
    await client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || 'documents', Key: key, Body: file.buffer, ContentType: file.mimetype }));
    if (!this.repository.update) throw new Error('Repositório de ativação sem suporte a atualização');
    await this.repository.update(id, userId, companyCode, { employeeSheet: { key, filename: file.originalname, size: file.size, rowCount: validation.rowCount, uploadedAt: new Date() }, currentStep: 'REVIEW', completedSteps: ['APPOINTMENT', 'COMPANY', 'CONTACT', 'EMPLOYEES'], pendingItems: ['REVIEW'], progress: 80, status: 'SUBMITTED', submittedAt: new Date() });
    return this.getActivation(companyCode, registrationCode, userId);
  }

  private async requireOwned(id: string, companyCode: string, registrationCode: string, userId: string): Promise<ClientActivationDocument> {
    await this.accessService.assertCanAccess(companyCode, registrationCode);
    const record = await this.repository.findByUserAndCompany(userId, companyCode);
    if (!record || record.id !== id) throw new NotFoundException('Ativação não encontrada');
    return record;
  }

  private toSummary(record: ClientActivationDocument | null): ClientActivationResponse['activation'] {
    if (!record) {
      return { status: 'NOT_STARTED', currentStep: 'COMPANY', completedSteps: [], pendingItems: ['COMPANY'], progress: 0 };
    }

    return {
      id: record.id,
      status: record.status,
      currentStep: record.currentStep,
      completedSteps: record.completedSteps ?? [],
      pendingItems: record.pendingItems ?? [],
      progress: Math.min(100, Math.max(0, Number(record.progress) || 0)),
      contact: record.contact,
      appointmentId: record.appointmentId,
      employeeSheet: record.employeeSheet,
    };
  }
}
