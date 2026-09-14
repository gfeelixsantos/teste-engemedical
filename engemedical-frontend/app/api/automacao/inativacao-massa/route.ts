import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { JWT } from "@/lib/jwt/jwt";
import { NEST_URL } from "@/config/constants";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";

async function context() {
  const ck = await cookies();
  return resolveAuthProxyContextFromTokens({ authToken: ck.get("auth_token")?.value, refreshToken: ck.get("refresh_token")?.value, verifyJwt: JWT.verifyJwt });
}

export async function GET() {
  try {
    const { bearerToken, authUser } = await context();
    if (!bearerToken || !authUser) return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    const headers = { Authorization: `Bearer ${bearerToken}` };
    const [companies, runs] = await Promise.all([
      fetch(`${NEST_URL}soc/empresas`, { headers }),
      fetch(`${NEST_URL}soc/inactivation/runs?limit=10`, { headers }),
    ]);
    if (!companies.ok || !runs.ok) return NextResponse.json({ message: "Falha ao carregar dados da inativação" }, { status: 502 });
    return NextResponse.json({ companies: await companies.json(), runs: await runs.json() });
  } catch (error) {
    return NextResponse.json({ message: "Falha ao carregar dados da inativação", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { bearerToken, authUser } = await context();
    if (!bearerToken) return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    const body = await req.json();
    if (body.action === "verify") {
      const codes = Array.isArray(body.companyCodes) ? body.companyCodes : [];
      if (!codes.length) return NextResponse.json({ message: "Selecione ao menos uma empresa" }, { status: 400 });
      const results = [];
      for (const companyCode of codes.slice(0, 10)) {
        const response = await fetch(`${NEST_URL}soc/inactivation/preview`, { method: "POST", headers: { Authorization: `Bearer ${bearerToken}`, "x-auth-user": JSON.stringify(authUser), "Content-Type": "application/json" }, body: JSON.stringify({ companyCodes: [String(companyCode)] }) });
        results.push({ companyCode: String(companyCode), ...(await response.json()) });
      }
      return NextResponse.json({ results });
    }
    if (body.action === "execute") {
      const codes = Array.isArray(body.companyCodes) ? body.companyCodes : [];
      if (!codes.length) return NextResponse.json({ message: "Selecione ao menos uma empresa" }, { status: 400 });
      const response = await fetch(`${NEST_URL}soc/inactivation/manual`, { method: "POST", headers: { Authorization: `Bearer ${bearerToken}`, "x-auth-user": JSON.stringify(authUser), "Content-Type": "application/json" }, body: JSON.stringify({ companyCodes: codes, dryRun: body.dryRun !== false }) });
      return NextResponse.json(await response.json(), { status: response.status });
    }
    if (body.action === "cancel" && body.executionId) {
      const response = await fetch(`${NEST_URL}soc/inactivation/${encodeURIComponent(body.executionId)}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${bearerToken}` } });
      return NextResponse.json(await response.json(), { status: response.status });
    }
    if (body.action !== "download-report" || !body.runId) return NextResponse.json({ message: "Ação inválida" }, { status: 400 });
    const response = await fetch(`${NEST_URL}soc/inactivation/runs/${encodeURIComponent(body.runId)}/report`, { headers: { Authorization: `Bearer ${bearerToken}` } });
    if (!response.ok) return NextResponse.json({ message: "Relatório ainda não disponível" }, { status: response.status });
    return new Response(await response.arrayBuffer(), { headers: { "Content-Type": response.headers.get("content-type") ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": response.headers.get("content-disposition") ?? 'attachment; filename="relatorio-inativacao.xlsx"' } });
  } catch (error) { return NextResponse.json({ message: "Falha ao baixar relatório", details: String(error) }, { status: 500 }); }
}
