import { FuncionarioEntity } from 'src/mongo/model/FuncionarioEntity';
import {
  MedicalOpinionData,
  SchedulingDocument,
} from 'src/mongo/types/scheduling';
import { IUserInfo } from 'src/user/interfaces/user.interface';

export enum TemplateNames {
  PARECER_MEDICO = 'PARECER_MEDICO',
  ASO_RELEASE = 'ASO_RELEASE',
  ASO_NO_CONTACTS = 'ASO_NO_CONTACTS',
  COMPLEMENTAR_RELEASE = 'COMPLEMENTAR_RELEASE',
  RELATORIO_FATURAMENTO = 'RELATORIO_FATURAMENTO',
}

export type Attachment = {
  filename: string;
  content: any;
  contentType: string;
  encoding: 'base64';
};

export enum CODIGOS_TIPO_SOCGED {
  PRONTUARIO_MEDICO = '3',
}

export type UploadSocged = {
  arquivo: null | Buffer;
  codEmpresa: string;
  codFuncionario: string;
  sequencialFicha: string;
  nomeArquivo: string;
  nomeGed: string;
  codigoGed: string;
  tipoGed?: string;
  classificacao?: string;

  // campo auxiliar opcional usado internamente, nao enviado a API SOCGED.
  schedulingId?: string;
  url?: string;
};

export type UploadGoogleDrive = {
  schedulingId: string;
  documentType: 'ASO';
  url?: string;
  nomeArquivo?: string;
};

export type EmailType = {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  attachment: Attachment[];
  template?: string;
  templatename: string;
  data?: {
    faturamentoInfo?: {
      nomeEmpresa: string;
      cnpj?: string;
      empresaId: string;
      dataReferencia: string;
      tipoDocumento: string;
      arquivoUrl: string;
      nomeArquivo: string;
      observacoes?: string;
    };
    funcionario?: SchedulingDocument;
    medicalOpinion?: MedicalOpinionData;
    issuedBy?: {
      codigo?: string;
      nome?: string;
      cpf?: string;
      conselho?: string;
      ufconselho?: string;
    };
    asoInfo?: {
      nomeFuncionario: string;
      nomeEmpresa: string;
      tipoExame: string;
      data: string;
      chegada?: Date | string;
      cpf?: string;
      parecer?: string;
      asoFileName?: string;
      asoFileUrl?: string;
      anotacoes?: string;
      observacoesParecer?: string[];
      /** Indica que este e-mail é uma atualização com ASO assinado digitalmente */
      isAssinadoDigitalmente?: boolean;
      examesRealizados?: Array<{
        nomeExame?: string;
        status?: string;
        dataExame?: Date | string;
        sala?: string;
        profissional?: string;
        duracao?: string;
        url?: string;
      }>;
    };
    complementarInfo?: {
      nomeFuncionario: string;
      nomeEmpresa: string;
      tipoExame: string;
      data: string;
      chegada?: Date | string;
      cpf?: string;
      unidade?: string;
      examesRealizados?: Array<{
        nomeExame?: string;
        status?: string;
        dataExame?: Date | string;
        sala?: string;
        profissional?: string;
        duracao?: string;
        url?: string;
      }>;
    };
  };
};

export type resultadosExamesQueue = {
  schedulingId?: string;
  grupo: string;
  funcionario: SchedulingDocument;
  profissional?: IUserInfo;
  updateAt: Date;
  assinaturaDigitalObrigatoria?: boolean;
  credentials?: {
    pin?: string; // Usado para BRYKMS
  };
  requestId?: string;
  url?: string; // URL do PDF gerado pelo Worker
  identityError?: {
    code: string;
    reason: string;
  };
};

export type ResultadoExameSocMessage = {
  schedulingId: string;
  grupo: string;
  examIndex: number;
  requestedAt: string;
  requestId?: string;
  sequencialFicha?: string;
  sequencialResultadoExame?: string;
  codigoExame?: string;
  /** Indica que o exame foi marcado como NAO_REALIZADO — envia SOAP com dataResultadoExame vazia e motivo no resultado */
  naoRealizado?: boolean;
};

export type AsoProcessingMessage = {
  commandId?: string;
  schedulingId: string;
  sequencial: string;
  nomeFuncionario: string;
  nomeEmpresa: string;
  tipoExame: string;
  tipoExameNome: string;
  dataFicha: string;
  codEmpresa: string;
  codFuncionario: string;
  cpfFuncionario: string;
  parecer: string;
  alturaParecer?: string;
  confinadoParecer?: string;
  observacoesParecer?: string[];
  action?: string;
  createdAt: Date;
  medico: string;
  prontuario: string;
  socgedCode: string;
  profissional?: any;
  credentials?: {
    pin?: string;
  };
};

export type GedBatchQueueMessage = {
  jobId: string;
  empresaCodigo: string;
  empresaNome: string;
  periodo?: {
    ano?: string;
    mes?: string;
  };
  createdBy: string;
  prontuarios: { codigoProntuario: string; nome: string }[];
};

export type AsoEnriquecimentoMessage = {
  commandId?: string;
  schedulingId: string;
  url: string;
  nomeFuncionario: string;
  nomeEmpresa: string;
  tipoExame: string;
  medico?: string;
  codEmpresa?: string;
  observacoesParecer?: string[];
  createdAt?: Date;
  profissional?: IUserInfo;
  credentials?: {
    pin?: string;
  };
};

export type CustomerEmailCampaignOrchestrateMessage = {
  campaignId: string;
};
