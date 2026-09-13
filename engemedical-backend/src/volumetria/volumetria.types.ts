export interface VolumetriaKPIs {
  totalAgendamentos: number;
  totalExames: number;
  mediaExamesPorAgendamento: number;
  totalFuncionarios: number;
  atendidos: number;
  naoAtendidos: number;
  aguardandoAtendimento: number;
  ultimaAtualizacao: string;
}

export interface PorAgendaItem {
  agenda: string;
  agendamentos: number;
  atendimentos: number;
  percentAgendamentos: number;
  percentAtendimentos: number;
}

export interface PorPeriodoItem {
  periodo: string; // e.g. "jul 2024", "jan 2025"
  dataISO: string;
  agendamentos: number;
  exames: number;
}

export interface PorTipoCompromissoItem {
  tipoCompromisso: string;
  aguardandoAtendimento: number;
  atendido: number;
  naoAtendido: number;
  percentAguardando: number;
  percentAtendido: number;
  percentNaoAtendido: number;
}

export interface PorVolumeExameItem {
  exame: string;
  quantidade: number;
}

export interface PorHorarioItem {
  horario: string;
  quantidade: number;
}

export interface PorDiaSemanaItem {
  diaSemana: string;
  quantidade: number;
}

export interface HeatmapItem {
  diaSemana: string;
  horarios: Record<string, number>;
  totalDia: number;
}

export interface PorSituacaoDetalhadaItem {
  situacao: string;
  quantidade: number;
}

export interface PorEmpresaItem {
  empresa: string;
  quantidade: number;
}

export interface PorSubgrupoItem {
  subgrupo: string;
  agendamentos: number;
  atendimentos: number;
}

export interface VolumetriaRegistroItem {
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

export interface VolumetriaDashboardResponse {
  kpis: VolumetriaKPIs;
  agendasDisponiveis: string[];
  porAgenda: PorAgendaItem[];
  porPeriodo: PorPeriodoItem[];
  porTipoCompromisso: PorTipoCompromissoItem[];
  porVolumeExame: PorVolumeExameItem[];
  porHorario: PorHorarioItem[];
  porDiaSemana: PorDiaSemanaItem[];
  heatmap: {
    horariosColunas: string[];
    dias: HeatmapItem[];
    totaisPorHorario: Record<string, number>;
    totalGeral: number;
  };
  porSituacaoDetalhada: PorSituacaoDetalhadaItem[];
  porEmpresa: PorEmpresaItem[];
  porSubgrupo: PorSubgrupoItem[];
}