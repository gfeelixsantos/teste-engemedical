import { Injectable, Logger } from '@nestjs/common';
import { resolveWorkerBaseUrl } from 'src/utils/worker-base-url.util';
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
};

type WorkerTermoResponse =
  | {
      mode: 'uploaded';
      url: string;
      blobPath: string;
      documentHash: string;
    }
  | {
      mode: 'inline';
      filename: string;
      contentType: string;
      bufferBase64: string;
      documentHash: string;
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

  async registrarTermoPosCadastro(args: CadastroLgpdArgs): Promise<void> {
    if (args.templateStorage !== 'ENCRYPTED_AES_256_GCM') {
      return;
    }

    if (!args.biometriaId) {
      this.logger.warn(
        `[BIOMETRIA_LGPD] biometriaId ausente. requestId=${args.requestId}`,
      );
      return;
    }

    let schedulingContext = args.funcionario.prontuario
      ? await this.mongoService.getLatestSchedulingContextByProntuario(
          args.funcionario.prontuario,
        )
      : null;

    if (!schedulingContext && args.schedulingId) {
      try {
        const schedulingDoc = await this.mongoService.schedulingsCollection.findOne(
          { _id: new ObjectId(args.schedulingId) } as any,
          {
            projection: {
              NOMEEMPRESA: 1,
              UNIDADEATENDIMENTO: 1,
              NOME: 1,
              CODIGOPRONTUARIO: 1,
            },
          } as any,
        );
        if (schedulingDoc) {
          schedulingContext = {
            NOMEEMPRESA: (schedulingDoc as any).NOMEEMPRESA,
            UNIDADEATENDIMENTO: (schedulingDoc as any).UNIDADEATENDIMENTO,
            _id: args.schedulingId,
          } as any;
        }
      } catch (lookupErr) {
        this.logger.warn(
          `[BIOMETRIA_LGPD] Falha ao buscar scheduling por _id: ${lookupErr instanceof Error ? lookupErr.message : String(lookupErr)}`,
        );
      }
    }

    const cadastradoEm = args.cadastradoEm || new Date();
    const validadeAte = this.calcularValidadeAte(cadastradoEm);
    const baseLgpd = {
      baseLegal: BASE_LEGAL_CODE,
      finalidade: 'VALIDACAO_IDENTIDADE_ATENDIMENTO_OCUPACIONAL',
      cienciaRegistradaEm: cadastradoEm.toISOString(),
      cienciaRegistradaPor:
        args.operador?.id || args.operador?.nome || 'SISTEMA',
      versaoTermo: TERMO_VERSAO,
      origem: 'WEBSOCKET_BIOMETRIA_CADASTRO',
      alternativaDisponivel: true,
      validadeAte,
      documentoTermoUrl: null as string | null,
      documentoTermoHash: null as string | null,
    };

    await this.mongoService.atualizarBiometriaLgpd(args.biometriaId, baseLgpd);

    this.auditLogService.logUserAction({
      user: {
        codigo: args.operador?.id,
        nome: args.operador?.nome,
        perfil: args.operador?.perfil,
      },
      acao: 'BIOMETRIA_CIENCIA_REGISTRADA',
      recursoId: args.biometriaId,
      recursoTipo: 'biometria',
      pacienteCodigo: args.funcionario.prontuario || args.funcionario.id,
      pacienteNome: args.funcionario.nome,
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
      this.logger.warn(
        `[BIOMETRIA_LGPD] WORKER_INTERNAL_BASE_URL/INTERNAL_WORKER_TOKEN ausentes. requestId=${args.requestId}`,
      );
      return;
    }

    const body = {
      requestId: args.requestId,
      versaoTermo: TERMO_VERSAO,
      validadeDias: TERMO_VALIDADE_DIAS,
      validadeAte,
      funcionario: {
        nome: args.funcionario.nome || 'FUNCIONARIO NAO IDENTIFICADO',
        cpfMascarado: this.mascararCpf(args.funcionario.cpf),
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
        prontuarioId: args.funcionario.prontuario,
        unidade:
          args.unidade ||
          schedulingContext?.UNIDADEATENDIMENTO ||
          'UNIDADE NAO IDENTIFICADA',
        dataHora: cadastradoEm.toISOString(),
      },
      biometria: {
        dedo: args.dedo,
        digitalDocumentalBlobPath: args.digitalDocumentalBlobPath,
        digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
        digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
        templateVersion: args.templateVersion || 'futronic-ansi-v1',
        templateStorage: 'ENCRYPTED_AES_256_GCM',
      },
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
        codigo: args.operador?.id,
        nome: args.operador?.nome,
      },
    };

    try {
      const response = await fetch(`${workerBaseUrl}/pdfmake/biometria/termo`, {
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
      await this.mongoService.atualizarBiometriaLgpd(args.biometriaId, {
        ...baseLgpd,
        documentoTermoUrl: result.mode === 'uploaded' ? result.url : null,
        documentoTermoHash: result.documentHash || null,
      });

      if (args.schedulingId) {
        const schedulingFilter = { _id: new ObjectId(args.schedulingId) };
        await this.mongoService.schedulingsCollection.updateOne(schedulingFilter, {
          $set: {
            'AUTENTICACAOATENDIMENTO.evidencias.termoCienciaUrl':
              result.mode === 'uploaded' ? result.url : null,
            'AUTENTICACAOATENDIMENTO.evidencias.termoCienciaHash':
              result.documentHash || null,
          },
        });
      }

      this.auditLogService.logUserAction({
        user: {
          codigo: args.operador?.id,
          nome: args.operador?.nome,
          perfil: args.operador?.perfil,
        },
        acao: 'BIOMETRIA_TERMO_GERADO',
        recursoId: args.biometriaId,
        recursoTipo: 'biometria',
        pacienteCodigo: args.funcionario.prontuario || args.funcionario.id,
        pacienteNome: args.funcionario.nome,
        unidade:
          args.unidade || schedulingContext?.UNIDADEATENDIMENTO || undefined,
        requestId: args.requestId,
        detalhes: {
          resultado: 'SUCESSO',
          versaoTermo: TERMO_VERSAO,
          validadeAte,
          baseLegalCode: BASE_LEGAL_CODE,
          alternativaDisponivel: true,
          documentoTermoHash: result.documentHash || null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `[BIOMETRIA_LGPD] Falha ao gerar termo requestId=${args.requestId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
