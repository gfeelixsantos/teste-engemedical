import { Injectable, Logger } from '@nestjs/common';
import { resolveWorkerBaseUrl } from 'src/utils/worker-base-url.util';
import {
  buildPublicEvidenceUrl,
  buildValidationBlobPath,
  resolveRelatorioEvidenciasUrl,
} from 'src/utils/autenticacao-evidencias-url.util';
import { ObjectId } from 'mongodb';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { MongoService } from 'src/mongo/mongo.service';

type CadastroLgpdArgs = {
  biometriaId?: string;
  schedulingId?: string;
  requestId: string;
  funcionario: {
    id?: string;
    nome?: string;
    cpf?: string;
    prontuario?: string;
    dataNascimento?: string;
  };
  operador?: {
    id?: string;
    nome?: string;
    perfil?: string;
  };
  unidade?: string;
  dedo: string;
  templateStorage: string;
  templateVersion?: string;
  digitalDocumentalBlobPath?: string;
  cadastradoEm?: Date;
  origem?: 'BIOMETRIA' | 'FACIAL';
  facial?: {
    provider?: 'BRY_SIGN';
    sessionId?: string;
    transactionId?: string;
    relatorioEvidenciasUrl?: string;
    relatorioEvidenciasHash?: string;
  };
};

type WorkerTermoResponse =
  | {
      mode: 'uploaded';
      url: string;
      blobPath: string;
      documentHash: string;
      relatorioEvidenciasUrl?: string;
      relatorioEvidenciasHash?: string;
    }
  | {
      mode: 'inline';
      filename: string;
      contentType: string;
      bufferBase64: string;
      documentHash: string;
    };

export type TermoLgpdResult = {
  success: boolean;
  termoCienciaUrl?: string | null;
  termoCienciaHash?: string | null;
  relatorioEvidenciasUrl?: string | null;
  relatorioEvidenciasHash?: string | null;
  lgpdPersistido?: boolean;
  motivo?: string;
};

type SchedulingTermoContext = {
  _id?: string;
  NOME?: string;
  NOMEEMPRESA?: string;
  CODIGOPRONTUARIO?: string;
  UNIDADEATENDIMENTO?: string;
  CPFFUNCIONARIO?: string;
  MEDICO?: string;
  TICKET?: { atendente?: string };
};

const TERMO_VERSAO = 'v1.1';
const TERMO_VALIDADE_DIAS = 365 as const;
const BASE_LEGAL_CODE = 'PROTECAO_DA_SAUDE' as const;
const BASE_LEGAL_TEXTO =
  'Protecao da saude (art. 11, II, "c", LGPD) e obrigacao legal/regulatoria (art. 11, II, "a", LGPD) - atendimento ocupacional.';

@Injectable()
export class BiometriaLgpdTermoService {
  private readonly logger = new Logger(BiometriaLgpdTermoService.name);

  constructor(
    private readonly mongoService: MongoService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async registrarTermoPosCadastro(
    args: CadastroLgpdArgs,
  ): Promise<TermoLgpdResult> {
    if (args.templateStorage !== 'ENCRYPTED_AES_256_GCM') {
      this.logger.warn(
        `[BIOMETRIA_LGPD] templateStorage incompatível (${args.templateStorage || 'N/A'}). requestId=${args.requestId}`,
      );
      return {
        success: false,
        motivo: 'TEMPLATE_STORAGE_INCOMPATIVEL',
      };
    }

    const origem = args.origem || 'BIOMETRIA';

    if (origem !== 'FACIAL' && !args.biometriaId) {
      this.logger.error(
        `[BIOMETRIA_LGPD] biometriaId ausente — lgpd/termo não serão persistidos. requestId=${args.requestId}`,
      );
      return {
        success: false,
        motivo: 'BIOMETRIA_ID_AUSENTE',
      };
    }

    let schedulingContext: SchedulingTermoContext | null = null;
    let enrollmentOperadorNome: string | undefined;

    if (args.biometriaId) {
      try {
        const enrollment = await this.mongoService.db
          .collection('biometrias')
          .findOne(
            {
              _id: ObjectId.isValid(args.biometriaId)
                ? new ObjectId(args.biometriaId)
                : (args.biometriaId as any),
            },
            { projection: { metadata: 1 } },
          );
        enrollmentOperadorNome = String(
          (enrollment as any)?.metadata?.operadorNome || '',
        ).trim() || undefined;
      } catch (lookupErr) {
        this.logger.warn(
          `[BIOMETRIA_LGPD] Falha ao buscar metadata do enrollment: ${lookupErr instanceof Error ? lookupErr.message : String(lookupErr)}`,
        );
      }
    }

    if (args.funcionario.prontuario) {
      schedulingContext =
        (await this.mongoService.getLatestSchedulingContextByProntuario(
          args.funcionario.prontuario,
        )) as SchedulingTermoContext | null;
    }

    if (!schedulingContext && args.schedulingId) {
      try {
        const schedulingDoc = await this.mongoService.schedulingsCollection.findOne(
          { _id: new ObjectId(args.schedulingId) } as any,
          {
            projection: {
              NOME: 1,
              NOMEEMPRESA: 1,
              UNIDADEATENDIMENTO: 1,
              CODIGOPRONTUARIO: 1,
              CPFFUNCIONARIO: 1,
              MEDICO: 1,
              TICKET: 1,
            },
          } as any,
        );
        if (schedulingDoc) {
          schedulingContext = schedulingDoc as SchedulingTermoContext;
        }
      } catch (lookupErr) {
        this.logger.warn(
          `[BIOMETRIA_LGPD] Falha ao buscar scheduling por _id: ${lookupErr instanceof Error ? lookupErr.message : String(lookupErr)}`,
        );
      }
    }

    const funcionarioNome =
      String(args.funcionario.nome || schedulingContext?.NOME || '').trim() ||
      'FUNCIONARIO NAO IDENTIFICADO';
    const funcionarioProntuario =
      args.funcionario.prontuario ||
      schedulingContext?.CODIGOPRONTUARIO ||
      undefined;
    const funcionarioCpf =
      args.funcionario.cpf || schedulingContext?.CPFFUNCIONARIO || undefined;
    const operadorCodigo = args.operador?.id;
    const operadorNome =
      String(
        args.operador?.nome ||
          enrollmentOperadorNome ||
          schedulingContext?.TICKET?.atendente ||
          schedulingContext?.MEDICO ||
          '',
      ).trim() ||
      operadorCodigo ||
      'SISTEMA';

    const cadastradoEm = args.cadastradoEm || new Date();
    const validadeAte = this.calcularValidadeAte(cadastradoEm);
    const baseLgpd = {
      baseLegal: BASE_LEGAL_CODE,
      finalidade: 'VALIDACAO_IDENTIDADE_ATENDIMENTO_OCUPACIONAL',
      cienciaRegistradaEm: cadastradoEm.toISOString(),
      cienciaRegistradaPor: operadorCodigo || operadorNome || 'SISTEMA',
      versaoTermo: TERMO_VERSAO,
      origem: origem === 'FACIAL' ? 'WEBSOCKET_FACIAL_CADASTRO' : 'WEBSOCKET_BIOMETRIA_CADASTRO',
      alternativaDisponivel: true,
      validadeAte,
      documentoTermoUrl: null as string | null,
      documentoTermoHash: null as string | null,
    };

    let lgpdPersistido = false;
    if (args.biometriaId) {
      try {
        await this.mongoService.atualizarBiometriaLgpd(args.biometriaId, baseLgpd);
        lgpdPersistido = true;
      } catch (error) {
        this.logger.error(
          `[BIOMETRIA_LGPD] Falha ao persistir lgpd base biometriaId=${args.biometriaId} requestId=${args.requestId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return {
          success: false,
          motivo: 'FALHA_PERSISTENCIA_LGPD_BASE',
        };
      }
    }

    const schedulingTargetId =
      args.schedulingId || this.getFirstString(schedulingContext?._id);

    this.auditLogService.logUserAction({
      user: {
        codigo: operadorCodigo,
        nome: operadorNome,
        perfil: args.operador?.perfil,
      },
      acao: 'BIOMETRIA_CIENCIA_REGISTRADA',
      recursoId: args.biometriaId || args.schedulingId,
      recursoTipo: origem === 'FACIAL' ? 'facial' : 'biometria',
      pacienteCodigo: funcionarioProntuario || args.funcionario.id,
      pacienteNome: funcionarioNome,
      unidade:
        args.unidade || schedulingContext?.UNIDADEATENDIMENTO || undefined,
      requestId: args.requestId,
      detalhes: {
        resultado: 'SUCESSO',
        versaoTermo: TERMO_VERSAO,
        validadeAte,
        baseLegalCode: BASE_LEGAL_CODE,
        alternativaDisponivel: true,
        biometriaStatus: 'ATIVO',
      },
    });

    const workerBaseUrl = this.resolveWorkerBaseUrl();
    const workerToken = String(process.env.INTERNAL_WORKER_TOKEN || '').trim();

    if (!workerBaseUrl || !workerToken) {
      this.logger.error(
        `[BIOMETRIA_LGPD] WORKER_INTERNAL_BASE_URL/INTERNAL_WORKER_TOKEN ausentes — PDF do termo não gerado. requestId=${args.requestId} lgpdPersistido=${lgpdPersistido}`,
      );
      return {
        success: false,
        lgpdPersistido,
        motivo: 'WORKER_CONFIG_AUSENTE',
      };
    }

    const body = {
      requestId: args.requestId,
      versaoTermo: TERMO_VERSAO,
      validadeDias: TERMO_VALIDADE_DIAS,
      validadeAte,
      funcionario: {
        nome: funcionarioNome,
        cpfMascarado: this.mascararCpf(funcionarioCpf),
        codigo: args.funcionario.id,
      },
      empresa: {
        nome:
          String(schedulingContext?.NOMEEMPRESA || '').trim() ||
          'EMPRESA NAO IDENTIFICADA',
      },
      clinica: {
        nome:
          String(process.env.BIOMETRIA_TERMO_CLINICA_NOME || '').trim() ||
          'CENTRO MEDICO DE SAUDE OCUPACIONAL S/S LTDA',
        cnpj:
          String(process.env.BIOMETRIA_TERMO_CLINICA_CNPJ || '').trim() ||
          '06.900.766/0001-09',
        enderecoCompleto:
          String(process.env.BIOMETRIA_TERMO_CLINICA_ENDERECO || '').trim() ||
          'Rua 2, 635 - Saude - Rio Claro/SP - CEP 13500-312',
        contatoDpo:
          String(process.env.BIOMETRIA_TERMO_CONTATO_DPO || '').trim() ||
          'tecnologia@cmsocupacional.com.br',
        cnae:
          String(process.env.BIOMETRIA_TERMO_CLINICA_CNAE || '').trim() ||
          undefined,
        site:
          String(process.env.BIOMETRIA_TERMO_CLINICA_SITE || '').trim() ||
          undefined,
        telefone:
          String(process.env.BIOMETRIA_TERMO_CLINICA_TELEFONE || '').trim() ||
          '19 3525-6269',
      },
      atendimento: {
        schedulingId: this.getFirstString(schedulingContext?._id),
        prontuarioId: funcionarioProntuario,
        unidade:
          args.unidade ||
          schedulingContext?.UNIDADEATENDIMENTO ||
          'UNIDADE NAO IDENTIFICADA',
        dataHora: cadastradoEm.toISOString(),
      },
      ...(origem === 'FACIAL'
        ? {
            facial: {
              provider: args.facial?.provider || 'BRY_SIGN',
              sessionId: args.facial?.sessionId,
              transactionId: args.facial?.transactionId,
              relatorioEvidenciasUrl:
                args.facial?.relatorioEvidenciasUrl ||
                args.digitalDocumentalBlobPath ||
                '',
              relatorioEvidenciasHash: args.facial?.relatorioEvidenciasHash || undefined,
            },
          }
        : {
            biometria: {
              dedo: args.dedo,
              digitalDocumentalBlobPath: args.digitalDocumentalBlobPath,
              digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
              digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
              templateVersion: args.templateVersion || 'futronic-ansi-v1',
              templateStorage: args.templateStorage || 'ENCRYPTED_AES_256_GCM',
            },
          }),
      lgpd: {
        baseLegalCode: BASE_LEGAL_CODE,
        baseLegalTexto: BASE_LEGAL_TEXTO,
        finalidade: baseLgpd.finalidade,
        cienciaRegistradaEm: baseLgpd.cienciaRegistradaEm,
        cienciaRegistradaPor: baseLgpd.cienciaRegistradaPor,
        alternativaDisponivel: baseLgpd.alternativaDisponivel,
        dpoIdentificacao:
          String(process.env.BIOMETRIA_TERMO_DPO_IDENTIFICACAO || '').trim() ||
          undefined,
        armazenamentoRegiao:
          String(process.env.BIOMETRIA_TERMO_ARMAZENAMENTO_REGIAO || '').trim() ||
          undefined,
        armazenamentoNuvem:
          String(process.env.BIOMETRIA_TERMO_ARMAZENAMENTO_NUVEM || '').trim() ||
          undefined,
        retencaoDocumentalAnos: Number(
          process.env.BIOMETRIA_TERMO_RETENCAO_DOCUMENTAL_ANOS,
        ) || undefined,
        retencaoLogsAnos: Number(
          process.env.BIOMETRIA_TERMO_RETENCAO_LOGS_ANOS,
        ) || undefined,
      },
      operador: {
        codigo: operadorCodigo,
        nome: operadorNome,
      },
    };

    try {
      const workerPath =
        origem === 'FACIAL'
          ? '/pdfmake/facial/termo'
          : '/pdfmake/biometria/termo';
      const response = await fetch(`${workerBaseUrl}${workerPath}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': workerToken,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP_${response.status}: ${errorText}`);
      }

      const result = (await response.json()) as WorkerTermoResponse;

      const termoCienciaUrl =
        result.mode === 'uploaded' ? result.url : null;
      const termoCienciaHash = result.documentHash || null;
      const relatorioEvidenciasUrl = resolveRelatorioEvidenciasUrl(
        funcionarioProntuario,
        result.mode === 'uploaded' ? result.relatorioEvidenciasUrl : null,
      );
      const relatorioEvidenciasHash =
        (result.mode === 'uploaded' ? result.relatorioEvidenciasHash : null) ||
        args.facial?.relatorioEvidenciasHash ||
        null;

      if (args.biometriaId) {
        await this.mongoService.atualizarBiometriaLgpd(args.biometriaId, {
          ...baseLgpd,
          documentoTermoUrl: termoCienciaUrl,
          documentoTermoHash: termoCienciaHash,
          relatorioEvidenciasUrl,
          relatorioEvidenciasHash,
        });
        lgpdPersistido = true;
      }

      if (schedulingTargetId) {
        await this.mongoService.updateSchedulingAuthInfo(schedulingTargetId, {
          metodo: origem === 'FACIAL' ? 'FACIAL' : 'BIOMETRIA',
          status: 'VALIDADO',
          requestId: args.requestId,
          validadoEm: cadastradoEm.toISOString(),
          validadoPor: operadorNome,
          evidencias: {
            termoCienciaUrl,
            termoCienciaHash,
            relatorioEvidenciasUrl,
            relatorioEvidenciasHash,
          },
          ...(origem === 'FACIAL'
            ? {
                facial: {
                  provider: args.facial?.provider || 'BRY_SIGN',
                  sessionId: args.facial?.sessionId || null,
                  transactionId: args.facial?.transactionId || null,
                  imagemRepresentativaUrl: null,
                  imagemRepresentativaHash: null,
                  confidence: null,
                },
              }
            : {
                biometria: {
                  cadastroId:
                    args.funcionario.prontuario ||
                    args.funcionario.id ||
                    args.biometriaId ||
                    null,
                  dedo: args.dedo || null,
                  templateVersion: args.templateVersion || null,
                },
              }),
        });
      }

      this.auditLogService.logUserAction({
        user: {
          codigo: operadorCodigo,
          nome: operadorNome,
          perfil: args.operador?.perfil,
        },
        acao: 'BIOMETRIA_TERMO_GERADO',
        recursoId: args.biometriaId || args.schedulingId,
        recursoTipo: origem === 'FACIAL' ? 'facial' : 'biometria',
        pacienteCodigo: funcionarioProntuario || args.funcionario.id,
        pacienteNome: funcionarioNome,
        unidade:
          args.unidade || schedulingContext?.UNIDADEATENDIMENTO || undefined,
        requestId: args.requestId,
        detalhes: {
          resultado: 'SUCESSO',
          versaoTermo: TERMO_VERSAO,
          validadeAte,
          baseLegalCode: BASE_LEGAL_CODE,
          alternativaDisponivel: true,
          documentoTermoHash: termoCienciaHash,
          relatorioEvidenciasHash: relatorioEvidenciasHash || null,
        },
      });

      return {
        success: !!termoCienciaUrl,
        termoCienciaUrl,
        termoCienciaHash,
        relatorioEvidenciasUrl,
        relatorioEvidenciasHash,
        lgpdPersistido,
      };
    } catch (error) {
      this.logger.error(
        `[BIOMETRIA_LGPD] Falha ao gerar termo requestId=${args.requestId} lgpdPersistido=${lgpdPersistido}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        success: false,
        lgpdPersistido,
        motivo: 'FALHA_GERACAO_TERMO',
      };
    }
  }

  private resolveWorkerBaseUrl(): string | null {
    return resolveWorkerBaseUrl();
  }

  private calcularValidadeAte(date: Date): string {
    return new Date(
      date.getTime() + TERMO_VALIDADE_DIAS * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  private mascararCpf(cpf?: string): string | undefined {
    const digits = String(cpf || '').replace(/\D/g, '');
    if (digits.length !== 11) {
      return undefined;
    }

    return `***.${digits.slice(3, 6)}.***-${digits.slice(9, 11)}`;
  }

  private getFirstString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return undefined;
  }
}
