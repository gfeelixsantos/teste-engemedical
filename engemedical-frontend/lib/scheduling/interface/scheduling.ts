import { MongoOperationTypes } from "../enum/scheduling.enum";

import { Ticket } from "@/lib/ticket/ticket";

export type FileUpload = {
  Name: string;
  Content: string | ArrayBuffer; // string para base64 (agenda C#) e arraybuffer (puro) para transição backend
  Type: string;
  Size: number;
  StoragePath?: string;
  UploadedAt: Date;
  Origin: string;
};

type CompanyRegister = {
  CODIGO: string | null;
  NOMEABREVIADO: string | null;
  RAZAOSOCIALINICIAL: string | null;
  RAZAOSOCIAL: string | null;
  CIDADE: string | null;
  CNPJ: string | null;
  ATIVO: string | null;
  CODIGOINTERNO: string;
};

export type Client = {
  Id?: string;
  _id?: string;
  Name: string;
  Companys: CompanyRegister[];
  Active: boolean;
  Profile: string;
  Phone: string;
  Contract?: boolean;
  Email: string;
  CPF?: string;
};

export type RiscosAso = {
  codigo: string;
  risco: string;
  grupo: string;
};

export type DocumentType = "EXAME" | "ASO";

export type SignatureStatus =
  | "DIGITALIZADA"
  | "PENDENTE"
  | "PROCESSANDO"
  | "ASSINADO"
  | "LIBERADO"
  | "ERRO_IDENTIDADE_PROFISSIONAL"
  | "FALHA";

export type SignatureProvider = "DIGITALIZADA" | "PSC" | "BRYKMS";

export type SignatureRetry = {
  pending: boolean;
  count: number;
  nextRetryAt?: Date | { $date: string } | string;
};

export type MongoDateLike = Date | { $date: string } | string;

export interface AsoProfessionalInfo {
  codigo?: string;
  nome?: string;
  cpf?: string;
  conselho?: string;
  ufconselho?: string;
}

export interface DocumentSignatureInfo {
  documentType: DocumentType;
  documentId?: string;
  documentName?: string;
  requiresSignature: boolean;
  status: SignatureStatus;
  provider?: SignatureProvider;
  signedAt?: MongoDateLike;
  signedUrl?: string;
  validacao?: string;
  retry?: SignatureRetry;
  error?: string;

  lastCommandId?: string;
  codigoProfissional?: string;
  emailSent?: boolean;
  observacoesParecer?: string[];
  credentials?: {
    pin?: string;
  };
}

/** @deprecated Use DocumentSignatureInfo */
export type SignatureInfo = DocumentSignatureInfo;

export interface AsoInfo {
  status?: SignatureStatus;
  updatedAt?: MongoDateLike;
  observacoesParecer?: string[];
  codigoProfissional?: string;
  professional?: AsoProfessionalInfo;
  signature?: DocumentSignatureInfo;
  credentials?: {
    pin?: string;
  } | null;
  lastCommandId?: string | null;
  url?: string;
  asoUrl?: string;
  validacao?: string;
  validacaoUrl?: string;
  emailSent?: boolean;
  error?: string | null;
  CONVOCADO: boolean;
  BIOMETRIA?: {
    status: "nao_cadastrado" | "cadastrado" | "validado_hoje" | "falha_validacao";
    dataValidacao?: string;
  };
}

export type AtendimentoEvidenceInfo = {
  termoCienciaUrl?: string | null;
  termoCienciaHash?: string | null;
  relatorioEvidenciasUrl?: string | null;
  relatorioEvidenciasHash?: string | null;
};

export type AtendimentoBiometriaInfo = {
  cadastroId?: string | null;
  dedo?: string | null;
  templateVersion?: string | null;
};

export type AtendimentoFacialInfo = {
  provider?: "BRY_SIGN" | null;
  sessionId?: string | null;
  transactionId?: string | null;
};

export type AtendimentoAuthInfo = {
  metodo: "SOC" | "BIOMETRIA" | "FACIAL";
  status?: "PENDENTE" | "VALIDADO" | "FALHA";
  requestId?: string | null;
  validadoEm?: MongoDateLike;
  validadoPor?: string | null;
  evidencias?: AtendimentoEvidenceInfo | null;
  biometria?: AtendimentoBiometriaInfo | null;
  facial?: AtendimentoFacialInfo | null;
};

export class ExamRegister {
  codigoExame: string;
  nomeExame: string;
  status?: string;
  preparacao?: string = "";
  dataExame?: string = "";
  sequencialResultadoExame?: string = "";
  sala?: string = "";
  profissional?: string = "";
  codigoProfissional?: string = "";
  url?: string = "";
  formulario?: any;
  grupo?: string = "";
  signature?: DocumentSignatureInfo;
  realizado?: boolean;

  constructor(codigoExame: string, nomeExame: string, status?: string) {
    this.codigoExame = codigoExame;
    this.nomeExame = nomeExame;
    this.status = status;
  }
}

export type Scheduling = {
  ANEXOS: FileUpload[];
  ANOTACOES: string | null;
  ASOSTATUS: string;
  ATENDIMENTOSTATUS: string;
  CNPJEMPRESA: string;
  CLIENT?: Client;
  CODIGO: string;
  CODIGOCARGO: string;
  CODIGOEMPRESA: string;
  CODIGOINTERNOEMPRESA: string | null;
  CODIGOPRONTUARIO: string;
  CODIGOSETOR: string;
  CODIGOUNIDADE: string;
  CPFEMPRESA: string;
  CPFFUNCIONARIO: string;
  // CREATED: { $date: { $numberLong: number } };
  DATAAGENDAMENTO: string;
  DATAAGENDAMENTO_DATE: Date;
  DATANASCIMENTO: string | null;
  EXAMES: ExamRegister[];
  HORARIO: string;
  MATRICULAFUNCIONARIO: string;
  MEDICO: string;
  NOME: string;
  NOMECARGO: string;
  NOMEEMPRESA: string;
  NOMESETOR: string;
  NOMEUNIDADE: string;
  OBSERVACOES: string | null;
  PARECERMEDICO: string | null;
  ALTURA_PARECER: string | null;
  CONFINADO_PARECER: string | null;
  PRONTUARIOSVINCULADOS: string[];
  RECOMENDACAOMEDICA: string | null;
  RISCOSASO: RiscosAso[] | null;
  SCHEDULINGCODE: string;
  SEQUENCIAFICHA: string;
  SITUACAO: string;
  SUBGRUPOEMPRESA: string | null;
  TELEFONE?: string;
  // TERM: boolean;
  TICKET: Ticket;
  TIPOEXAME: string;
  TIPOEXAMENOME: string;
  UNIDADEATENDIMENTO: string;
  ASOINFO?: AsoInfo;
  AUTENTICACAOATENDIMENTO?: AtendimentoAuthInfo | null;
  _id: string;
};

export type SchedulingChange = {
  operation: MongoOperationTypes;
  schedule: Scheduling;
};
