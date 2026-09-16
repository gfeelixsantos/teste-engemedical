import { Injectable } from '@nestjs/common';
import { ClienteCompanyAccessService } from '../cliente-funcionarios/cliente-company-access.service';
import { MongoService } from '../mongo/mongo.service';
import { ClientActivationDocument, ClientActivationRepositoryPort, ClientActivationResponse } from './cliente-ativacao.types';

@Injectable()
export class ClientActivationService {
  constructor(
    private readonly accessService: ClienteCompanyAccessService,
    private readonly repository: ClientActivationRepositoryPort,
    private readonly companyReader: Pick<MongoService, 'findEmpresaByCode'>,
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
    };
  }
}
