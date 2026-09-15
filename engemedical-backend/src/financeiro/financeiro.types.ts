export type SocRow = Record<string, unknown>;

export interface FinanceiroKPIs {
  totalTitulos: number;
  valorTitulos: number;
  vidasContagem: number;
  totalEmpresasContagem: number;
  empresasSocnet: number;
  vidasSocnet: number;
  valorCobradoExames: number;
  valorAPagarExames: number;
  margemExames: number;
}

export interface FinanceiroMesItem {
  mes: string;
  valorTitulos: number;
  valorCobradoExames: number;
  valorAPagarExames: number;
  margemExames: number;
  titulos: number;
}

export interface FinanceiroEmpresaItem {
  codigo: string;
  empresa: string;
  valorTitulos: number;
  vidas: number;
  titulos: number;
  socnet: string;
}

export interface FinanceiroProdutoItem {
  codigoProduto: string;
  nomeProduto: string;
  valorTotal: number;
  qtdTitulos: number;
}

export interface FinanceiroDashboardData {
  success: boolean;
  kpis: FinanceiroKPIs;
  porMes: FinanceiroMesItem[];
  porEmpresa: FinanceiroEmpresaItem[];
  porProduto: FinanceiroProdutoItem[];
  inconsistencias: Array<{ tipo: string; descricao: string; quantidade: number }>;
  meta: { periodo: { inicio: string; fim: string }; fonte: string; atualizadoEm: string };
}

