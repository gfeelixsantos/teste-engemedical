import {
  PreferentialTypes,
  TicketGroups,
  TicketStatus,
} from '../enum/ticket.enum';
import {
  PreparationRequestTypes,
  WebsocketType,
} from '../../websocket/enum/websocket.enum';

export type Ticket = {
  id?: number;
  emissao?: Date;
  numero?: number;
  prefixo: string;
  ativo: boolean;
  preferencial?: boolean;
  preferencialTipo?: PreferentialTypes | null;
  status?: TicketStatus;
  type: WebsocketType.TICKET;
  unidade: string;
  sala?: string;
  atendente?: string;
  exame?: string;
  profissional?: string;
  grupo: TicketGroups | string | null;
  updatedAt?: Date;
  deleted?: Date;
};

export class TicketClass implements Ticket {
  id: number;
  emissao: Date;
  numero?: number;
  prefixo: string = '';
  preferencial?: boolean = false;
  preferencialTipo: PreferentialTypes.NULL;
  status: TicketStatus;
  type: WebsocketType.TICKET = WebsocketType.TICKET;
  unidade: string = '';
  sala?: string = '';
  atendente?: string = '';
  grupo: TicketGroups | string;
  exame?: string = '';
  profissional?: string = '';
  updatedAt?: Date;
  ativo: boolean = true;

  constructor(data?: Partial<Ticket>) {
    if (data) {
      Object.assign(this, data);
    }
  }
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
  grupo: TicketGroups | string;
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
  ticketId: number;
};

export type PreparationRequestModel = {
  type: PreparationRequestTypes;
  request: PreparationRequest;
  message?: string;
};
