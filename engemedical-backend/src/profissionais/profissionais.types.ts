export interface ProfissionalAgendaItem {
  agenda: string;
  agendamentos: number;
  atendimentos: number;
  percentAgendamentos: number;
  percentAtendimentos: number;
}

export interface ProfissionalPeriodoItem {
  periodo: string;
  agendamentos: number;
  exames: number;
}

export interface ProfissionalTipoCompromissoItem {
  tipoCompromisso: string;
  aguardandoAtendimento: number;
  atendido: number;
  naoAtendido: number;
  percentAguardando: number;
  percentAtendido: number;
  percentNaoAtendido: number;
}

export interface ProfissionalVolumeExameItem {
  exame: string;
  quantidade: number;
}

export interface ProfissionalHorarioItem {
  horario: string;
  quantidade: number;
}

export interface ProfissionalDiaSemanaItem {
  diaSemana: string;
  quantidade: number;
}

export interface ProfissionalHeatmapItem {
  diaSemana: string;
  horarios: Record<string, number>;
  totalDia: number;
}

export interface ProfissionalSubgrupoItem {
  subgrupo: string;
  agendamentos: number;
  atendimentos: number;
}

export interface ProfissionalEmpresaItem {
  empresa: string;
  quantidade: number;
}

export interface ProfissionalRegistroItem {
  empresa: string;
  sequencialSituacaoDivergente: string;
  verificacaoDuplicidade: string;
  nome: string;
  sequencialFicha: string;
  dataCompromisso: string;
  dataFicha: string;
  dataExame: string;
  situacao: string;
  horaInicio: string;
  statusSituacao: string;
  tipoCompromisso: string;
  exame: string;
  subgrupo?: string;
  agenda?: string;
}

export interface ProfissionaisKPIs {
  totalAgendamentos: number;
  totalAtendimentos: number;
  mediaPorAgendamento: number;
  totalFuncionarios: number;
  atendidos: number;
  naoAtendidos: number;
  aguardandoAtendimento: number;
  ultimaAtualizacao: string;
}

export interface ProfissionaisDashboardResponse {
  kpis: ProfissionaisKPIs;
  agendasDisponiveis: string[];
  porAgenda: ProfissionalAgendaItem[];
  porPeriodo: ProfissionalPeriodoItem[];
  porTipoCompromisso: ProfissionalTipoCompromissoItem[];
  porVolumeExame: ProfissionalVolumeExameItem[];
  porHorario: ProfissionalHorarioItem[];
  porDiaSemana: ProfissionalDiaSemanaItem[];
  heatmap: {
    horariosColunas: string[];
    dias: ProfissionalHeatmapItem[];
    totaisPorHorario: Record<string, number>;
    totalGeral: number;
  };
  porEmpresa: ProfissionalEmpresaItem[];
  porSubgrupo: ProfissionalSubgrupoItem[];
  detalhes: ProfissionalRegistroItem[];
}
