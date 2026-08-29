import {
  SchedulingChange,
  SchedulingDocument,
} from 'src/mongo/types/scheduling';
import { PainelCall } from 'src/painel/painel.interface';
import { TicketActionType, TicketStatus } from 'src/ticket/enum/ticket.enum';
import {
  PreparationRequest,
  PreparationRequestModel,
  Ticket,
} from 'src/ticket/interfaces/ticket';

export interface TicketActionSuccessPayload {
  ticketId: number;
  action: TicketActionType;
  statusFinal: TicketStatus;
  timestamp: string;
}

// Modelos Biometria (Base)
export interface BiometriaOperadorModel {
  id: string;
  nome: string;
  perfil: string;
}

export interface BiometriaFuncionarioModel {
  id: string;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  prontuario?: string;
}

export interface BiometriaAtendimentoModel {
  id: string;
  ticketId?: string;
  tipoAtendimento?: string;
  exame?: string;
}

// Payloads de Biometria
export interface BiometriaCapturaRequestPayload {
  requestId?: string;
  unidade: string;
  sala: string;
  estacaoId: string;
  operador?: BiometriaOperadorModel;
  funcionario: BiometriaFuncionarioModel;
  atendimento: BiometriaAtendimentoModel;
  origem: 'RECEPCAO' | 'ATENDIMENTO' | 'PREPARO';
  solicitadoEm: string;
}

export interface BiometriaCapturaCommandPayload extends BiometriaCapturaRequestPayload {
  requestId: string;
}

export interface BiometriaCapturaSuccessPayload {
  requestId: string;
}

export interface BiometriaCapturaErrorPayload {
  requestId: string;
  erro: string;
}

// Modelos e Payloads para Cadastro Biométrico
export type BiometriaCadastroStatusType = 
  | 'cadastro_iniciado'
  | 'aguardando_primeira_captura'
  | 'primeira_captura_em_andamento'
  | 'primeira_captura_concluida'
  | 'aguardando_segunda_captura'
  | 'segunda_captura_em_andamento'
  | 'segunda_captura_concluida'
  | 'processando_imagens_derivadas'
  | 'concluido'
  | 'erro'
  | 'timeout';

export interface BiometriaDedoModel {
  id?: number;
  nome?: string;
  lado?: string;
  tipoCadastro?: string; // 'Principal' | 'Alternativo'
  codigo?: string;
  label?: string;
}

export interface BiometriaCadastroRequestPayload {
  requestId?: string;
  schedulingId?: string;
  atendimentoId?: string;
  unidade: string;
  sala: string;
  operador: BiometriaOperadorModel;
  funcionario: BiometriaFuncionarioModel;
  dedo: BiometriaDedoModel;
  origem: string; // 'ATENDIMENTO'
  solicitadoEm: string;
}

export interface BiometriaCadastroCommandPayload {
  requestId: string;
  clientId: string;
  unidade: string;
  sala: string;
  operador: BiometriaOperadorModel;
  funcionario: BiometriaFuncionarioModel;
  dedo: BiometriaDedoModel;
  modo: 'CADASTRO_BIOMETRICO';
  capturasNecessarias: number; // 2
}

export interface BiometriaCadastroStatusPayload {
  requestId: string;
  status: BiometriaCadastroStatusType;
  mensagem: string;
}

export interface BiometriaCadastroCancelPayload {
  requestId: string;
  unidade: string;
}

export interface BiometriaCapturaCancelPayload {
  requestId: string;
  unidade: string;
}

export interface BiometriaCapturaDerivadaModel {
  indice: number;
  imagemDerivadaBase64: string;
  imagemDerivadaHash: string;
  finalidade?: string;
  origem?: string;
}

export interface BiometriaCadastroResultPayload {
  requestId: string;
  status: BiometriaCadastroStatusType; // 'concluido' | 'erro'
  funcionario: BiometriaFuncionarioModel;
  dedo: BiometriaDedoModel;
  capturas?: BiometriaCapturaDerivadaModel[];
  observacao?: string;
  mensagem?: string;
  template?: string;
  templateRef?: string;
  templateHash?: string;
  templateVersion?: string;
  templateStorage?: string;
  templateSize?: number;
  metadata?: any;
}

export interface BiometriaCapturaStartedPayload {
  requestId: string;
  mensagem: string;
}

export interface BiometriaCapturaResultPayload {
  requestId: string;
  success: boolean;
  message: string;
  qualidade?: number;
}

export interface BiometriaCapturaStatusPayload {
  requestId: string;
  status: 'routing' | 'started' | 'stabilizing' | 'capturing' | 'success' | 'error';
  mensagem: string;
}

export interface BiometriaAgentUnavailablePayload {
  unidade: string;
  estacaoId: string;
  mensagem: string;
}

export interface BiometriaAgentStatusPayload {
  unidade: string;
  ipLocal: string;
  machineName: string;
  backendConectado?: boolean;
  leitorConectado: boolean;
  leitorAberto: boolean;
  estadoLeitor: string;
  estado: string;
  versao: string;
  ambiente: string;
  timestamp: string;
  aplicacaoAberta?: boolean;
  dllEncontrada?: boolean;
}

export interface BiometriaRequestStatusPayload {
  requestId: string;
  status:
    | 'agent_encontrado'
    | 'agent_indisponivel'
    | 'leitor_indisponivel'
    | 'comando_enviado'
    | 'captura_iniciada'
    | 'captura_concluida'
    | 'captura_falhou'
    | 'request_finalizada';
  unidade?: string;
  agentIpLocal?: string;
  agentSocketId?: string;
  leitorAberto?: boolean;
  estadoLeitor?: string;
  motivo?: string;
  mensagem?: string;
  timestamp: string;
}

export interface BiometriaRequestStatePayload {
  requestId: string;
  state:
    | 'agent_resolving'
    | 'agent_found'
    | 'agent_not_found'
    | 'reader_unavailable'
    | 'command_sent'
    | 'waiting_finger'
    | 'finger_detected'
    | 'capturing'
    | 'success'
    | 'error'
    | 'timeout'
    | 'cancelled'
    | 'ready';
  message: string;
  source: 'backend' | 'agent';
  unidade: string;
  agentKey?: string;
  agentSocketId?: string;
  leitorAberto?: boolean;
  estadoLeitor?: string;
  capturaEmAndamento?: boolean;
  errorCode?: string;
}

export interface BiometriaAgentSnapshotPayload {
  unidade: string;
  agentKey?: string;
  online: boolean;
  leitorAberto: boolean;
  estadoLeitor: string;
  machineName?: string;
  ipLocal?: string;
  version?: string;
  lastSeen?: string;
}

// Enum para padronizar os nomes dos eventos
export enum EventType {
  // Ticket
  CONNECTION_REQUEST = 'CONNECTION_REQUEST',
  TICKET_EMITED = 'TICKET_EMITED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  TICKET_ACTION_SUCCESS = 'TICKET_ACTION_SUCCESS',
  TICKET_ERROR = 'TICKET_ERROR',
  TICKET_INFO = 'TICKET_INFO',
  TICKET_DELETE = 'TICKET_DELETE',

  // Schedule
  UPDATE_SCHEDULE = 'UPDATE_SCHEDULE',
  UPDATE_RECORD = 'UPDATE_RECORD',

  // Preparo
  PREPARATION_REQUEST = 'PREPARATION_REQUEST',

  // Painel
  PAINEL_CALL = 'PAINEL_CALL',
  PAINEL_TICKETS = 'PAINEL_TICKETS_TO_CALL',

  // Biometria
  BIOMETRIA_CAPTURA_REQUEST = 'biometria:captura_request',
  BIOMETRIA_CAPTURA_COMMAND = 'biometria:captura_command',
  BIOMETRIA_CAPTURA_SUCCESS = 'biometria:captura_success',
  BIOMETRIA_CAPTURA_ERROR = 'biometria:captura_error',
  BIOMETRIA_CAPTURA_STARTED = 'biometria:captura_started',
  BIOMETRIA_CAPTURA_RESULT = 'biometria:captura_result',
  BIOMETRIA_CAPTURA_STATUS = 'biometria:captura_status',
  BIOMETRIA_REQUEST_STATUS = 'biometria:request_status',
  BIOMETRIA_AGENT_UNAVAILABLE = 'biometria:agent_unavailable',
  BIOMETRIA_AGENT_STATUS = 'biometria:agent_status',
  BIOMETRIA_STATUS_REQUEST = 'biometria:status_request',
  BIOMETRIA_REQUEST_STATE = 'biometria:request_state',
  BIOMETRIA_AGENT_SNAPSHOT = 'biometria:agent_snapshot',
  
  // Cadastro Biométrico
  BIOMETRIA_CADASTRO_REQUEST = 'biometria:cadastro_request',
  BIOMETRIA_CADASTRO_COMMAND = 'biometria:cadastro_command',
  BIOMETRIA_CADASTRO_STATUS = 'biometria:cadastro_status',
  BIOMETRIA_CADASTRO_RESULT = 'biometria:cadastro_result',
  BIOMETRIA_CADASTRO_CANCEL = 'biometria:cadastro_cancel',
  
  BIOMETRIA_CAPTURA_CANCEL = 'biometria:captura_cancel',

  // Validação Biométrica 1:1
  BIOMETRIA_VALIDACAO_REQUEST = 'biometria:validacao_request',
  BIOMETRIA_VALIDACAO_COMMAND = 'biometria:validacao_command',
  BIOMETRIA_VALIDACAO_STATUS = 'biometria:validacao_status',
  BIOMETRIA_VALIDACAO_RESULT = 'biometria:validacao_result',

  // Status Biométrico do Funcionário
  BIOMETRIA_STATUS_FUNCIONARIO_REQUEST = 'biometria:status_funcionario_request',
  BIOMETRIA_STATUS_FUNCIONARIO_RESULT = 'biometria:status_funcionario_result',

  // Facial
  FACIAL_CADASTRO_REQUEST = 'facial:cadastro_request',
  FACIAL_CADASTRO_COMMAND = 'facial:cadastro_command',
  FACIAL_CADASTRO_STATUS = 'facial:cadastro_status',
  FACIAL_CADASTRO_RESULT = 'facial:cadastro_result',
  FACIAL_CADASTRO_CANCEL = 'facial:cadastro_cancel',
  FACIAL_VALIDACAO_REQUEST = 'facial:validacao_request',
  FACIAL_VALIDACAO_COMMAND = 'facial:validacao_command',
  FACIAL_VALIDACAO_STATUS = 'facial:validacao_status',
  FACIAL_VALIDACAO_RESULT = 'facial:validacao_result',

  // Teleatendimento
  TELEATENDIMENTO_JOIN = 'teleatendimento:join',
  TELEATENDIMENTO_SESSION_SYNC = 'teleatendimento:session_sync',
  TELEATENDIMENTO_OFFER = 'teleatendimento:offer',
  TELEATENDIMENTO_ANSWER = 'teleatendimento:answer',
  TELEATENDIMENTO_ICE_CANDIDATE = 'teleatendimento:ice_candidate',
  TELEATENDIMENTO_CHAT_MESSAGE = 'teleatendimento:chat_message',
  TELEATENDIMENTO_CALL_STATUS = 'teleatendimento:call_status',
  TELEATENDIMENTO_END = 'teleatendimento:end',
  TELEATENDIMENTO_JOIN_VIRTUAL_WAITING_ROOM = 'teleatendimento:join_virtual_waiting_room',
  TELEATENDIMENTO_VIRTUAL_WAITING_ROOM_STATUS = 'teleatendimento:virtual_waiting_room_status',
  TELEATENDIMENTO_PULL_TO_CALL = 'teleatendimento:pull_to_call',
  TELEATENDIMENTO_SUBSCRIBE_QUEUE = 'teleatendimento:subscribe_queue',
  TELEATENDIMENTO_QUEUE_UPDATE = 'teleatendimento:queue_update',
  TELEATENDIMENTO_CALL_FROM_QUEUE = 'teleatendimento:call_from_queue',

  // GED Batch
  GED_BATCH_STATUS = 'ged-batch:status',
  GED_BATCH_PROGRESS = 'ged-batch:progress',

  // Presença / Conexões Ativas
  PRESENCE_UPDATED = 'presence:updated',
  PRESENCE_REQUEST = 'presence:request',
}

export interface UserPresencePayload {
  socketId: string;
  id?: string;
  nome: string;
  unidade: string;
  sala?: string;
  type: string;
  exame?: string;
  conectadoEm: string;
  isTeleatendimentoActive: boolean;
  inviteUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────
// GED Batch
// ─────────────────────────────────────────────────────────────────────

export interface GedBatchStatusPayload {
  jobId: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
  totalFuncionarios: number;
  processedFuncionarios: number;
  succeededFuncionarios: number;
  failedFuncionarios: number;
  result?: {
    zipBlobName?: string;
    zipUrl?: string;
  };
  updatedAt: string;
}

export interface GedBatchProgressPayload {
  jobId: string;
  itemCodigoProntuario: string;
  itemNome: string;
  itemStatus: 'completed' | 'failed';
  error?: string;
  processedFuncionarios: number;
  totalFuncionarios: number;
  updatedAt: string;
}

// Mapeamento de eventos para seus payloads
export interface EventPayloadMap {
  [EventType.CONNECTION_REQUEST]: SchedulingDocument[];
  [EventType.TICKET_EMITED]: Ticket;
  [EventType.TICKET_UPDATED]: Ticket;
  [EventType.TICKET_ACTION_SUCCESS]: TicketActionSuccessPayload;
  [EventType.TICKET_ERROR]: string;
  [EventType.TICKET_INFO]: string;
  [EventType.TICKET_DELETE]: number;
  [EventType.PAINEL_CALL]: PainelCall;
  [EventType.PAINEL_TICKETS]: PainelCall[];
  [EventType.UPDATE_SCHEDULE]: SchedulingChange;
  [EventType.UPDATE_RECORD]: SchedulingChange;
  [EventType.PREPARATION_REQUEST]: PreparationRequestModel;

  // Biometria
  [EventType.BIOMETRIA_CAPTURA_REQUEST]: BiometriaCapturaRequestPayload;
  [EventType.BIOMETRIA_CAPTURA_COMMAND]: BiometriaCapturaCommandPayload;
  [EventType.BIOMETRIA_CAPTURA_SUCCESS]: BiometriaCapturaSuccessPayload;
  [EventType.BIOMETRIA_CAPTURA_ERROR]: BiometriaCapturaErrorPayload;
  [EventType.BIOMETRIA_CAPTURA_STARTED]: BiometriaCapturaStartedPayload;
  [EventType.BIOMETRIA_CAPTURA_RESULT]: BiometriaCapturaResultPayload;
  [EventType.BIOMETRIA_CAPTURA_STATUS]: BiometriaCapturaStatusPayload;
  [EventType.BIOMETRIA_REQUEST_STATUS]: BiometriaRequestStatusPayload;
  [EventType.BIOMETRIA_AGENT_UNAVAILABLE]: BiometriaAgentUnavailablePayload;
  [EventType.BIOMETRIA_AGENT_STATUS]: BiometriaAgentStatusPayload;
  [EventType.BIOMETRIA_STATUS_REQUEST]: any;
  [EventType.BIOMETRIA_REQUEST_STATE]: BiometriaRequestStatePayload;
  [EventType.BIOMETRIA_AGENT_SNAPSHOT]: BiometriaAgentSnapshotPayload;
  [EventType.BIOMETRIA_CAPTURA_CANCEL]: BiometriaCapturaCancelPayload;

  [EventType.BIOMETRIA_CADASTRO_REQUEST]: BiometriaCadastroRequestPayload;
  [EventType.BIOMETRIA_CADASTRO_COMMAND]: BiometriaCadastroCommandPayload;
  [EventType.BIOMETRIA_CADASTRO_STATUS]: BiometriaCadastroStatusPayload;
  [EventType.BIOMETRIA_CADASTRO_RESULT]: BiometriaCadastroResultPayload;
  [EventType.BIOMETRIA_CADASTRO_CANCEL]: BiometriaCadastroCancelPayload;
  [EventType.BIOMETRIA_VALIDACAO_REQUEST]: BiometriaValidacaoRequestPayload;
  [EventType.BIOMETRIA_VALIDACAO_COMMAND]: BiometriaValidacaoCommandPayload;
  [EventType.BIOMETRIA_VALIDACAO_STATUS]: BiometriaValidacaoStatusPayload;
  [EventType.BIOMETRIA_VALIDACAO_RESULT]: BiometriaValidacaoResultPayload;
  [EventType.BIOMETRIA_STATUS_FUNCIONARIO_REQUEST]: BiometriaStatusFuncionarioRequestPayload;
  [EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT]: BiometriaStatusFuncionarioResultPayload;

  // Facial
  [EventType.FACIAL_CADASTRO_REQUEST]: FacialCadastroRequestPayload;
  [EventType.FACIAL_CADASTRO_COMMAND]: FacialCadastroCommandPayload;
  [EventType.FACIAL_CADASTRO_STATUS]: FacialCadastroStatusPayload;
  [EventType.FACIAL_CADASTRO_RESULT]: FacialCadastroResultPayload;
  [EventType.FACIAL_CADASTRO_CANCEL]: FacialCadastroCancelPayload;
  [EventType.FACIAL_VALIDACAO_REQUEST]: FacialValidacaoRequestPayload;
  [EventType.FACIAL_VALIDACAO_COMMAND]: FacialValidacaoCommandPayload;
  [EventType.FACIAL_VALIDACAO_STATUS]: FacialValidacaoStatusPayload;
  [EventType.FACIAL_VALIDACAO_RESULT]: FacialValidacaoResultPayload;

  // Teleatendimento
  [EventType.TELEATENDIMENTO_JOIN]: TeleatendimentoJoinPayload;
  [EventType.TELEATENDIMENTO_SESSION_SYNC]: TeleatendimentoSessionSyncPayload;
  [EventType.TELEATENDIMENTO_OFFER]: TeleatendimentoSignalPayload;
  [EventType.TELEATENDIMENTO_ANSWER]: TeleatendimentoSignalPayload;
  [EventType.TELEATENDIMENTO_ICE_CANDIDATE]: TeleatendimentoSignalPayload;
  [EventType.TELEATENDIMENTO_CHAT_MESSAGE]: TeleatendimentoChatPayload;
  [EventType.TELEATENDIMENTO_CALL_STATUS]: TeleatendimentoCallStatusPayload;
  [EventType.TELEATENDIMENTO_END]: { sessionId: string };
  [EventType.TELEATENDIMENTO_JOIN_VIRTUAL_WAITING_ROOM]: TeleatendimentoJoinVirtualWaitingRoomPayload;
  [EventType.TELEATENDIMENTO_VIRTUAL_WAITING_ROOM_STATUS]: TeleatendimentoVirtualWaitingRoomStatusPayload;
  [EventType.TELEATENDIMENTO_PULL_TO_CALL]: TeleatendimentoPullToCallPayload;
  [EventType.TELEATENDIMENTO_SUBSCRIBE_QUEUE]: { unidade: string; sala: string; exame?: string };
  [EventType.TELEATENDIMENTO_QUEUE_UPDATE]: { queue: any[] };
  [EventType.TELEATENDIMENTO_CALL_FROM_QUEUE]: { schedulingId: string; professionalName: string; unidade: string; sala: string; exame?: string };

  // GED Batch
  [EventType.GED_BATCH_STATUS]: GedBatchStatusPayload;
  [EventType.GED_BATCH_PROGRESS]: GedBatchProgressPayload;
}

// ─────────────────────────────────────────────────────────────────────
// Biometria Validação 1:1
// ─────────────────────────────────────────────────────────────────────

export interface BiometriaValidacaoRequestPayload {
  requestId: string;
  schedulingId?: string;
  unidade: string;
  ipLocal?: string;
  funcionario: {
    cpf?: string;
    dataNascimento?: string;
    nome?: string;
  };
  atendimento?: {
    id?: string;
  };
  dedo?: {
    codigo: string;
    label: string;
  };
  origem: string;
}

export interface BiometriaValidacaoCommandPayload {
  requestId: string;
  clientId: string;
  unidade: string;
  ipLocal: string;
  funcionario: {
    cpf: string;
    dataNascimento: string;
    nome: string;
  };
  atendimento?: {
    id?: string;
  };
  dedo?: {
    codigo: string;
    label: string;
  };
  templateBase64: string;
  templateHash: string;
  templateVersion: string;
  dedoCodigo: string;
}

export interface BiometriaValidacaoStatusPayload {
  requestId: string;
  status: string;
  mensagem: string;
}

export interface BiometriaValidacaoResultPayload {
  requestId: string;
  aprovado: boolean;
  score: number | null;
  threshold: number | null;
  engine: string;
  templateVersion: string;
  dedo: string;
  capturadoEm: string;
  mensagem?: string;
}

export interface BiometriaStatusFuncionarioRequestPayload {
  requestId: string;
  schedulingId?: string;
  atendimentoId?: string;
  operador?: BiometriaOperadorModel;
  funcionario: {
    cpf?: string;
    dataNascimento?: string;
    nome?: string;
  };
  unidade: string;
  ipLocal?: string;
}

export type BiometriaStatusType =
  | 'SEM_CADASTRO_ATIVO'
  | 'CADASTRO_ATIVO'
  | 'CADASTRO_PENDENTE_TEMPLATE_ENGINE'
  | 'ERRO_IDENTIDADE_INSUFICIENTE';

export interface BiometriaStatusFuncionarioResultPayload {
  requestId: string;
  status: BiometriaStatusType;
  funcionarioId?: string;
  dedosDisponiveis?: string[];
  dedoPadrao?: string;
  cadastros?: BiometriaCadastroResumo[];
  mensagem: string;
}

// ─────────────────────────────────────────────────────────────────────
// Facial
// ─────────────────────────────────────────────────────────────────────

export interface FacialCadastroRequestPayload {
  requestId?: string;
  schedulingId: string;
  unidade: string;
  sala: string;
  estacaoId: string;
  operador?: BiometriaOperadorModel;
  funcionario: BiometriaFuncionarioModel;
  atendimento?: BiometriaAtendimentoModel;
  origem: string;
  solicitadoEm: string;
}

export interface FacialCadastroCommandPayload {
  requestId: string;
  schedulingId: string;
  sessionId: string;
  transactionId: string;
  redirectUrl: string;
  unidade: string;
  sala: string;
  operador?: BiometriaOperadorModel;
  funcionario: BiometriaFuncionarioModel;
}

export interface FacialCadastroStatusPayload {
  requestId: string;
  status: 'iniciado' | 'aguardando_captura' | 'captura_em_andamento' | 'processando' | 'concluido' | 'erro' | 'cancelado';
  mensagem: string;
}

export interface FacialCadastroResultPayload {
  requestId: string;
  schedulingId: string;
  status: 'concluido' | 'erro' | 'cancelado';
  facialId?: string;
  confidence?: number;
  imagemUrl?: string;
  imagemHash?: string;
  termoCienciaUrl?: string;
  termoCienciaHash?: string;
  mensagem?: string;
}

export interface FacialCadastroCancelPayload {
  requestId: string;
  schedulingId: string;
  unidade: string;
}

export interface FacialValidacaoRequestPayload {
  requestId: string;
  schedulingId: string;
  unidade: string;
  funcionario: BiometriaFuncionarioModel;
  origem: string;
}

export interface FacialValidacaoCommandPayload {
  requestId: string;
  schedulingId: string;
  sessionId: string;
  transactionId: string;
  redirectUrl: string;
}

export interface FacialValidacaoStatusPayload {
  requestId: string;
  status: string;
  mensagem: string;
}

export interface FacialValidacaoResultPayload {
  requestId: string;
  aprovado: boolean;
  confidence: number | null;
  facialId: string;
  imagemUrl?: string;
  mensagem?: string;
}

export interface TeleatendimentoJoinPayload {
  sessionId?: string;
  inviteToken?: string;
  role: 'PROFESSIONAL' | 'EMPLOYEE';
}

export interface TeleatendimentoSessionSyncPayload {
  sessionId: string;
  roomId: string;
  role: 'PROFESSIONAL' | 'EMPLOYEE';
  status: 'WAITING_EMPLOYEE' | 'IN_CALL' | 'ENDED' | 'EXPIRED';
  professional: {
    name: string;
    connected: boolean;
  };
  employee: {
    name: string;
    connected: boolean;
  };
}

export interface TeleatendimentoSignalPayload {
  sessionId: string;
  payload: any;
}

export interface TeleatendimentoChatPayload {
  sessionId: string;
  messageId: string;
  authorRole: 'PROFESSIONAL' | 'EMPLOYEE';
  authorName: string;
  text: string;
  sentAt: string;
}

export interface TeleatendimentoCallStatusPayload {
  sessionId: string;
  status:
    | 'waiting'
    | 'joined'
    | 'left'
    | 'occupied'
    | 'ended'
    | 'expired'
    | 'error';
  role?: 'PROFESSIONAL' | 'EMPLOYEE';
  message: string;
}

export interface TeleatendimentoJoinVirtualWaitingRoomPayload {
  cpf: string;
}

export interface TeleatendimentoVirtualWaitingRoomStatusPayload {
  status: 'waiting' | 'error';
  message: string;
  schedulingId?: string;
}

export interface TeleatendimentoPullToCallPayload {
  sessionId: string;
}

export interface BiometriaCadastroResumo {
  dedo: string;
  cadastradoEm?: string;
  unidade?: string;
  operador?: {
    id?: string;
    nome?: string;
    perfil?: string;
  };
  agentMachineName?: string;
  agentIpLocal?: string;
  templateVersion?: string;
  status?: string;
}

// Estender os tipos do Socket.IO para eventos personalizados
export interface CustomEventMap {
  [EventType.CONNECTION_REQUEST]: (payload: SchedulingDocument[]) => void;
  [EventType.TICKET_EMITED]: (payload: Ticket) => void;
  [EventType.TICKET_UPDATED]: (payload: Ticket) => void;
  [EventType.TICKET_ACTION_SUCCESS]: (
    payload: TicketActionSuccessPayload,
  ) => void;
  [EventType.TICKET_ERROR]: (payload: string) => void;
  [EventType.TICKET_DELETE]: (payload: number) => void;
  [EventType.TICKET_INFO]: (payload: string) => void;
  [EventType.PAINEL_CALL]: (payload: PainelCall) => void;
  [EventType.PAINEL_TICKETS]: (payload: PainelCall[]) => void;
  [EventType.UPDATE_SCHEDULE]: (payload: SchedulingChange) => void;
  [EventType.UPDATE_RECORD]: (payload: SchedulingChange) => void;
  [EventType.PREPARATION_REQUEST]: (payload: PreparationRequestModel) => void;

  // Biometria
  [EventType.BIOMETRIA_CAPTURA_REQUEST]: (payload: BiometriaCapturaRequestPayload) => void;
  [EventType.BIOMETRIA_CAPTURA_COMMAND]: (payload: BiometriaCapturaCommandPayload) => void;
  [EventType.BIOMETRIA_CAPTURA_SUCCESS]: (payload: BiometriaCapturaSuccessPayload) => void;
  [EventType.BIOMETRIA_CAPTURA_ERROR]: (payload: BiometriaCapturaErrorPayload) => void;
  [EventType.BIOMETRIA_CAPTURA_STARTED]: (payload: BiometriaCapturaStartedPayload) => void;
  [EventType.BIOMETRIA_CAPTURA_RESULT]: (payload: BiometriaCapturaResultPayload) => void;
  [EventType.BIOMETRIA_CAPTURA_STATUS]: (payload: BiometriaCapturaStatusPayload) => void;
  [EventType.BIOMETRIA_REQUEST_STATUS]: (payload: BiometriaRequestStatusPayload) => void;
  [EventType.BIOMETRIA_AGENT_UNAVAILABLE]: (payload: BiometriaAgentUnavailablePayload) => void;
  [EventType.BIOMETRIA_AGENT_STATUS]: (payload: BiometriaAgentStatusPayload) => void;
  [EventType.BIOMETRIA_STATUS_REQUEST]: () => void;
  [EventType.BIOMETRIA_REQUEST_STATE]: (payload: BiometriaRequestStatePayload) => void;
  [EventType.BIOMETRIA_AGENT_SNAPSHOT]: (payload: BiometriaAgentSnapshotPayload) => void;

  [EventType.BIOMETRIA_CADASTRO_REQUEST]: (payload: BiometriaCadastroRequestPayload) => void;
  [EventType.BIOMETRIA_CADASTRO_COMMAND]: (payload: BiometriaCadastroCommandPayload) => void;
  [EventType.BIOMETRIA_CADASTRO_STATUS]: (payload: BiometriaCadastroStatusPayload) => void;
  [EventType.BIOMETRIA_CADASTRO_RESULT]: (payload: BiometriaCadastroResultPayload) => void;
  [EventType.BIOMETRIA_CADASTRO_CANCEL]: (payload: BiometriaCadastroCancelPayload) => void;
  [EventType.BIOMETRIA_CAPTURA_CANCEL]: (payload: BiometriaCapturaCancelPayload) => void;

  // Biometria Validação 1:1
  [EventType.BIOMETRIA_VALIDACAO_REQUEST]: (payload: BiometriaValidacaoRequestPayload) => void;
  [EventType.BIOMETRIA_VALIDACAO_COMMAND]: (payload: BiometriaValidacaoCommandPayload) => void;
  [EventType.BIOMETRIA_VALIDACAO_STATUS]: (payload: BiometriaValidacaoStatusPayload) => void;
  [EventType.BIOMETRIA_VALIDACAO_RESULT]: (payload: BiometriaValidacaoResultPayload) => void;

  // Status Biométrico do Funcionário
  [EventType.BIOMETRIA_STATUS_FUNCIONARIO_REQUEST]: (payload: BiometriaStatusFuncionarioRequestPayload) => void;
  [EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT]: (payload: BiometriaStatusFuncionarioResultPayload) => void;

  // Facial
  [EventType.FACIAL_CADASTRO_REQUEST]: (payload: FacialCadastroRequestPayload) => void;
  [EventType.FACIAL_CADASTRO_COMMAND]: (payload: FacialCadastroCommandPayload) => void;
  [EventType.FACIAL_CADASTRO_STATUS]: (payload: FacialCadastroStatusPayload) => void;
  [EventType.FACIAL_CADASTRO_RESULT]: (payload: FacialCadastroResultPayload) => void;
  [EventType.FACIAL_CADASTRO_CANCEL]: (payload: FacialCadastroCancelPayload) => void;
  [EventType.FACIAL_VALIDACAO_REQUEST]: (payload: FacialValidacaoRequestPayload) => void;
  [EventType.FACIAL_VALIDACAO_COMMAND]: (payload: FacialValidacaoCommandPayload) => void;
  [EventType.FACIAL_VALIDACAO_STATUS]: (payload: FacialValidacaoStatusPayload) => void;
  [EventType.FACIAL_VALIDACAO_RESULT]: (payload: FacialValidacaoResultPayload) => void;

  [EventType.TELEATENDIMENTO_JOIN]: (payload: TeleatendimentoJoinPayload) => void;
  [EventType.TELEATENDIMENTO_SESSION_SYNC]: (
    payload: TeleatendimentoSessionSyncPayload,
  ) => void;
  [EventType.TELEATENDIMENTO_OFFER]: (
    payload: TeleatendimentoSignalPayload,
  ) => void;
  [EventType.TELEATENDIMENTO_ANSWER]: (
    payload: TeleatendimentoSignalPayload,
  ) => void;
  [EventType.TELEATENDIMENTO_ICE_CANDIDATE]: (
    payload: TeleatendimentoSignalPayload,
  ) => void;
  [EventType.TELEATENDIMENTO_CHAT_MESSAGE]: (
    payload: TeleatendimentoChatPayload,
  ) => void;
  [EventType.TELEATENDIMENTO_CALL_STATUS]: (
    payload: TeleatendimentoCallStatusPayload,
  ) => void;
  [EventType.TELEATENDIMENTO_END]: (payload: { sessionId: string }) => void;
  [EventType.TELEATENDIMENTO_JOIN_VIRTUAL_WAITING_ROOM]: (payload: TeleatendimentoJoinVirtualWaitingRoomPayload) => void;
  [EventType.TELEATENDIMENTO_VIRTUAL_WAITING_ROOM_STATUS]: (payload: TeleatendimentoVirtualWaitingRoomStatusPayload) => void;
  [EventType.TELEATENDIMENTO_PULL_TO_CALL]: (payload: TeleatendimentoPullToCallPayload) => void;
  [EventType.TELEATENDIMENTO_SUBSCRIBE_QUEUE]: (payload: { unidade: string; sala: string; exame?: string }) => void;
  [EventType.TELEATENDIMENTO_QUEUE_UPDATE]: (payload: { queue: any[] }) => void;
  [EventType.TELEATENDIMENTO_CALL_FROM_QUEUE]: (payload: { schedulingId: string; professionalName: string; unidade: string; sala: string; exame?: string }) => void;

  // GED Batch
  [EventType.GED_BATCH_STATUS]: (payload: GedBatchStatusPayload) => void;
  [EventType.GED_BATCH_PROGRESS]: (payload: GedBatchProgressPayload) => void;
}
