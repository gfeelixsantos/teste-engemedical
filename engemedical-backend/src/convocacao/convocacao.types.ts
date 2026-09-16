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
  CODFUNCIONARIO?: string;
  NOMEFUNCIONARIO?: string;
  CARGO?: string;
  UNIDADE?: string;
  SETOR?: string;
  CODIGOSEQUENCIALFICHA?: string;
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
  tipoCobranca?: string;
  nomeSubgrupo?: string;
  nomeGrupoProduto?: string;
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
  dataResultado: string | null;  // ISO string serialized from Date
  vencimento: string | null;     // ISO string serialized from Date
  refazer: string | null;
  ultimopedido: string | null;   // ISO string serialized from Date
  tipoUltimoExame: string;
  situacaoExame: SituacaoExame;
  diasAVencerVencido: string;
  periodicidade: number;
  statusFaixa?: string;
}

export interface ConvocacaoKPIs {
  totalExames: number;
  totalFuncionariosConvocados: number;
  percentFuncionariosEmDia: number;
  percentConformidadeTotal: number;
  examesEmDia: number;
  examesVencidos: number;
  examesAVencer: number;
  examesNuncaRealizado: number;
  examesSemResultado: number;
  examesDentroDoPrazo: number;
  examesForaDoPrazo: number;
  funcionariosExamesAVencer: number;
  funcionariosExamesForaDoPrazo: number;
  funcionariosExamesEmDia: number;
  funcionariosExamesVencidos: number;
  ultimaAtualizacao: string;  // ISO string
  tendenciaExamesEmDia?: number;
  tendenciaExamesAVencer?: number;
  tendenciaExamesVencidos?: number;
}

export interface PorAno {
  ano: number;
  funcionarios: number;
  exames: number;
}

export interface PorTipoExame {
  tipoExame: string;
  'Em Dia': number;
  'A Vencer': number;
  Vencido: number;
  'Nunca Realizado': number;
  'Sem Data de Resultado': number;
}

export interface Status10Faixa {
  status: string;
  funcionarios: number;
  exames: number;
  cor: string;
}

export interface DashboardData {
  kpis: ConvocacaoKPIs;
  porSituacao: Array<{
    situacao: string;
    funcionarios: number;
    exames: number;
    percentual: number;
  }>;
  porStatus10: Status10Faixa[];
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
    exames: string[];
    situacoes: SituacaoExame[];
  };
}
