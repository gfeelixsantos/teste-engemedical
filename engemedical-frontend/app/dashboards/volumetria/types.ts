export type SituacaoCompromisso = 'Atendido' | 'Não Atendido' | 'Aguardando Atendimento' | 'Cancelado' | 'Não Compareceu';

export interface TipoCompromisso {
  codigo: number;
  nome: string;
}

export interface VolumetriaKPIs {
  totalAgendamentos: number;
  totalAtendidos: number;
  totalNaoAtendidos: number;
  totalAguardando: number;
  totalFuncionarios: number;
  totalExames: number;
  ultimaAtualizacao: string;
}

export interface PorAgendaBar {
  nomeAgenda: string;
  agendamentos: number;
  atendidos: number;
  naoAtendidos: number;
}

export interface PorTipoCompromissoGrouped {
  tipoCompromisso: string;
  'Aguardando Atendimento': number;
  'Atendido': number;
  'Não Atendido': number;
}

export interface PorAnoLine {
  ano: number;
  agendamentos: number;
  atendidos: number;
  exames: number;
}

export interface CompromissoDetalhe {
  codigoAgenda: string;
  nomeAgenda: string;
  codigoEmpresa: string;
  nomeEmpresa: string;
  codigoFuncionario: string;
  nomeFuncionario: string;
  cpfFuncionario: string;
  tipoCompromisso: string;
  tipoCompromissoNome: string;
  dataCompromisso: string;
  horaInicio: string;
  horaFim: string;
  nomeCompromisso: string;
  situacao: string;
  situacaoNome: string;
  setorFuncionario: string;
  unidadeFuncionario: string;
  cargoFuncionario: string;
  codigoSequencialFicha: string;
}

export interface VolumetriaDashboardData {
  kpis: VolumetriaKPIs;
  porAgenda: PorAgendaBar[];
  porTipoCompromisso: PorTipoCompromissoGrouped[];
  porAno: PorAnoLine[];
  detalhes: CompromissoDetalhe[];
  agendas: { codigo: string; nome: string }[];
  empresas: string[];
  tiposCompromisso: string[];
  filtros: {
    agendas: { codigo: string; nome: string }[];
    empresas: string[];
    situacoes: SituacaoCompromisso[];
    tiposCompromisso: string[];
  };
  totalPaginacao?: {
    total: number;
    pagina: number;
    totalPaginas: number;
  };
}