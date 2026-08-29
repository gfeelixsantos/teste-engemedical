import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from 'src/mongo/mongo.service';
import { ObjectId } from 'mongodb';
import { AtendimentoAuthInfo } from 'src/mongo/types/scheduling';

@Injectable()
export class AtendimentoAuthService {
  private readonly logger = new Logger(AtendimentoAuthService.name);

  constructor(private readonly mongoService: MongoService) {}

  async resolveIdentityFromScheduling(
    schedulingId: string,
    operador?: { codigo: string; nome?: string; perfil?: string },
  ): Promise<{ cpf: string; dataNascimento: string } | null> {
    try {
      const doc = await this.mongoService.db
        .collection('schedulings')
        .findOne(
          { _id: new ObjectId(schedulingId) },
          { projection: { CPFFUNCIONARIO: 1, DATANASCIMENTO: 1 } },
        );

      if (!doc?.CPFFUNCIONARIO) return null;

      const cpf = String(doc.CPFFUNCIONARIO).replace(/\D/g, '');
      if (cpf.length !== 11) return null;

      const dataNascimento = this.normalizarDataNascimento(doc.DATANASCIMENTO);
      if (!dataNascimento) return null;

      if (operador?.codigo) {
        this.logger.log(
          `[AUTH] Identidade resolvida: schedulingId=${schedulingId} operador=${operador.codigo}`,
        );
      }

      return { cpf, dataNascimento };
    } catch (error) {
      this.logger.error(
        `[AUTH] Erro ao resolver identidade: schedulingId=${schedulingId} error=${error.message}`,
      );
      return null;
    }
  }

  private normalizarDataNascimento(data?: string | null): string | null {
    const value = String(data || '').trim();
    if (!value) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  async findBiometricEnrollment(
    cpfHash: string,
    dataNascimentoHash: string,
    dedoCodigo: string,
  ): Promise<any> {
    return this.mongoService.getCadastroBiometricoAtivoByIdentity(
      cpfHash,
      dataNascimentoHash,
      dedoCodigo,
    );
  }

  async saveBiometricEnrollment(data: any): Promise<any> {
    return this.mongoService.salvarCadastroBiometrico(data);
  }

  async registrarBiometriaAudit(auditData: any): Promise<void> {
    await this.mongoService.registrarAuditoriaBiometria(auditData);
  }

  async registerAuthValidation(
    schedulingId: string,
    data: Partial<AtendimentoAuthInfo> & { schedulingId: string },
  ): Promise<void> {
    await this.mongoService.updateSchedulingAuthInfo(schedulingId, data);
  }

  async findAllBiometricEnrollments(
    cpfHash: string,
    dataNascimentoHash: string,
  ): Promise<any[]> {
    try {
      return await this.mongoService.db
        .collection('biometrias')
        .find({ cpfHash, dataNascimentoHash })
        .toArray();
    } catch (error) {
      this.logger.error(
        `[AUTH] Erro ao buscar enrollments: cpfHashPrefix=${cpfHash?.slice(0, 16)} error=${error.message}`,
      );
      return [];
    }
  }

  async appendAuthEvidence(
    schedulingId: string,
    data: {
      termoCienciaUrl: string;
      termoCienciaHash?: string | null;
      relatorioEvidenciasUrl?: string | null;
      relatorioEvidenciasHash?: string | null;
    },
  ): Promise<void> {
    await this.mongoService.updateSchedulingAuthInfo(schedulingId, {
      evidencias: data,
    });
  }

  async checkBiometricEnrollmentStatus(
    cpfHash: string,
    dataNascimentoHash: string,
  ): Promise<any> {
    return this.mongoService.getCadastroBiometricoStatusByIdentity(
      cpfHash,
      dataNascimentoHash,
    );
  }
}
