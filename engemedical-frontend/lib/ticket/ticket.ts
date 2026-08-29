import {
  PreparationRequestTypes,
  WebsocketType,
} from "@/lib/websocket/enums/websocket.enum";

export enum TicketGroups {
  RECEPCAO = "RECEPCAO",
  EXAME = "EXAME",
}

export enum TicketStatus {
  AGUARDANDO = "AGUARDANDO",
  EM_CHAMADA = "EM CHAMADA",
  EM_ATENDIMENTO = "EM ATENDIMENTO",
  FINALIZADO = "FINALIZADO",
  EM_PREPARACAO = "EM PREPARAÇÃO",
  PREPARO_OK = "PREPARO OK",
  ENCAMINHADO_RX = "ENCAMINHADO RAIO-X",
}

export enum TicketActionType {
  CHAMAR = "CHAMAR",
  ATENDER = "ATENDER",
  AGUARDAR = "AGUARDAR",
  RETORNAR = "RETORNAR",
  EM_PREPARACAO = "EM PREPARAÇÃO",
  PREPARO_OK = "PREPARO OK",
  ENCAMINHADO_RX = "ENCAMINHADO RAIO-X",
  FINALIZAR = "FINALIZAR",
  EXAME = "EXAME",
}

export enum TicketTypes {
  ATENDIMENTO = "ATENDIMENTO",
  PREFERENCIAL = "PREFERENCIAL",
  RETIRADA_EXAMES = "RETIRADA_EXAMES",
  NORMAL = "NORMAL",
  WHIRLPOOL = "WHIRLPOOL",
}

export interface Ticket {
  id: number;
  emissao: Date;
  numero: Number;
  prefixo: string;
  preferencial: boolean;
  preferencialTipo: string | null;
  status: TicketStatus;
  type: WebsocketType.TICKET;
  unidade: string;
  sala: string;
  exame: string | null;
  atendente: string;
  profissional: string;
  grupo: TicketGroups | string;
  updatedAt?: string;
}

export type TicketEmitedDto = {
  emissao: Date;
  numero: 0;
  prefixo: string;
  preferencial: boolean;
  preferencialTipo?: string;
  status: TicketStatus;
  type: WebsocketType.TICKET;
  unidade: string;
  grupo: TicketGroups;
};

// Adicionar interface para ações do ticket
export type TicketAction = {
  action: TicketActionType;
  ticketId: number | string;
  userId: string;
  sala: string;
  unidade: string;
  newStatus?: TicketStatus;
};

export type PreparationRequest = {
  empresa: string;
  nome: string;
  dataNascimento: string;
  cpf: string;
  tipoExame: string;
  informacoes: string;
  unidade: string;
  atendente: string;
  sala: string;
  ticketId?: number;
  tickets?: Ticket;
};

export type PreparationRequestModel = {
  type: PreparationRequestTypes;
  request: PreparationRequest;
  message?: string;
};
