import { AuditFilterParams, AuditLogsResponse } from "./types";

const AUDIT_LOGS_BFF_URL = "/api/audit-logs";

export class AuditLogsRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuditLogsRequestError";
    this.status = status;
  }
}

export async function fetchAuditLogs(
  params: AuditFilterParams,
): Promise<AuditLogsResponse> {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const url = `${AUDIT_LOGS_BFF_URL}?${searchParams.toString()}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new AuditLogsRequestError(
      body?.message ?? `Erro ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<AuditLogsResponse>;
}
