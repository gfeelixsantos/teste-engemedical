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
  examesEmDia: number;
  examesVencidos: number;
  examesAVencer: number;
  examesNuncaRealizado: number;
  examesSemResultado: number;
  ultimaAtualizacao: string;
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

export interface DashboardData {
  kpis: ConvocacaoKPIs;
  porSituacao: Array<{ situacao: string; funcionarios: number; exames: number }>;
  porEmpresa: Array<{ empresa: string; exames: number; funcionariosAVencer: number; percentAVencer: number }>;
  porUnidade: Array<{ unidade: string; exames: number; foraDoPrazo: number }>;
  porAno: PorAno[];
  porTipoExame: PorTipoExame[];
  detalhes: ConvocacaoExame[];
  totalDetalhes: number;
  filtros: { empresas: string[]; unidades: string[]; situacoes: SituacaoExame[] };
  page: number;
  totalPages: number;
}
