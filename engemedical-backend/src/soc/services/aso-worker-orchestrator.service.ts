import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveWorkerBaseUrl } from 'src/utils/worker-base-url.util';
import { isSocOrigin } from 'src/core/atendimento-auth-rules';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { formatCPF } from 'src/utils/util';
import { SocCompanyService } from './soc-company.service';
import { UnitsService } from 'src/units/units.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import {
  buildPublicEvidenceUrl,
  resolveRelatorioEvidenciasUrl,
} from 'src/utils/autenticacao-evidencias-url.util';

function resolveAsoSignatureStatus(doc: SchedulingDocument): string | undefined {
  const signatureProvider = (doc as any).ASOINFO?.signature?.provider;
  const asoInfoStatus = (doc as any).ASOINFO?.status;
  const asoStatus = doc.ASOSTATUS;

  if (
    signatureProvider === 'DIGITALIZADA' ||
    asoInfoStatus === 'DIGITALIZADA' ||
    asoStatus === 'DIGITALIZADA'
  ) {
    return 'DIGITALIZADA';
  }

  return signatureProvider || undefined;
}

function pickFirstFilled(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      if (value.trim() !== '') return value;
      continue;
    }
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return '';
}

export type WorkerAsoInput = {
  origem: 'BIOMETRIA' | 'FACIAL';
  requestId: string;

  funcionario: {
    nome: string;
    codigo: string;
    cpfMascarado?: string;
    dataNascimento?: string;
    sexo?: string;
    cargo?: string;
    setor?: string;
  };

  empresa: {
    codigo: string;
    nome: string;
    cnpj?: string;
    endereco?: string;
    numeroEndereco?: string;
    complementoEndereco?: string;
    bairro?: string;
    cidade?: string;
    cep?: string;
    uf?: string;
  };

  unidade: {
    codigo?: string;
    nome?: string;
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string;
    cep?: string;
    uf?: string | null;
  };
  unidadeAtendimento?: string;

  atendimento: {
    schedulingId: string;
    prontuarioId?: string;
    dataAgendamento?: string;
    tipoExame?: string;
    tipoExameNome?: string;
    horario?: string;
    ticket?: {
      prefixo?: string;
      numero?: string;
    };
  };

  medicoCoordenador: {
    nome: string;
    crm: string;
    uf: string;
    cidade?: string | null;
    endereco?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
  };

  medicoExaminador?: {
    nome?: string;
    codigo?: string;
    conselho?: string;
    ufconselho?: string;
    cpf?: string;
    signatureStatus?: string;
  } | null;

  parecer?: {
    opinionType?: string | null;
    details?: string | null;
    alturaParecer?: string | null;
    confinadoParecer?: string | null;
    isProgrammed?: boolean | null;
    orientacoes?: string[] | null;
  } | null;

  riscos?: Array<{
    codigo?: string;
    risco?: string;
    grupo?: string;
  }>;

  exames?: Array<{
    codigoExame: string;
    nomeExame: string;
    grupo?: string;
    status?: string;
    dataExame?: string | null;
  }>;

  autenticacaoAtendimento: {
    metodo: 'BIOMETRIA' | 'FACIAL';
    status?: 'PENDENTE' | 'VALIDADO' | 'FALHA';
    requestId?: string | null;
    validadoEm?: string | null;
    validadoPor?: string | null;
    evidencias?: {
      termoCienciaUrl?: string | null;
      termoCienciaHash?: string | null;
      relatorioEvidenciasUrl?: string | null;
      relatorioEvidenciasHash?: string | null;
    } | null;
    biometria?: {
      cadastroId?: string | null;
      dedo?: string | null;
      templateVersion?: string | null;
      digitalDocumentalBlobPath?: string | null;
      imageBase64?: string | null;
    } | null;
    facial?: {
      provider?: 'BRY_SIGN' | null;
      sessionId?: string | null;
      transactionId?: string | null;
    } | null;
  };
};

@Injectable()
export class AsoWorkerOrchestratorService {
  private readonly logger = new Logger(AsoWorkerOrchestratorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly socCompanyService: SocCompanyService,
    @Inject(forwardRef(() => UnitsService))
    private readonly unitsService: UnitsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Constrói o payload canônico para o worker de ASO.
   */
  async buildWorkerPayload(
    doc: SchedulingDocument,
    options: any,
    issuer: any,
  ): Promise<WorkerAsoInput | null> {
    if (isSocOrigin(doc)) {
      return null;
    }

    const auth = doc.AUTENTICACAOATENDIMENTO;
    if (!auth || (auth.metodo !== 'BIOMETRIA' && auth.metodo !== 'FACIAL')) {
      return null;
    }

    const company = this.socCompanyService.getCompanyByCode(doc.CODIGOEMPRESA);
    const coord = doc.MEDICOCOORDENADOR;

    if (!coord) {
      this.logger.warn(
        `[ASO_WORKER][PAYLOAD] Medico Coordenador ausente para schedulingId=${doc._id}`,
      );
    }

    // Tenta obter os dados da unidade via Supabase, priorizando UNIDADEATENDIMENTO, depois CODIGOUNIDADE
    let enderecoUnidade = company?.ENDERECO;
    let numeroUnidade: string | null | undefined = company?.NUMEROENDERECO;
    let bairroUnidade: string | null | undefined = company?.BAIRRO;
    let cidadeUnidade = company?.CIDADE;
    let cepUnidade = company?.CEP;
    let ufUnidade = company?.UF;
    let nomeUnidade = doc.NOMEUNIDADE;
    let unidadeAtendimentoEncontrada = false;

    if (doc.UNIDADEATENDIMENTO) {
      try {
        const unit = await this.unitsService.findByNome(doc.UNIDADEATENDIMENTO);
        if (unit) {
          enderecoUnidade = unit.endereco || enderecoUnidade;
          numeroUnidade = null;
          bairroUnidade = null;
          cidadeUnidade = unit.cidade || cidadeUnidade;
          cepUnidade = unit.cep || cepUnidade;
          ufUnidade = unit.uf || ufUnidade;
          nomeUnidade = unit.nome_exibicao || unit.nome || doc.UNIDADEATENDIMENTO;
          unidadeAtendimentoEncontrada = true;
        }
      } catch (err) {
        this.logger.warn(
          `[ASO_WORKER][PAYLOAD] Erro ao buscar unidade de atendimento ${doc.UNIDADEATENDIMENTO} no Supabase, tentando CODIGOUNIDADE: ${err.message}`,
        );
      }
    }

    // Se não encontrou via UNIDADEATENDIMENTO, tenta via CODIGOUNIDADE
    if (!unidadeAtendimentoEncontrada) {
      if (doc.CODIGOUNIDADE) {
        try {
          const unit = await this.unitsService.findById(doc.CODIGOUNIDADE);
          if (unit) {
            enderecoUnidade = unit.endereco || enderecoUnidade;
            numeroUnidade = null;
            bairroUnidade = null;
            cidadeUnidade = unit.cidade || cidadeUnidade;
            cepUnidade = unit.cep || cepUnidade;
            ufUnidade = unit.uf || ufUnidade;
            nomeUnidade = unit.nome_exibicao || unit.nome || doc.NOMEUNIDADE;
          }
        } catch (err) {
          this.logger.warn(
            `[ASO_WORKER][PAYLOAD] Erro ao buscar unidade ${doc.CODIGOUNIDADE} no Supabase, usando fallback da empresa: ${err.message}`,
          );
        }
      }
    }

    // Tenta obter os dados completos do médico examinador
    const exameClinico = doc.EXAMES?.find(
      (e) => e.nomeExame?.toUpperCase().includes('CLIN') || e.grupo?.toUpperCase().includes('CLIN') || e.codigoExame === 'clinico'
    );

    const clinicalProfessionalData = exameClinico?.formulario;
    const asoProfessional = doc.ASOINFO?.professional;

    const resolvedProfessionalName =
      pickFirstFilled(
        issuer?.nome,
        issuer?.name,
        asoProfessional?.nome,
        (asoProfessional as any)?.name,
        clinicalProfessionalData?.nome,
        clinicalProfessionalData?.medico,
      ) ||
      exameClinico?.profissional ||
      doc?.MEDICO ||
      '';

    const resolvedCodigo =
      pickFirstFilled(
        issuer?.codigo,
        asoProfessional?.codigo,
        exameClinico?.codigoProfissional,
        clinicalProfessionalData?.codigoProfissional,
        clinicalProfessionalData?.codigoMedico,
        doc.ASOINFO?.codigoProfissional,
      ) || '';

    let dbUser: any = null;
    try {
      if (resolvedCodigo) {
        dbUser = await this.supabaseService.getProfessionalMetadata(resolvedCodigo);
      }

      if (!dbUser && resolvedProfessionalName) {
        dbUser = await this.supabaseService.getProfessionalMetadataByName(resolvedProfessionalName);
      }
    } catch (err) {
      this.logger.warn(
        `[ASO_WORKER][PAYLOAD] Erro ao buscar metadados do médico examinador: ${err.message}`,
      );
    }

    const resolvedCpf =
      pickFirstFilled(
        issuer?.cpf,
        asoProfessional?.cpf,
        (asoProfessional as any)?.documento,
        clinicalProfessionalData?.cpf,
        clinicalProfessionalData?.documento,
        dbUser?.cpf,
        dbUser?.documento,
      ) || '';

    const resolvedCrm =
      pickFirstFilled(
        issuer?.conselho,
        issuer?.crm,
        asoProfessional?.conselho,
        asoProfessional?.crm,
        clinicalProfessionalData?.conselho,
        clinicalProfessionalData?.crm,
        dbUser?.conselho,
        dbUser?.crm,
      ) || '';

    const resolvedUfconselho =
      pickFirstFilled(
        issuer?.ufconselho,
        issuer?.crm_uf,
        issuer?.uf,
        asoProfessional?.ufconselho,
        asoProfessional?.crm_uf,
        asoProfessional?.uf,
        clinicalProfessionalData?.ufconselho,
        clinicalProfessionalData?.crm_uf,
        clinicalProfessionalData?.uf,
        dbUser?.ufconselho,
        dbUser?.crm_uf,
        dbUser?.uf,
      ) || '';

    return {
      origem: auth.metodo as 'BIOMETRIA' | 'FACIAL',
      requestId: auth.requestId || `aso-worker:${doc._id}:${Date.now()}`,

      funcionario: {
        nome: doc.NOME,
        codigo: doc.CODIGO,
        cpfMascarado: doc.CPFFUNCIONARIO ? formatCPF(doc.CPFFUNCIONARIO) : 'N/D',
        dataNascimento: doc.DATANASCIMENTO,
        cargo: doc.NOMECARGO,
        setor: doc.NOMESETOR,
      },

      empresa: {
        codigo: doc.CODIGOEMPRESA,
        nome: doc.NOMEEMPRESA,
        cnpj: doc.CNPJEMPRESA,
        endereco: company?.ENDERECO,
        numeroEndereco: company?.NUMEROENDERECO,
        complementoEndereco: company?.COMPLEMENTOENDERECO,
        bairro: company?.BAIRRO,
        cidade: company?.CIDADE,
        cep: company?.CEP,
        uf: company?.UF,
      },

      unidade: {
        codigo: doc.CODIGOUNIDADE,
        nome: nomeUnidade,
        endereco: enderecoUnidade,
        numero: numeroUnidade,
        bairro: bairroUnidade,
        cidade: cidadeUnidade,
        cep: cepUnidade,
        uf: ufUnidade,
      },

      atendimento: {
        schedulingId: doc._id,
        prontuarioId: doc.CODIGOPRONTUARIO,
        dataAgendamento: doc.DATAAGENDAMENTO,
        tipoExame: doc.TIPOEXAME,
        tipoExameNome: doc.TIPOEXAMENOME,
        horario: doc.HORARIO || undefined,
        ticket: doc.TICKET ? {
          prefixo: (doc.TICKET as any).prefixo || undefined,
          numero: (doc.TICKET as any).numero ? String((doc.TICKET as any).numero) : undefined,
        } : undefined,
      },

      medicoCoordenador: {
        nome: coord?.nome || 'Médico coordenador do PCMSO não informado',
        crm: coord?.crm || '',
        uf: coord?.uf || '',
        cidade: coord?.cidade || '',
        endereco: coord?.endereco || '',
        numero: coord?.numero || '',
        complemento: coord?.complemento || '',
        bairro: coord?.bairro || '',
      },

      medicoExaminador: {
        nome: resolvedProfessionalName,
        codigo: resolvedCodigo,
        conselho: resolvedCrm,
        ufconselho: resolvedUfconselho,
        cpf: resolvedCpf,
        signatureStatus: resolveAsoSignatureStatus(doc),
      },

      parecer: {
        opinionType: String(options.opinionType),
        details: options.details,
        alturaParecer: options.altura || null,
        confinadoParecer: options.confinado || null,
        isProgrammed: options.isProgrammed ?? null,
        orientacoes:
          options.isProgrammed === true && options.details
            ? [options.details]
            : options.orientacoes ?? null,
      },

      riscos:
        doc.RISCOSASO?.map((r) => ({
          codigo: r.codigo,
          risco: r.risco,
          grupo: r.grupo,
        })) || [],

      exames:
        doc.EXAMES?.map((e) => ({
          codigoExame: e.codigoExame,
          nomeExame: e.nomeExame,
          grupo: e.grupo,
          status: e.status,
          dataExame: e.dataExame ? String(e.dataExame) : null,
          sala: (e as any).sala || undefined,
        })) || [],

      unidadeAtendimento: doc.UNIDADEATENDIMENTO,
      autenticacaoAtendimento: {
        metodo: auth.metodo as 'BIOMETRIA' | 'FACIAL',
        status: auth.status,
        requestId: auth.requestId,
        validadoEm: auth.validadoEm,
        validadoPor: auth.validadoPor,
        evidencias: {
          ...(auth.evidencias || {}),
          relatorioEvidenciasUrl:
            buildPublicEvidenceUrl(doc.CODIGOPRONTUARIO) ||
            auth.evidencias?.relatorioEvidenciasUrl ||
            null,
        },
        biometria: auth.biometria,
        facial: auth.facial,
      },
    };
  }

  /**
   * Chama o worker para gerar o ASO.
   */
  async callWorker(payload: WorkerAsoInput): Promise<any> {
    const workerUrl = resolveWorkerBaseUrl();
    const token = this.configService.get<string>('INTERNAL_WORKER_TOKEN');

    if (!token) {
      throw new Error('INTERNAL_WORKER_TOKEN não configurado');
    }

    const url = `${workerUrl.replace(/\/$/, '')}/pdfmake/aso/autenticacao-atendimento`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Worker retornou erro ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(
        `[ASO_WORKER][CALL] Falha ao chamar worker para ASO digital: ${error.message}`,
      );
      throw error;
    }
  }
}
