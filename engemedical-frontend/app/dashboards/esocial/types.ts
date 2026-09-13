export type StatusEvento = 'Concluido' | 'Inconsistencias' | 'Pendente' | 'Excluido' | 'Assinado' | string;
export type LayoutEvento = 'S2210' | 'S2220' | 'S2221' | 'S2230' | 'S2240' | 'Sem evento identificado';

export interface EsocialKPIs {
  totalRegistros: number;
  totalEmpresas: number;
  concluidos: number;
  inconsistencias: number;
  pendentes: number;
  xmlsValidos: number;
  xmlsInvalidos: number;
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
  outros?: number;
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

export interface EmpresaComparativoItem {
  empresa: string;
  totalRegistros: number;
  concluidos: number;
  pctConcluido: number;
}

export interface MatrixEmpresaNode {
  nome: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
}

export interface MatrixEventoNode {
  evento: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  empresas: MatrixEmpresaNode[];
}

export interface MatrixMesNode {
  mes: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  eventos: MatrixEventoNode[];
}

export interface MatrixAnoNode {
  ano: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  meses: MatrixMesNode[];
}

export interface MatrixStructure {
  totais: {
    concluido: number;
    inconsistencias: number;
    pendente: number;
    assinado: number;
    excluido: number;
  };
  anos: MatrixAnoNode[];
}

export interface RegistroEsocial {
  codigoEmpresa?: string;
  empresa: string;
  cnpj?: string;
  subgrupo?: string;
  unidade?: string;
  classificacaoEmpresa?: string;
  layout: LayoutEvento;
  evento?: string;
  dataGeracao: string;
  codigoGed?: string;
  nomeArquivo?: string;
  codigoFuncionario?: string;
  funcionario: string;
  statusEvento: StatusEvento;
  nrRecibo?: string;
  erro?: string;
  codigoErroEsocial?: string;
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
    por_empresa_comparativo?: EmpresaComparativoItem[];
    por_empresa_status: EmpresaStatusItem[];
    por_erro: StatusItem[];
  };
  matrix?: MatrixStructure;
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
