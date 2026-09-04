export interface VidasKPIs {
  totalRegistros: number;
  totalEmpresas: number;
  totalVidas: number;
  valorTotalFaturado: number;
  mediaVidasPorEmpresa: number;
  empresasComPlano: number;
  empresasSemPlano: number;
}

export interface CustoPorVidaItem {
  empresa: string;
  qtdVidas: number;
  valorVida: number;
  valorTotal: number;
}

export interface VidasPorProdutoItem {
  produto: string;
  qtdVidas: number;
  empresas: number;
}

export interface RegistroVida {
  codigoEmpresa: string;
  empresa: string;
  codigoUnidade: string;
  unidade: string;
  codigoProduto: string;
  produto: string;
  mesCobranca: string;
  qtdVidas: number;
  valorVida: number;
  valorTotal: number;
  cidade: string;
  estado: string;
  subgrupo: string;
}

export interface VidasDashboardData {
  success: boolean;
  kpis: VidasKPIs;
  custoPorVida: CustoPorVidaItem[];
  vidasPorProduto: VidasPorProdutoItem[];
  vidasPorEmpresa: CustoPorVidaItem[];
  registros: RegistroVida[];
  meta: { dataBase: string; fonte: string };
  filtros: { empresas: string[]; produtos: string[] };
}
