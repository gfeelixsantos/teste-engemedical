import { MongoOperationTypes, ParecerMedico } from '../enum/scheduling.enum';
import { Ticket, TicketClass } from './ticket';
import { IUserInfo } from './user';

export type SchedulingChange = {
  operation: MongoOperationTypes;
  schedule: SchedulingDocument;
};

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
  CODIGO: string;
  NOMEABREVIADO: string;
  RAZAOSOCIALINICIAL: string;
  RAZAOSOCIAL: string;
  CIDADE: string;
  CNPJ: string;
  ATIVO: string;
  CODIGOINTERNO: string;
};

type Client = {
  Email: string;
  CPF: string;
  _id: string;
  Name: string;
  Companys: CompanyRegister[];
  Active: boolean;
  Phone: string;
  Profile: string;
};

export type SignatureStatus =
  // Padrão Final PT-BR
  | 'NAO_REQUER_ASSINATURA'
  | 'AGUARDANDO_AUTENTICACAO'
  | 'AGUARDANDO_REPROCESSAMENTO'
  | 'PROCESSANDO_ASSINATURA'
  | 'ASSINADO'
  | 'FALHA_ASSINATURA'
  /** Esgotou retentativas: ASO liberado sem assinatura digital (DIGITALIZADA) */
  | 'ASSINATURA_IGNORADA'
  // Transitório EN (Compatibilidade)
  | 'NOT_REQUIRED'
  | 'WAITING_AUTH'
  | 'PENDING_RETRY'
  | 'PROCESSING'
  | 'SIGNED'
  | 'FAILED';

export type SignatureInfo = {
  status: SignatureStatus;
  provider?: string;
  kmsType?: 'PSC' | 'BRYKMS';
  lastAttempt?: Date;
  nextRetryAt?: Date;
  retryCount: number;
  lastError?: string;
  lastErrorCategory?: string;
  signedAt?: Date;
  /** Indica que o ASO foi liberado como DIGITALIZADA após esgotar retentativas de assinatura */
  liberadoComoDigitalizada?: boolean;
  /** Data/hora em que foi liberado como DIGITALIZADA */
  liberadoComoDigitalizadaEm?: Date;
};

export type AsoInfoStatus = 'PENDENTE' | 'PROCESSANDO' | 'LIBERADO' | 'ERRO';
export type AsoInfoAssinatura = 'DIGITALIZADA' | 'PSC' | 'BRYKMS';

export type AsoInfo = {
  status: AsoInfoStatus;
  url?: string;
  validacao?: string;
  codigoProfissional?: string;
  professional?: {
    codigo?: string;
    nome?: string;
    cpf?: string;
    conselho?: string;
    ufconselho?: string;
  };
  updatedAt?: Date;
  observacoes?: string[];
  assinatura?: AsoInfoAssinatura;
  error?: string;
  retry?: {
    pending: boolean;
    count: number;
    nextRetryAt?: Date;
  };
};

export type ExamsScheduled = {
  codigoExame: string;
  nomeExame: string;
  preparacao?: string;
  status: string;
  dataExame?: string | Date | null;
  sequencialResultadoExame?: string;
  sala?: string;
  profissional?: string;
  codigoProfissional?: string;
  url?: string;
  signatureInfo?: SignatureInfo;
  grupo?: string;
  formulario?: any;
};

type LaudoPCDData = {
  cid: string;
  descricaoCid: string;
  limitacoes: string;
  adaptacoesNecessarias: string;
  observacoes: string;
};

type LaudoRestricaoData = {
  cid: string;
  descricaoCid: string;
  restricoes: string;
  periodoDias: number;
  dataInicio: string;
  dataFim: string;
  recomendacoes: string;
};

export type MedicalOpinionData = {
  opinionType: ParecerMedico | null;
  details?: string | null;
  laudoPCD?: LaudoPCDData | null;
  laudoRestricao?: LaudoRestricaoData | null;
};

export type FinishSchedulingDto = {
  scheduledId: string;
  user: IUserInfo;
  options: MedicalOpinionData;
};

export type RiscosAso = {
  codigo: string;
  risco: string;
  grupo: string;
};

export type MedicoCoordenadorSnapshot = {
  nome: string;
  crm: string;
  uf: string;
  cidade?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  origem: 'CADASTRO_INTERNO';
  atualizadoEm: string;
};

export type SchedulingDocument = {
  _id: string;
  ATENDIMENTOSTATUS: string;
  ASOSTATUS: string;
  ASOINFO?: AsoInfo | null;
  MEDICOCOORDENADOR?: MedicoCoordenadorSnapshot | null;
  SCHEDULINGCODE: string;
  CODIGOPRONTUARIO: string;
  RISCOSASO: RiscosAso[];
  CODIGOEMPRESA: string;
  SUBGRUPOEMPRESA: string;
  CODIGOINTERNOEMPRESA: string;
  CNPJEMPRESA: string;
  CPFEMPRESA: string;
  NOMEEMPRESA: string;
  CODIGO: string;
  NOME: string;
  CODIGOUNIDADE: string;
  NOMEUNIDADE: string;
  CODIGOSETOR: string;
  NOMESETOR: string;
  CODIGOCARGO: string;
  NOMECARGO: string;
  SEXO?: string;
  MATRICULAFUNCIONARIO: string;
  CPFFUNCIONARIO: string;
  SITUACAO: string;
  DATANASCIMENTO: string;
  DATAAGENDAMENTO: string;
  DATAAGENDAMENTO_DATE: Date;
  HORARIO: string;
  UNIDADEATENDIMENTO: string;
  SEQUENCIAFICHA: string;
  TIPOEXAME: string;
  TIPOEXAMENOME: string;
  OBSERVACOES: string | null;
  ANOTACOES: string | null;
  PARECERMEDICO: string | null;
  RECOMENDACAOMEDICA: string | null;
  MEDICO: string | null;
  ANEXOS: FileUpload[];
  TERM: boolean;
  CLIENT: Client | null;
  CREATED: string;
  EXAMES: ExamsScheduled[];
  TICKET: Ticket | TicketClass | null;
  TELEFONE?: string;
};
