export type StatusEvento = 'Concluido' | 'Inconsistencias' | 'Pendente' | 'Excluido' | 'Assinado' | string;
export type LayoutEvento = 'S2210' | 'S2220' | 'S2221' | 'S2230' | 'S2240' | 'Sem evento identificado';

export interface EsocialKPIs {
  totalRegistros: number;
  totalEmpresas: number;
  concluidos: number;
  inconsistencias: number;
  pendentes: number;
  taxaConclusao: number;
}

export interface StatusItem {
  status: string;
  qtd: number;
}

export interface LayoutItem {
  layout: string;
  qtd: number;
}

export interface EvolucaoMensalItem {
  mes: string;
  qtd: number;
}

export interface StatusMesItem {
  mes: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  excluido: number;
  assinado: number;
  outros: number;
}

export interface EmpresaStatusItem {
  empresa: string;
  totalRegistros: number;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  excluido: number;
  assinado: number;
}

export interface RegistroEsocial {
  codigoEmpresa: string;
  empresa: string;
  cnpj: string;
  subgrupo: string;
  unidade: string;
  layout: LayoutEvento;
  dataGeracao: string;
  funcionario: string;
  statusEvento: StatusEvento;
  nrRecibo: string;
  erro: string;
}

export interface EsocialDashboardData {
  success: boolean;
  kpis: EsocialKPIs;
  layouts: Record<string, number>;
  charts: {
    por_status: StatusItem[];
    por_layout: LayoutItem[];
    por_mes: EvolucaoMensalItem[];
    por_mes_status: StatusMesItem[];
    por_empresa: StatusItem[];
    por_empresa_status: EmpresaStatusItem[];
    por_erro: StatusItem[];
  };
  rows: RegistroEsocial[];
  meta: {
    periodo: { dataInicio: string; dataFim: string };
    dataBase: string;
    fonte: string;
  };
  filtros: {
    empresas: string[];
    layouts: string[];
    status: string[];
  };
}