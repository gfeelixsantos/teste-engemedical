import {
  MongoOperationTypes,
  ParecerEspaçoConfinado,
  ParecerMedico,
  ParecerTrabalhoAltura,
} from '../enum/scheduling.enum';

export { ParecerMedico, ParecerEspaçoConfinado, ParecerTrabalhoAltura };

import { Ticket, TicketClass } from '../../ticket/interfaces/ticket';
import { IUserInfo } from '../../user/interfaces/user.interface';

export type SchedulingChange = {
  operation: MongoOperationTypes;
  schedule: SchedulingDocument;
};

export type ExamDeleteBody = {
  schedulingId: string;
  codigoExame: string;
  grupo: string;
  motivo: string;
  requestId?: string;
  reauthenticated?: boolean;
};

export type DeleteRequestBody = {
  schedulingId: string;
  motivo: string;
  requestId?: string;
  reauthenticated?: boolean;
};

export type RemoveAnexoBody = {
  schedulingId: string;
  fileName: string;
  motivo: string;
  requestId?: string;
  reauthenticated?: boolean;
};

export type UpdateAnexoDto = {
  schedulingId: string;
  origin?: 'recepcao' | 'relatorio' | 'agendamento';
};

export type ReissueRequest = {
  funcionarioId: string;
  codigoExame: string;
  user: IUserInfo;
  credentials?: {
    pin?: string;
  };
};

export type ExamUpdateDto = {
  funcionarioId: string;
  codigoExame: string[];
  formulario: any;
  sala: string;
  profissional?: IUserInfo;
  isEditing?: boolean;
  dataExame?: string | Date | null;
  credentials?: {
    pin?: string;
  };
};

export type ReportFilterOption = {
  code: string;
  name: string;
};

export type ReportFilterParameters = {
  profissionais: ReportFilterOption[];
  empresas: ReportFilterOption[];
  status: ReportFilterOption[];
  tiposExame: ReportFilterOption[];
  unidadesAtendimento: ReportFilterOption[];
  grupo: ReportFilterOption[];
  salas: ReportFilterOption[];
  atendentes: ReportFilterOption[];
};

// Interface simplificada para o retorno paginado
export type PaginatedReportData = {
  data: any[]; // Usamos 'any' aqui pois é uma projeção 'LITE'
  total: number;
  manha: number;
  tarde: number;
  indefinido: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type GedEmpresaNode = {
  codigoEmpresa: string;
  nomeEmpresa: string;
  totalProntuarios: number;
  totalArquivos: number;
};

export type GedDiaNode = {
  dia: string;
  totalProntuarios: number;
  totalArquivos: number;
};

export type GedPeriodoNode = {
  ano: string;
  mes: string;
  totalProntuarios: number;
  totalArquivos: number;
};

export type GedProntuarioNode = {
  codigoProntuario: string;
  nomeFuncionario: string;
  tipoExame?: string;
  dataAgendamento?: string;
  totalArquivos: number;
};

export type GedArquivoNode = {
  blobName: string;
  fileName: string;
  nomeFuncionario: string;
  tipoExame?: string;
  dataAgendamento?: string;
  origem: 'aso' | 'exame' | 'anexo';
};

// Interface para os filtros que serão enviados ao backend
export type FilterParams = {
  dataInicio?: string;
  dataFim?: string;
  empresa?: string;
  grupoExame?: string;
  tipoExame?: string;
  status?: string;
  search?: string;
  profissional?: string;
  atendente?: string;
  sala?: string;
  unidadeAtendimento?: string;
  page: number;
  limit: number;
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

export type Client = {
  Email: string;
  CPF: string;
  _id: string;
  Name: string;
  Companys: CompanyRegister[];
  Active: boolean;
  Phone: string;
  Profile: string;
};

/**
 * Interface para documentos pendentes de assinatura retornados pelo MongoService
 */
export interface PendingDocument {
  schedulingId: string;
  documentType: DocumentType;
  documentIndex?: number; // índice no array EXAMES
  documentId?: string;
  documentName?: string;
  provider?: string;
  url: string;
  signature: DocumentSignatureInfo;
  professionalCode: string; // Adicionado para processamento via fila
}

/**
 * Tipo de documento que pode ser assinado
 * - EXAME: Resultado de exame individual
 * - ASO: Atestado de Saúde Ocupacional
 */
export type DocumentType = 'EXAME' | 'ASO';

/**
 * Status unificado para todos os documentos
 *
 * Fluxo: DIGITALIZADA → PENDENTE → PROCESSANDO → ASSINADO/LIBERADO
 *        (erro) → FALHA (mantém DIGITALIZADA como fallback)
 */
export type SignatureStatus =
  | 'DIGITALIZADA' // PDF gerado com imagem digitalizada (garantido)
  | 'PENDENTE' // Aguardando processamento/assinatura PSC
  | 'PROCESSANDO' // Em andamento (baixando/assinando/upload)
  | 'AGUARDANDO_AUTENTICACAO' // Digitalizado, aguardando profissional configurar credenciais
  | 'ASSINADO' // Assinado com sucesso (para EXAMES)
  | 'LIBERADO' // Assinado e entregue (para ASO)
  | 'ERRO_IDENTIDADE_PROFISSIONAL' // PDF/assinatura bloqueados por identidade ausente
  | 'FALHA'; // Erro permanente (excedeu tentativas)

/**
 * Provedor de assinatura digital
 */
export type SignatureProvider = 'DIGITALIZADA' | 'PSC' | 'BRYKMS';

/**
 * Objeto de retry unificado
 */
export type SignatureRetry = {
  pending: boolean; // Se há retry pendente
  count: number; // Número de tentativas
  nextRetryAt?: Date; // Próxima tentativa
};

/**
 * Modelo UNIFICADO para assinatura de documentos
 * Usado tanto para EXAMES quanto para ASO
 */
export interface DocumentSignatureInfo {
  // ========== Identificação ==========
  documentType: DocumentType; // 'EXAME' | 'ASO'
  documentId?: string; // ID específico do documento
  documentName?: string; // Nome para display (opcional)
  requiresSignature: boolean; // Se requer assinatura digital

  // ========== Status ==========
  status: SignatureStatus;

  // ========== Assinatura ==========
  // ========== Assinatura ==========
  provider?: SignatureProvider; // Provedor usado
  signedAt?: Date; // Data da assinatura
  signedUrl?: string; // URL do documento assinado
  validacao?: string; // URL de validação (ASO)

  // ========== Retry ==========
  retry?: SignatureRetry;

  // ========== Erros ==========
  error?: string; // Erro atual

  // ========== Metadados ==========
  lastCommandId?: string; // ID do comando
  codigoProfissional?: string; // Profissional responsável
  emailSent?: boolean; // Se email foi enviado (ASO)

  // ========== Campos específicos ASO (opcionais) ==========
  observacoesParecer?: string[]; // Observações do parecer
  credentials?: {
    // Credenciais (PIN)
    pin?: string;
  };
}

export type AsoPanelGroup = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'NAO_APLICAVEL';

export type AsoPanelDisplayStatus =
  | 'NA_FILA_DE_GERACAO'
  | 'GERANDO_PDF'
  | 'DOCUMENTO_GERADO'
  | 'AGUARDANDO_ASSINATURA'
  | 'AGUARDANDO_AUTENTICACAO_MEDICO'
  | 'AGUARDANDO_VALIDACAO_ITI'
  | 'EM_REPROCESSAMENTO_AUTOMATICO'
  | 'ASO_LIBERADO'
  | 'DOCUMENTO_DIGITALIZADO'
  | 'NAO_APLICAVEL';

export interface AsoPanelStatusInfo {
  group: AsoPanelGroup;
  displayStatus: AsoPanelDisplayStatus;
  displayReason: string;
  nextExpectedAction: string;
  willAutoProgress: boolean;
  needsManualAction: boolean;
}

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
  // ✅ CAMPO UNIFICADO
  signature?: DocumentSignatureInfo;
  grupo?: string;
  formulario?: any;
  /** Motivo informado pelo usuário ao marcar o exame como NAO_REALIZADO */
  motivoNaoRealizado?: string;
};

type LaudoPCDData = {
  cid: string;
  descricaoCid: string;
  limitacoes: string;
  adaptacoesNecessarias: string;
  observacoes: string;
};

export type LaudoRestricaoData = {
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
  isProgrammed?: boolean | null;
  orientacaoId?: string | null;
  laudoPCD?: LaudoPCDData | null;
  laudoRestricao?: LaudoRestricaoData | null;
  altura?: ParecerTrabalhoAltura | null;
  confinado?: ParecerEspaçoConfinado | null;
  examesParaRepetir?: string[];
};

export type FinishSchedulingDto = {
  scheduledId: string;
  user?: IUserInfo;
  options: MedicalOpinionData;
  credentials?: {
    pin?: string;
  };
};

export type RiscosAso = {
  codigo: string;
  risco: string;
  grupo: string;
};

export type AsoInfo = {
  googleDrive?: {
    fileId?: string | null;
    fileName?: string | null;
    uploadedAt?: Date;
    pending?: boolean;
    pendingAt?: Date;
    source?: 'GOOGLE_DRIVE_QUEUE' | 'SOCGED_FALLBACK';
    lastError?: string | null;
    lastAttemptAt?: Date;
  };

  // ✅ STATUS E ASSINATURA UNIFICADOS
  status: SignatureStatus;
  signature?: DocumentSignatureInfo;

  // Campos de dados
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
  observacoesParecer?: string[];
  emailSent?: boolean;
  credentials?: {
    pin?: string;
  };

  processingQueuedAt?: Date;
  socgedUploadedAt?: Date;
  lastCommandId?: string;
  anexosLastCommandId?: string;

   // ✅ Controle de fluxo de liberação do ASO
   liberacaoTipo?: 'APTO' | 'ORIENTACAO_PROGRAMADA' | null;
   orientacoes?: string[] | null;

   // Idempotência do e-mail de PARECER médico para a equipe (enviado no callback ASO-SIGNED)
   parecerEquipeEmailSent?: boolean | null;
 };

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
  provider?: 'BRY_SIGN' | null;
  sessionId?: string | null;
  transactionId?: string | null;
  imagemRepresentativaUrl?: string | null;
  imagemRepresentativaHash?: string | null;
  confidence?: number | null;
};

export type AtendimentoAuthInfo = {
  metodo: 'SOC' | 'BIOMETRIA' | 'FACIAL';
  status?: 'PENDENTE' | 'VALIDADO' | 'FALHA';
  requestId?: string | null;
  validadoEm?: string | null;
  validadoPor?: string | null;
  evidencias?: AtendimentoEvidenceInfo | null;
  biometria?: AtendimentoBiometriaInfo | null;
  facial?: AtendimentoFacialInfo | null;
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
  AUTENTICACAOATENDIMENTO?: AtendimentoAuthInfo | null;
  MEDICOCOORDENADOR?: MedicoCoordenadorSnapshot | null;
  SCHEDULINGCODE: string;
  CODIGOPRONTUARIO: string;
  RISCOSASO: RiscosAso[] | null;
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
  MATRICULAFUNCIONARIO: string;
  CPFFUNCIONARIO: string;
  SITUACAO: string;
  DATANASCIMENTO: string;
  SEXO?: string;
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
  ALTURA_PARECER?: string | null;
  CONFINADO_PARECER?: string | null;
  MEDICO: string | null;
  ANEXOS: FileUpload[];
  TERM: boolean;
  CLIENT: Client | null;
  CREATED: string;
  EXAMES: ExamsScheduled[];
  TICKET: Ticket | TicketClass | null;
  TELEFONE?: string;
};

export type FinalizacaoAso = {
  status: number;
  created: string; // formato "dd/MM/yyyy, HH:mm:ss"
  updated: string; // formato "dd/MM/yyyy, HH:mm:ss"
  codEmpresa: string;
  codFuncionario: string;
  sequencial: string;
  codTipoExame: string;
  medico: string;
  parecer: string; // exemplo: "APTO"
  nomeEmpresa: string;
  nomeFuncionario: string;
  cpfFuncionario: string;
  observacoes: any[]; // vazio no exemplo, mas pode conter textos/objetos se houver
};
