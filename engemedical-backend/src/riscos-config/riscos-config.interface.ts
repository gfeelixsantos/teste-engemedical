export const GRUPOS_RISCOS = ['FISICOS', 'QUIMICOS', 'BIOLOGICOS', 'ACIDENTES', 'ERGONOMICOS'] as const;
export type GrupoRisco = typeof GRUPOS_RISCOS[number];

export interface IRiscoConfigResponse {
  id: string;
  tipo: string;
  descricao: string;
  codigos: string[];
  grupo: GrupoRisco;
  parecer_opcoes?: string[];
  observacao?: string;
  ativo: boolean;
  // Perigo integrado (1:1)
  perigo_nome?: string;
  perigo_tipo_exposicao?: string;
  perigo_fonte_geradora?: string;
  perigo_trajetoria_acao?: string;
  perigo_tecnica_utilizada?: string;
  perigo_possiveis_danos?: string;
  perigo_medidas_administrativas?: string;
  perigo_epc_eficaz?: boolean;
  perigo_epc_descricao?: string;
  perigo_epi_eficaz?: boolean;
  perigo_epi_descricao?: string;
  perigo_acoes_necessarias?: string;
  perigo_criterio_monitoracao?: string;
  perigo_observacao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IRiscoConfigCreate {
  tipo: string;
  descricao: string;
  codigos: string[];
  grupo: GrupoRisco;
  parecer_opcoes?: string[];
  observacao?: string;
  // Perigo integrado
  perigo_nome?: string;
  perigo_tipo_exposicao?: string;
  perigo_fonte_geradora?: string;
  perigo_trajetoria_acao?: string;
  perigo_tecnica_utilizada?: string;
  perigo_possiveis_danos?: string;
  perigo_medidas_administrativas?: string;
  perigo_epc_eficaz?: boolean;
  perigo_epc_descricao?: string;
  perigo_epi_eficaz?: boolean;
  perigo_epi_descricao?: string;
  perigo_acoes_necessarias?: string;
  perigo_criterio_monitoracao?: string;
  perigo_observacao?: string;
}

export interface IRiscoConfigUpdate {
  tipo?: string;
  descricao?: string;
  codigos?: string[];
  grupo?: GrupoRisco;
  parecer_opcoes?: string[];
  observacao?: string;
  ativo?: boolean;
  // Perigo integrado
  perigo_nome?: string;
  perigo_tipo_exposicao?: string;
  perigo_fonte_geradora?: string;
  perigo_trajetoria_acao?: string;
  perigo_tecnica_utilizada?: string;
  perigo_possiveis_danos?: string;
  perigo_medidas_administrativas?: string;
  perigo_epc_eficaz?: boolean;
  perigo_epc_descricao?: string;
  perigo_epi_eficaz?: boolean;
  perigo_epi_descricao?: string;
  perigo_acoes_necessarias?: string;
  perigo_criterio_monitoracao?: string;
  perigo_observacao?: string;
}
