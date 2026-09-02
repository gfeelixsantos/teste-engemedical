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
  dataResultado: string | null;
  vencimento: string | null;
  refazer: string | null;
  ultimopedido: string | null;
  tipoUltimoExame: string;
  situacaoExame: SituacaoExame;
  diasAVencerVencido: string;
  periodicidade: number;
}

export interface ConvocacaoKPIs {
  totalExames: number;
  totalFuncionariosConvocados: number;
  examesDentroDoPrazo: number;
  examesForaDoPrazo: number;
  percentFuncionariosEmDia: number;
  percentConformidadeTotal: number;
  funcComExamesAVencer: number;
  funcComExamesForaDoPrazo: number;
  ultimaAtualizacao: string;
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
  temporal: Array<{
    ano: number;
    mes: string;
    funcionarios: number;
    exames: number;
  }>;
  detalhes: ConvocacaoExame[];
  filtros: {
    empresas: string[];
    unidades: string[];
    situacoes: SituacaoExame[];
  };
}
