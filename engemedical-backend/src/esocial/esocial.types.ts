// Raw type from SOC "Eventos eSocial" (codigo 186601)
export interface SocEventoEsocial {
  STATUSEVENTO: string;
  CODIGOEMPRESA: string;
  EMPRESA: string;
  CNPJ: string;
  SUBGRUPO: string;
  NOMEUNIDADE: string;
  'ClassificacaoEmpresa': string;
  FUNCIONARIO: string;
  NOMEFUNCIONARIO: string;
  DATAGERACAO: string;
  'COD EVENTO': string;
  EVENTO: string;
  CODIGOGED: string;
  NOMEARQUIVO: string;
  NRRECIBO: string;
  ERRO: string;
  CODIGOERROESOCIAL: string;
  SEQUENCIAL: string;
  AMBIENTEPRODUCAO: string;
  CARGAINICIAL: string;
  'Solucao eSocial': string;
  DATAINICIOCONDICAO: string;
  CODIGOARQUIVOGED: string;
  IDARQUIVO: string;
}

// Status possiveis dos registros eSocial
export type StatusEvento =
  | 'Concluido'
  | 'Inconsistencias'
  | 'Pendente'
  | 'Excluido'
  | 'Assinado'
  | 'Processando'
  | 'Reprocessar'
  | 'Ignorado'
  | 'Apto para envio'
  | 'Integracao';

// Layouts de eventos
export type LayoutEvento = 'S2210' | 'S2220' | 'S2221' | 'S2230' | 'S2240' | 'Sem evento identificado';

// Registro mapeado
export interface RegistroEsocial {
  codigoEmpresa: string;
  empresa: string;
  cnpj: string;
  subgrupo: string;
  unidade: string;
  classificacaoEmpresa: string;
  layout: LayoutEvento;
  evento: string;
  dataGeracao: string;
  codigoGed: string;
  nomeArquivo: string;
  codigoFuncionario: string;
  funcionario: string;
  statusEvento: StatusEvento;
  nrRecibo: string;
  erro: string;
  codigoErroEsocial: string;
  ambiente: string;
  cargaInicial: string;
  solucaoEsocial: string;
}

// KPIs do dashboard
export interface EsocialKPIs {
  totalRegistros: number;
  totalEmpresas: number;
  concluidos: number;
  inconsistencias: number;
  pendentes: number;
  taxaConclusao: number;
}

// Status para grafico
export interface StatusItem {
  status: string;
  qtd: number;
}

// Layout para grafico
export interface LayoutItem {
  layout: string;
  qtd: number;
}

// Evolucao mensal
export interface EvolucaoMensalItem {
  mes: string;
  qtd: number;
}

// Status por mes
export interface StatusMesItem {
  mes: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  excluido: number;
  assinado: number;
  outros: number;
}

// Empresa com status
export interface EmpresaStatusItem {
  empresa: string;
  totalRegistros: number;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  excluido: number;
  assinado: number;
}

// Dashboard completo
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
  matrix: any;
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