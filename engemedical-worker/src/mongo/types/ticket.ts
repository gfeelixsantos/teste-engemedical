export enum TicketGroups {
  RECEPCAO = 'RECEPÇÃO',
  EXAME = 'EXAME',
}

export enum TicketStatus {
  AGUARDANDO = 'AGUARDANDO',
  EM_CHAMADA = 'EM CHAMADA',
  EM_ATENDIMENTO = 'EM ATENDIMENTO',
  FINALIZADO = 'FINALIZADO',
  EM_PREPRACAO = 'EM PREPARAÇÃO',
  PREPARO_OK = 'PREPARO OK',
  ENCAMINHADO_RX = 'ENCAMINHADO RAIO-X',
}

export enum TicketTypes {
  NORMAL = '',
  PREFERENCIAL = 'P',
  WHIRLPOOL = 'W',
  RETIRADA_EXAMES = 'R',
}

export enum TicketActionType {
  CHAMAR = 'CHAMAR',
  ATENDER = 'ATENDER',
  AGUARDAR = 'AGUARDAR',
  RETORNAR = 'RETORNAR',
  FINALIZAR = 'FINALIZAR',
  EM_PREPRACAO = 'EM PREPARAÇÃO',
  PREPARO_OK = 'PREPARO OK',
  ENCAMINHADO_RX = 'ENCAMINHADO RAIO-X',
  EXAME = 'EXAME',
}

export enum PreferentialTypes {
  GESTANTE = 'GESTANTE',
  CRIANCA_COLO = 'CRIANÇA DE COLO',
  IDOSO = 'IDOSO',
  PCD = 'PCD',
  OUTROS = 'OUTROS',
  NULL = '',
}

export type Ticket = {
  id?: number;
  emissao: Date | null;
  numero: number | null;
  prefixo: string;
  preferencial?: boolean;
  preferencialTipo?: PreferentialTypes;
  status?: TicketStatus;
  type: 'TICKET';
  unidade: string;
  sala?: string;
  atendente?: string;
  exame?: string;
  profissional?: string;
  grupo: TicketGroups | string | null;
};

export class TicketClass implements Ticket {
  id: number;
  emissao: Date | null;
  numero: number | null;
  prefixo: string = '';
  preferencial?: boolean = false;
  preferencialTipo: PreferentialTypes.NULL;
  status: TicketStatus;
  type: 'TICKET';
  unidade: string = '';
  sala?: string = '';
  atendente?: string = '';
  grupo: TicketGroups | string;
  exame?: string = '';
  profissional?: string = '';

  constructor(data?: Partial<Ticket>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
