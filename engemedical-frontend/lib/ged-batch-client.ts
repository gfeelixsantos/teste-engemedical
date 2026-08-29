import { NEST_GED_BATCH } from "@/config/constants";

export type GedBatchScope = "empresa" | "periodo" | "prontuario";
export type GedBatchTipo = "prontuario" | "aso";

export type GedBatchJobStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "partial";

export interface GedBatchJob {
  id: string;
  scope: GedBatchScope;
  createdAt: string;
  updatedAt: string;
  status: GedBatchJobStatus;
  requestedBy: {
    userId?: string;
    nome?: string;
    unidade?: string;
  };
  empresa: {
    codigoEmpresa: string;
    razaoSocial: string;
  };
  periodo?: {
    ano?: string;
    mes?: string;
  };
  totalFuncionarios: number;
  processedFuncionarios: number;
  succeededFuncionarios: number;
  failedFuncionarios: number;
  result?: {
    zipBlobName?: string;
    zipUrl?: string;
  };
  errors?: Array<{
    codigoProntuario?: string;
    funcionario?: string;
    message: string;
  }>;
  items: Array<{
    codigoProntuario: string;
    nome: string;
    status: "pending" | "completed" | "failed";
    error?: string;
  }>;
}

export interface CreateBatchRequest {
  /**
   * Escopo do lote:
   * - `empresa`: usa apenas `codigoEmpresa`.
   * - `periodo`: exige `periodo` (ano + mes).
   * - `prontuario`: exige `periodo` e exatamente um item em `prontuarios`.
   *
   * Opcional: quando omitido, o backend infere automaticamente o escopo.
   */
  scope?: GedBatchScope;
  codigoEmpresa: string;
  razaoSocial: string;
  periodo?: {
    ano?: string;
    mes?: string;
  };
  prontuarios?: Array<{
    codigoProntuario: string;
    nome: string;
  }>;
  tipo?: GedBatchTipo;
}

export async function createBatchJob(
  payload: CreateBatchRequest,
): Promise<GedBatchJob> {
  const res = await fetch(NEST_GED_BATCH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.message || `Erro ao criar job de lote (HTTP ${res.status})`,
    );
  }

  return res.json();
}

export async function getBatchJobStatus(
  jobId: string,
): Promise<GedBatchJob> {
  const res = await fetch(`${NEST_GED_BATCH}/${jobId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Erro ao consultar job (HTTP ${res.status})`,
    );
  }

  return res.json();
}

export function isJobTerminal(status: GedBatchJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "partial";
}

export function isJobActive(status: GedBatchJobStatus): boolean {
  return status === "pending" || status === "queued" || status === "processing";
}
