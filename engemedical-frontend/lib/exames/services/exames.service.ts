export interface IExame {
  id: string;
  grupo: string;
  nome: string;
  codigos: string[];
  status_finalizacao: 'FINALIZADO' | 'AGUARDANDO_RESULTADO';
  enviar_para_azure: boolean;
  requer_assinatura: boolean;
  template_key: string | null;
  estimativa_minutos: number | null;
  preparacao: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IExameFormData {
  grupo: string;
  nome: string;
  codigos: string[];
  status_finalizacao: 'FINALIZADO' | 'AGUARDANDO_RESULTADO';
  enviar_para_azure: boolean;
  requer_assinatura: boolean;
  template_key: string | null;
  estimativa_minutos: number | null;
  preparacao: string | null;
}

let cachedExames: IExame[] | null = null;
let cachedExamesPromise: Promise<IExame[]> | null = null;

export function invalidateExamesCache(): void {
  cachedExames = null;
  cachedExamesPromise = null;
}

export async function fetchExames(): Promise<IExame[]> {
  if (cachedExames) {
    return cachedExames;
  }
  if (cachedExamesPromise) {
    return cachedExamesPromise;
  }
  cachedExamesPromise = (async () => {
    try {
      const res = await fetch('/api/exames');
      if (!res.ok) throw new Error('Falha ao carregar exames');
      cachedExames = await res.json();
      return cachedExames!;
    } catch (error) {
      cachedExamesPromise = null;
      throw error;
    }
  })();
  return cachedExamesPromise;
}

export async function fetchExameById(id: string): Promise<IExame> {
  const res = await fetch(`/api/exames/${id}`);
  if (!res.ok) throw new Error('Exame não encontrado');
  return res.json();
}

export async function fetchGrupos(): Promise<string[]> {
  const res = await fetch('/api/exames/grupos');
  if (!res.ok) throw new Error('Falha ao carregar grupos');
  return res.json();
}

export async function createExame(data: IExameFormData): Promise<IExame> {
  invalidateExamesCache();
  const res = await fetch('/api/exames', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao criar exame' }));
    throw new Error(err.message || 'Erro ao criar exame');
  }
  return res.json();
}

export async function updateExame(id: string, data: Partial<IExameFormData & { ativo: boolean }>): Promise<IExame> {
  invalidateExamesCache();
  const res = await fetch(`/api/exames/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao atualizar exame' }));
    throw new Error(err.message || 'Erro ao atualizar exame');
  }
  return res.json();
}

export async function deleteExame(id: string): Promise<void> {
  invalidateExamesCache();
  const res = await fetch(`/api/exames/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao excluir exame' }));
    throw new Error(err.message || 'Erro ao excluir exame');
  }
}
