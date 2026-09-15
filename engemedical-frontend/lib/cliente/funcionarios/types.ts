export type FuncionarioStatus =
  | "ATENDIMENTO"
  | "AGUARDANDO_RESULTADOS"
  | "AVALIACAO_MEDICA"
  | "AGENDADO"
  | "PENDENTE"
  | "EXPIRADO"
  | "EXPIRANDO"
  | "VALIDO";

export interface ClienteFuncionarioItem {
  codigo: string;
  nome: string;
  matricula: string | null;
  cpfMasked: string | null;
  cargo: string | null;
  unidade: string | null;
  situacao: string | null;
  dataAdmissao: string | null;
  dataDemissao: string | null;
  status: FuncionarioStatus;
  statusLabel: string;
  statusReason: string | null;
  schedulingId: string | null;
  schedulingDate: string | null;
}

export interface ClienteFuncionariosResponse {
  empresa: { codigo: string; nome: string };
  items: ClienteFuncionarioItem[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export interface ClienteFuncionariosQuery {
  empresaCodigo: string;
  page: number;
  limit: number;
  q?: string;
  status?: FuncionarioStatus;
}

export type ClienteFuncionariosErrorKind = "access" | "upstream" | "unknown";

export interface ClienteFuncionariosError {
  kind: ClienteFuncionariosErrorKind;
  message: string;
}
