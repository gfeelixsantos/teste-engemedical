export interface IPrestador {
  id: string;
  nome: string;
  unidade: string;
  endereco: string | null;
  horario: string | null;
  referencia: string | null;
  grupos: string[];
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IPrestadorFormData {
  nome: string;
  unidade: string;
  endereco?: string | null;
  horario?: string | null;
  referencia?: string | null;
  grupos?: string[];
}

export async function fetchPrestadores(): Promise<IPrestador[]> {
  const res = await fetch('/api/prestadores');
  if (!res.ok) throw new Error('Falha ao carregar prestadores');
  return res.json();
}

export async function fetchPrestadorById(id: string): Promise<IPrestador> {
  const res = await fetch(`/api/prestadores/${id}`);
  if (!res.ok) throw new Error('Prestador não encontrado');
  return res.json();
}

export async function createPrestador(data: IPrestadorFormData): Promise<IPrestador> {
  const res = await fetch('/api/prestadores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao criar prestador' }));
    throw new Error(err.message || 'Erro ao criar prestador');
  }
  return res.json();
}

export async function updatePrestador(id: string, data: Partial<IPrestadorFormData & { ativo: boolean }>): Promise<IPrestador> {
  const res = await fetch(`/api/prestadores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao atualizar prestador' }));
    throw new Error(err.message || 'Erro ao atualizar prestador');
  }
  return res.json();
}

export async function deletePrestador(id: string): Promise<void> {
  const res = await fetch(`/api/prestadores/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao excluir prestador' }));
    throw new Error(err.message || 'Erro ao excluir prestador');
  }
}
