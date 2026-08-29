export interface IRiscoConfig {
  id: string;
  tipo: string;
  descricao: string;
  codigos: string[];
  grupo: string;
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

export interface IRiscoConfigFormData {
  tipo: string;
  descricao: string;
  codigos: string[];
  grupo: string;
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

export const GRUPOS_RISCOS = [
  { value: 'FISICOS', label: 'Físicos' },
  { value: 'QUIMICOS', label: 'Químicos' },
  { value: 'BIOLOGICOS', label: 'Biológicos' },
  { value: 'ACIDENTES', label: 'Acidentes' },
  { value: 'ERGONOMICOS', label: 'Ergonômicos' },
  { value: 'INESPECIFICOS', label: 'Inespecíficos' },
] as const;

export async function fetchRiscosConfig(): Promise<IRiscoConfig[]> {
  const res = await fetch('/api/riscos-config');
  if (!res.ok) throw new Error('Falha ao carregar configurações de risco');
  return res.json();
}

export async function createRiscoConfig(data: IRiscoConfigFormData): Promise<IRiscoConfig> {
  const res = await fetch('/api/riscos-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao criar configuração de risco' }));
    throw new Error(err.message || 'Erro ao criar configuração de risco');
  }
  return res.json();
}

export async function updateRiscoConfig(id: string, data: Partial<IRiscoConfigFormData & { ativo: boolean }>): Promise<IRiscoConfig> {
  const res = await fetch(`/api/riscos-config/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao atualizar configuração de risco' }));
    throw new Error(err.message || 'Erro ao atualizar configuração de risco');
  }
  return res.json();
}

export async function deleteRiscoConfig(id: string): Promise<void> {
  const res = await fetch(`/api/riscos-config/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao excluir configuração de risco' }));
    throw new Error(err.message || 'Erro ao excluir configuração de risco');
  }
}
