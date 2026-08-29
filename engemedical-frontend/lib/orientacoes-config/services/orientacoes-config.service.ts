export interface IOrientacaoConfig {
  id: string;
  categoria: string;
  texto_tela: string;
  texto_email: string;
  libera_cliente: boolean;
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

export interface IOrientacaoConfigFormData {
  categoria: string;
  texto_tela: string;
  texto_email: string;
  libera_cliente?: boolean;
  ordem?: number;
}

export interface IOrientacaoConfigUpdate
  extends Partial<IOrientacaoConfigFormData> {
  ativo?: boolean;
}

/**
 * Catálogo embutido usado como fallback quando a API/Supabase estiver
 * indisponível — o fluxo de parecer médico não pode ficar sem opções.
 */
export const ORIENTACOES_FALLBACK: Omit<
  IOrientacaoConfig,
  "id" | "created_at" | "updated_at"
>[] = [
  {
    categoria: "Cardiologia",
    texto_tela: "HAS / Acompanhamento com cardiologista",
    texto_email:
      "O colaborador apresenta diagnóstico de HAS e/ou alteração cardiovascular, devendo manter tratamento e acompanhamento médico periódico com cardiologista.",
    libera_cliente: false,
    ativo: true,
    ordem: 1,
  },
  {
    categoria: "Visão / Oftalmologia",
    texto_tela: "Uso de óculos / Acompanhamento com oftalmologista",
    texto_email:
      "Recomendamos que o colaborador realize acompanhamento periódico com médico oftalmologista, mantendo o uso de óculos de grau durante as atividades laborais.",
    libera_cliente: true,
    ativo: true,
    ordem: 2,
  },
  {
    categoria: "Visão / Oftalmologia",
    texto_tela: "Visão monocular — apto com orientação",
    texto_email:
      "O colaborador apresenta visão monocular e está apto ao trabalho, devendo manter acompanhamento oftalmológico regular e respeitar as orientações médicas quanto a atividades que demandem acuidade visual.",
    libera_cliente: false,
    ativo: true,
    ordem: 3,
  },
  {
    categoria: "Trabalho em Altura",
    texto_tela: "Apto para trabalho em altura — utilizar cinto",
    texto_email:
      "O colaborador está apto para trabalho em altura, sendo obrigatório o uso do cinto de segurança e demais equipamentos de proteção individual (EPI) conforme NR-35.",
    libera_cliente: true,
    ativo: true,
    ordem: 4,
  },
  {
    categoria: "Trabalho em Altura",
    texto_tela: "Inapto para trabalho em altura",
    texto_email:
      "O colaborador está inapto para atividades em altura, devendo a empresa realocá-lo para atividades compatíveis com suas condições de saúde.",
    libera_cliente: false,
    ativo: true,
    ordem: 5,
  },
  {
    categoria: "Restrições Físicas",
    texto_tela: "Não carregar peso excessivo",
    texto_email:
      "O colaborador não deve realizar o transporte manual de cargas acima do limite recomendado, conforme avaliação médica.",
    libera_cliente: true,
    ativo: true,
    ordem: 6,
  },
  {
    categoria: "Acompanhamento / Retorno",
    texto_tela: "Retorno em 30 dias para reavaliação",
    texto_email:
      "O colaborador deverá retornar em 30 dias para reavaliação das condições de saúde e nova avaliação ocupacional.",
    libera_cliente: true,
    ativo: true,
    ordem: 7,
  },
  {
    categoria: "PCD / Deficiência",
    texto_tela: "PCD — deficiência auditiva",
    texto_email:
      "O colaborador se enquadra como Pessoa com Deficiência (PCD), apresentando deficiência auditiva, devendo ser realizadas as adequações necessárias no ambiente de trabalho.",
    libera_cliente: false,
    ativo: true,
    ordem: 8,
  },
];

/** Converte o catálogo fallback (sem id) em itens com id estável derivado do texto. */
export function orientacoesFallbackWithIds(): IOrientacaoConfig[] {
  return ORIENTACOES_FALLBACK.map((item, index) => ({
    ...item,
    id: `fallback-${index + 1}`,
  }));
}

/** Agrupa orientações por categoria, preservando a ordem. */
export function groupOrientacoesByCategoria(
  orientacoes: IOrientacaoConfig[],
): { categoria: string; items: IOrientacaoConfig[] }[] {
  const map = new Map<string, IOrientacaoConfig[]>();
  for (const orientacao of orientacoes) {
    const key = orientacao.categoria || "Geral";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(orientacao);
  }
  return Array.from(map.entries()).map(([categoria, items]) => ({
    categoria,
    items: items.sort((a, b) => a.ordem - b.ordem),
  }));
}

export async function fetchOrientacoesConfig(): Promise<IOrientacaoConfig[]> {
  const res = await fetch("/api/orientacoes-config", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Falha ao carregar orientações de parecer");
  return res.json();
}

export async function createOrientacaoConfig(
  data: IOrientacaoConfigFormData,
): Promise<IOrientacaoConfig> {
  const res = await fetch("/api/orientacoes-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: "Erro ao criar orientação de parecer" }));
    throw new Error(err.message || "Erro ao criar orientação de parecer");
  }
  return res.json();
}

export async function updateOrientacaoConfig(
  id: string,
  data: IOrientacaoConfigUpdate,
): Promise<IOrientacaoConfig> {
  const res = await fetch(`/api/orientacoes-config/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: "Erro ao atualizar orientação de parecer" }));
    throw new Error(err.message || "Erro ao atualizar orientação de parecer");
  }
  return res.json();
}

export async function deleteOrientacaoConfig(
  id: string,
  options: { password: string; motivo: string },
): Promise<void> {
  const res = await fetch(`/api/orientacoes-config/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...options }),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: "Erro ao excluir orientação de parecer" }));
    throw new Error(err.message || "Erro ao excluir orientação de parecer");
  }
}
