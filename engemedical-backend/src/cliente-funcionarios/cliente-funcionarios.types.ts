import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';

export type FuncionarioStatus =
  | 'ATENDIMENTO'
  | 'AGUARDANDO_RESULTADOS'
  | 'AVALIACAO_MEDICA'
  | 'AGENDADO'
  | 'PENDENTE'
  | 'EXPIRADO'
  | 'EXPIRANDO'
  | 'VALIDO';

export interface ClienteFuncionariosQuery {
  companyCode: string;
  page?: number;
  limit?: number;
  q?: string;
  status?: FuncionarioStatus | string;
}

export interface SchedulingSummary {
  id: string;
  atendimentoStatus: string | null;
  schedulingDate: string | Date | null;
  examDates: Array<string | Date>;
  examType?: string | null;
  examTypeCode?: string | null;
  examTypeName?: string | null;
}

export interface ResolvedFuncionarioStatus {
  status: FuncionarioStatus;
  statusLabel: string;
  statusReason: string;
  schedulingId: string | null;
  schedulingDate: string | null;
}

export interface ClienteFuncionariosSchedulingReader {
  findLatestByEmployee(
    companyCode: string,
    employeeCode: string,
  ): Promise<SchedulingSummary | null>;
}

export interface ClienteFuncionarioItem {
  codigo: string;
  nome: string;
  matricula: string;
  cpfMasked: string | null;
  cargo: string;
  unidade: string;
  situacao: string;
  dataAdmissao: string | null;
  dataDemissao: string | null;
  status: FuncionarioStatus;
  statusLabel: string;
  statusReason: string;
  schedulingId: string | null;
  schedulingDate: string | null;
}

export interface ClienteFuncionariosResponse {
  empresa: {
    codigo: string;
    nome: string;
  };
  items: ClienteFuncionarioItem[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export type ClienteFuncionariosEmployee = CadastroFuncionarioPorSituacao;
