// Raw type from SOC "Faturamento" (codigo 186376)
export interface SocFaturamento {
  CODIGO_EMPRESA: string;
  EMPRESA: string;
  CODIGO_UNIDADE: string;
  UNIDADE: string;
  CODIGO_PRODUTO: string;
  PRODUTO: string;
  MES_COBRANCA: string;
  QUANTIDADE_VIDAS: string;
  VALOR_VIDA: string;
  VALOR_TOTAL: string;
  QUANTIDADE_EVENTOS_ESOCIAL: string;
  VALOR_EVENTO: string;
}

// Raw type from SOC "Preco" (codigo 218761)
export interface SocPreco {
  codigoEmpresa: string;
  situacaoEmpresa: string;
  nomeEmpresa: string;
  estadoEmpresa: string;
  cidadeEmpresa: string;
  codigoUnidade: string;
  nomeUnidade: string;
  estadoUnidade: string;
  cidadeUnidade: string;
  codigoProduto: string;
  nomeProduto: string;
  codigoGrupoProduto: string;
  nomeGrupoProduto: string;
  exames: string;
  valorProdutoPontual: string;
  valorVidaMes: string;
  valorMensal: string;
  valorAnual: string;
  valorTotalParcela: string;
  valorMinimo: string;
  minimoVidas: string;
}

// Registro mapeado de vidas
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

// KPIs do dashboard
export interface VidasKPIs {
  totalRegistros: number;
  totalEmpresas: number;
  totalVidas: number;
  valorTotalFaturado: number;
  mediaVidasPorEmpresa: number;
  empresasComPlano: number;
  empresasSemPlano: number;
}

// Custo por vida
export interface CustoPorVidaItem {
  empresa: string;
  qtdVidas: number;
  valorVida: number;
  valorTotal: number;
}

// Vidas por produto
export interface VidasPorProdutoItem {
  produto: string;
  qtdVidas: number;
  empresas: number;
}

// Dashboard completo
export interface VidasDashboardData {
  success: boolean;
  kpis: VidasKPIs;
  custoPorVida: CustoPorVidaItem[];
  vidasPorProduto: VidasPorProdutoItem[];
  vidasPorEmpresa: CustoPorVidaItem[];
  registros: RegistroVida[];
  meta: {
    dataBase: string;
    fonte: string;
  };
  filtros: {
    empresas: string[];
    produtos: string[];
  };
}
