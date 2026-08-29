import { TicketActionType } from 'src/ticket/enum/ticket.enum';
import { Ticket } from 'src/ticket/interfaces/ticket';

export type ActionRequest = {
  mongoId?: string;
  ticketId: number;
  action: TicketActionType;
  sala?: string;
  unidade: string;
  user?: string;
  funcionario?: string;
  exame?: string;
};

export type ActionRequestAtendimento = {
  funcionarioId: string;
  ticketId: number;
  action: TicketActionType;
  unidade: string;
  sala?: string;
  exame?: string;
  user?: string;
  nomeFuncionario?: string;
};

export type PrinterService = {
  type: string;
  unidade: string;
};

export type PrinterResult = {
  process: boolean;
  ticket: Ticket;
  message?: string;
};
