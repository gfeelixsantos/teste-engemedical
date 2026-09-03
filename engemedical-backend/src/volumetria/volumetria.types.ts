// Raw type from SOC "Exporta Dados Compromissos" (codigo 216618)
export interface SocCompromisso {
  codigoAgenda: string;
  nomeAgenda: string;
  codigoEmpresa: string;
  nomeEmpresa: string;
  codigoFuncionario: string;
  nomeFuncionario: string;
  cpfFuncionario: string;
  dataNascimentoFuncionario: string;
  sexoFuncionario: string;
  dataCompromisso: string;
  tipoCompromisso: string;
  rgFuncionario: string;
  ufRgFuncionario: string;
  celularFuncionario: string;
  emailFuncionario: string;
  logradouroFuncionario: string;
  numeroLogradouroFuncionario: string;
  complementoLogradouroFuncionario: string;
  bairroFuncionario: string;
  cidadeFuncionario: string;
  ufFuncionario: string;
  cepFuncionario: string;
  horaInicio: string;
  horaFim: string;
  nomeCompromisso: string;
  nomeTipoCompromisso: string;
  nomeProfissionalAgenda: string;
  horaChegada: string;
  horaSaida: string;
  situacao: string;
  detalhes: string;
  atendimentoPrioritario: string;
  codigoUsuarioInclusao: string;
  nomeUsuarioInclusao: string;
  dataInclusao: string;
  horaInclusao: string;
  codigoSequencialFicha: string;
  statusFuncionario: string;
  compromissoRemarcado: string;
  dataCompromissoRemarcado: string;
  situacaoCompromissoRemarcado: string;
  tipoCompromissoRemarcado: string;
  nomeCompromissoRemarcado: string;
  unidadeFuncionario: string;
  setorFuncionario: string;
  cargoFuncionario: string;
  enviarEmail: string;
  dataEmail: string;
  horaEmail: string;
  email: string;
  statusEmail: string;
  videochamada: string;
  linkVideochamada: string;
  motivoCancelamento: string;
}

// Situacoes em formato numerico do SOC
export const SITUACAO_ATENDIDO = '1';
export const SITUACAO_NAO_ATENDIDO = '2';
export const SITUACAO_AGUARDANDO = '3';
export const SITUACAO_CANCELADO = '4';
export const SITUACAO_NAO_COMPARECEU = '5';

// Situacoes amigaveis para a UI (usando nomes sem acentos para evitar problemas de tipo)
export type SituacaoNome = 'Atendido' | 'NaoAtendido' | 'AguardandoAtendimento' | 'Cancelado' | 'NaoCompareceu';

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
  situacaoNome: SituacaoNome;
  setorFuncionario: string;
  unidadeFuncionario: string;
  cargoFuncionario: string;
  codigoSequencialFicha: string;
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

export interface PorEmpresaBar {
  nomeEmpresa: string;
  agendamentos: number;
  funcionarios: number;
  exames: number;
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

export interface VolumetriaDashboardData {
  kpis: VolumetriaKPIs;
  porAgenda: PorAgendaBar[];
  porEmpresa: PorEmpresaBar[];
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
    situacoes: SituacaoNome[];
    tiposCompromisso: string[];
  };
}