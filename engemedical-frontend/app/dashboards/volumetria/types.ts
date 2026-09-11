export type SituacaoCompromisso = 'Atendido' | 'NaoAtendido' | 'AguardandoAtendimento' | 'Cancelado' | 'NaoCompareceu';

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
  AguardandoAtendimento: number;
  Atendido: number;
  NaoAtendido: number;
}

export interface PorAnoLine {
  ano: number;
  agendamentos: number;
  atendidos: number;
  exames: number;
}

export interface PorSubGrupoBar {
  subGrupo: string;
  agendamentos: number;
  atendidos: number;
}

export interface PorSituacaoItem {
  situacao: string;
  quantidade: number;
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
  situacaoNome: SituacaoCompromisso;
  setorFuncionario: string;
  unidadeFuncionario: string;
  cargoFuncionario: string;
  codigoSequencialFicha: string;
}

export interface PorEmpresaRow {
  nomeEmpresa: string;
  agendamentos: number;
  funcionarios: number;
  exames: number;
}

export interface VolumetriaDashboardData {
  kpis: VolumetriaKPIs;
  porAgenda: PorAgendaBar[];
  porEmpresa: PorEmpresaRow[];
  porTipoCompromisso: PorTipoCompromissoGrouped[];
  porAno: PorAnoLine[];
  porSubGrupo: PorSubGrupoBar[];
  detalhes: CompromissoDetalhe[];
  agendas: { codigo: string; nome: string }[];
  empresas: string[];
  tiposCompromisso: string[];
  totalCompromissos: number;
  filtros: {
    agendas: { codigo: string; nome: string }[];
    empresas: string[];
    situacoes: SituacaoCompromisso[];
    tiposCompromisso: string[];
  };
}
