// Raw type from SOC "Funcionários da Contagem" (codigo 185598)
export interface SocFuncionarioContagem {
  CODIGOEMPRESA: string;
  NOMEEMPRESA: string;
  CODIGOGRUPO: string;
  NOMEGRUPO: string;
  CODIGOSUBGRUPO: string;
  NOMESUBGRUPO: string;
  CODIGOUNIDADE: string;
  NOMEUNIDADE: string;
  CODIGOSETOR: string;
  NOMESETOR: string;
  CODIGOCARGO: string;
  NOMECARGO: string;
  CODIGOFUNCIONARIO: string;
  NOMEFUNCIONARIO: string;
  SITUACAOFUNCIONARIO: string;
  DATAADMISSAO: string;
  DATAINATIVACAO: string;
  DATACRIACAOFUNCIONARIO: string;
}

// Raw type from SOC "Exames Realizados" (codigo 160814)
export interface SocExameRealizado {
  EMPRESA: string;
  NOMEEMPRESA: string;
  DATAFICHA: string;
  DATARESULTADO: string;
  TIPOEXAME: string;
  DATAEXAME: string;
  CODEXAME: string;
  NOMEEXAME: string;
  EXAMEALTERADO: string;
  CPFMEDICOEXAMINADOR: string;
  NOMEMEDICOEXAMINADOR: string;
  CODIGOPRESTADOR: string;
  NOMEPRESTADOR: string;
  UF: string;
  CIDADEPRESTADOR: string;
}

// Raw type from SOC "Cadastro Unidades" (codigo 160694)
export interface SocUnidade {
  CODIGOEMPRESA: string;
  NOMEEMPRESA: string;
  CODIGOUNIDADE: string;
  NOMEUNIDADE: string;
  GRAUDERISCOUNIDADE: string;
  UNIDADEATIVA: string;
  CNPJUNIDADE: string;
  UF: string;
  CIDADE: string;
  ENDERECO: string;
  BAIRRO: string;
  CEP: string;
  RAZAOSOCIAL: string;
}

// Raw type from SOC "Preço" (codigo 218761)
export interface SocPreco {
  codigoEmpresa: string;
  nomeEmpresa: string;
  codigoUnidade: string;
  nomeUnidade: string;
  codigoProduto: string;
  nomeProduto: string;
  valorVidaMes: string;
  vidasAtivasUltimaContagem: number;
  flagClienteInadimplente: string;
  valorMensal: string;
}

// ─── Computed Dashboard Types ────────────────────────────────────────────────

export type SituacaoExame =
  | 'Em Dia'
  | 'A Vencer'
  | 'Vencido'
  | 'Nunca Realizado'
  | 'Sem Data de Resultado';

export interface ConvocacaoExame {
  codigoEmpresa: string;
  nomeEmpresa: string;
  codigoFuncionario: string;
  nomeFuncionario: string;
  cargo: string;
  unidade: string;
  setor: string;
  subgrupo: string;
  estado: string;
  exame: string;
  dataResultado: Date | null;
  vencimento: Date | null;
  refazer: Date | null;
  ultimopedido: Date | null;
  tipoUltimoExame: string;
  situacaoExame: SituacaoExame;
  diasAVencerVencido: string;
  periodicidade: number;
}

export interface ConvocacaoKPIs {
  totalExames: number;
  totalFuncionariosConvocados: number;
  examesEmDia: number;
  examesVencidos: number;
  examesAVencer: number;
  examesNuncaRealizado: number;
  examesSemResultado: number;
  ultimaAtualizacao: Date;
}

// Agregação por ANO (LineChart — eixo X = anos)
export interface PorAno {
  ano: number;
  funcionarios: number;
  exames: number;
}

// Agregação por TIPO DE EXAME e situação (Barras agrupadas)
export interface PorTipoExame {
  tipoExame: string;
  'Em Dia': number;
  'A Vencer': number;
  Vencido: number;
  'Nunca Realizado': number;
  'Sem Data de Resultado': number;
}

export interface DashboardData {
  kpis: ConvocacaoKPIs;
  porSituacao: Array<{
    situacao: string;
    funcionarios: number;
    exames: number;
  }>;
  porEmpresa: Array<{
    empresa: string;
    exames: number;
    funcionariosAVencer: number;
    percentAVencer: number;
  }>;
  porUnidade: Array<{
    unidade: string;
    exames: number;
    foraDoPrazo: number;
  }>;
  porAno: PorAno[];
  porTipoExame: PorTipoExame[];
  detalhes: ConvocacaoExame[];
  totalDetalhes: number;
  filtros: {
    empresas: string[];
    unidades: string[];
    situacoes: SituacaoExame[];
  };
}
