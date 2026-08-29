export interface IGrupo {
  id: string;
  nome: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function fetchGruposFromAPI(): Promise<IGrupo[]> {
  const res = await fetch('/api/grupos');
  if (!res.ok) throw new Error('Falha ao carregar grupos');
  return res.json();
}

export async function createGrupo(data: { nome: string }): Promise<IGrupo> {
  const res = await fetch('/api/grupos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao criar grupo' }));
    throw new Error(err.message || 'Erro ao criar grupo');
  }
  return res.json();
}

export async function updateGrupo(id: string, data: Partial<{ nome: string; ativo: boolean }>): Promise<IGrupo> {
  const res = await fetch(`/api/grupos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao atualizar grupo' }));
    throw new Error(err.message || 'Erro ao atualizar grupo');
  }
  return res.json();
}

export async function deleteGrupo(id: string): Promise<void> {
  const res = await fetch(`/api/grupos/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao excluir grupo' }));
    throw new Error(err.message || 'Erro ao excluir grupo');
  }
}
