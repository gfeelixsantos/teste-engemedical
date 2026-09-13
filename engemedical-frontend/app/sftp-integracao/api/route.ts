import { SFTP_CLIENT_KEY } from "../types";
import type { NextRequest } from "next/server";

/* ── Configuração ─────────────────────────────────────── */
const configuredBackendUrl =
  process.env.SFTP_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_NEST_URL_PRODUCTION
    : process.env.NEXT_PUBLIC_NEST_URL_DEVELOP) ||
  "http://127.0.0.1:3333";
const BACKEND_URL = configuredBackendUrl.replace(/\/+$/, "");
const INTERNAL_TOKEN = process.env.INTERNAL_WORKER_TOKEN;

function normalizeCollection<T>(payload: unknown, key: string) {
  if (Array.isArray(payload)) return { items: payload as T[], total: payload.length };
  const value = payload as Record<string, unknown> | null;
  const items = Array.isArray(value?.[key]) ? (value[key] as T[]) : [];
  return { items, total: typeof value?.total === "number" ? value.total : items.length };
}

/* ─── API Handlers ─────────────────────────────────────── */

// GET /api/sftp-integracao — Retorna dados do dashboard SFTP
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || "10";

    // Busca KPIs do backend (via proxy para NestJS)
    const kpisResponse = await fetch(
      `${BACKEND_URL}/internal/sftp-integrator/${SFTP_CLIENT_KEY}/runs?limit=1`,
      {
        headers: {
          "x-internal-token": INTERNAL_TOKEN || "",
        },
      },
    );

    if (!kpisResponse.ok) {
      return Response.json({ error: "Falha ao buscar dados SFTP", details: `Backend respondeu ${kpisResponse.status}` }, { status: kpisResponse.status });
    }
    const kpisRuns = normalizeCollection<{ createdAt?: string; status?: string }>(await kpisResponse.json(), "runs");

    // Busca arquivos
    const filesResponse = await fetch(
      `${BACKEND_URL}/internal/sftp-integrator/${SFTP_CLIENT_KEY}/files?limit=${limit}`,
      {
        headers: {
          "x-internal-token": INTERNAL_TOKEN || "",
        },
      },
    );

    if (!filesResponse.ok) {
      return Response.json({ error: "Falha ao buscar dados SFTP", details: `Backend respondeu ${filesResponse.status}` }, { status: filesResponse.status });
    }
    const filesData = normalizeCollection(await filesResponse.json(), "files");

    // Busca runs com mais detalhes
    const runsResponse = await fetch(
      `${BACKEND_URL}/internal/sftp-integrator/${SFTP_CLIENT_KEY}/runs?limit=${limit}`,
      {
        headers: {
          "x-internal-token": INTERNAL_TOKEN || "",
        },
      },
    );

    if (!runsResponse.ok) {
      return Response.json({ error: "Falha ao buscar dados SFTP", details: `Backend respondeu ${runsResponse.status}` }, { status: runsResponse.status });
    }
    const runsData = normalizeCollection(await runsResponse.json(), "runs");

    const scheduleResponse = await fetch(
      `${BACKEND_URL}/sftp/sftp-horarios?clientKey=${encodeURIComponent(SFTP_CLIENT_KEY)}`,
      { headers: { "x-internal-token": INTERNAL_TOKEN || "" } },
    );
    if (!scheduleResponse.ok) {
      return Response.json({ error: "Falha ao buscar agendamento SFTP", details: `Backend respondeu ${scheduleResponse.status}` }, { status: scheduleResponse.status });
    }
    const schedulePayload = await scheduleResponse.json();
    const schedule = schedulePayload.horarios?.find((item: { clientKey?: string }) => item.clientKey === SFTP_CLIENT_KEY) ?? schedulePayload.horarios?.[0];
    if (!schedule) {
      return Response.json({ error: "Agendamento SFTP não configurado" }, { status: 503 });
    }

    return Response.json({
      kpis: {
        totalExecutions: kpisRuns.total,
        totalFiles: filesData.total,
        lastExecutionDate: kpisRuns.items[0]?.createdAt || null,
        lastExecutionTime: kpisRuns.items[0]?.createdAt || null,
        lastExecutionStatus: kpisRuns.items[0]?.status || null,
        nextScheduledExecution: schedule.nextExecution || null,
        cronEnabled: schedule.cronEnabled,
      },
      files: filesData.items,
      runs: runsData.items,
      schedule,
    });
  } catch (error) {
    console.error("SFTP API error:", error);
    return Response.json(
      { error: "Falha ao buscar dados SFTP", details: String(error) },
      { status: 500 },
    );
  }
}

// POST /api/sftp-integracao/pull — Dispara pull de arquivos
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "pull") {
      const response = await fetch(
        `${BACKEND_URL}/internal/sftp-integrator/${SFTP_CLIENT_KEY}/pull`,
        {
          method: "POST",
          headers: {
            "x-internal-token": INTERNAL_TOKEN || "",
            "Content-Type": "application/json",
          },
        },
      );

      return Response.json(await response.json(), { status: response.status });
    }

    if (action === "list-files") {
      const response = await fetch(
        `${BACKEND_URL}/internal/sftp-integrator/${SFTP_CLIENT_KEY}/files?limit=20`,
        {
          headers: {
            "x-internal-token": INTERNAL_TOKEN || "",
          },
        },
      );

      return Response.json(await response.json(), { status: response.status });
    }

    if (action === "download-file") {
      const { fileId } = body;
      const response = await fetch(
        `${BACKEND_URL}/internal/sftp-integrator/${SFTP_CLIENT_KEY}/files/${fileId}/download`,
        {
          headers: {
            "x-internal-token": INTERNAL_TOKEN || "",
          },
        },
      );

      if (!response.ok) {
        return Response.json(
          { error: "Falha ao baixar arquivo" },
          { status: 500 },
        );
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      return new Response(arrayBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="sftp-grupo-tora.xlsx"`,
        },
      });
    }

    if (action === "download-report") {
      const { runId } = body;
      const response = await fetch(
        `${BACKEND_URL}/internal/sftp-integrator/${SFTP_CLIENT_KEY}/runs/${runId}/report`,
        {
          headers: { "x-internal-token": INTERNAL_TOKEN || "" },
        },
      );
      if (!response.ok)
        return Response.json(
          { error: "Relatório ainda não disponível" },
          { status: response.status },
        );
      return new Response(await response.arrayBuffer(), {
        headers: {
          "Content-Type":
            response.headers.get("content-type") ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            response.headers.get("content-disposition") ||
            'attachment; filename="relatorio-sftp.xlsx"',
        },
      });
    }

    return Response.json({ error: "Ação não implementada" }, { status: 400 });
  } catch (error) {
    console.error("SFTP POST error:", error);
    return Response.json(
      { error: "Falha na operação SFTP", details: String(error) },
      { status: 500 },
    );
  }
}
