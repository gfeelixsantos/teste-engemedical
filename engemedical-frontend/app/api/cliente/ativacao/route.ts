import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";
import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";

const EMPRESA_PATTERN = /^\d{3,10}$/;

async function auth() {
  const store = await cookies();
  return resolveAuthProxyContextFromTokens({ authToken: store.get("auth_token")?.value, refreshToken: store.get("refresh_token")?.value, verifyJwt: JWT.verifyJwt });
}

async function proxy(request: Request, path: string, init: RequestInit = {}) {
  const context = await auth();
  if (!context.bearerToken) return NextResponse.json({ message: "Sessão ausente ou inválida." }, { status: 401 });
  const response = await fetch(`${NEST_URL}cliente/ativacao${path}`, { ...init, headers: { Authorization: `Bearer ${context.bearerToken}`, ...(init.headers || {}) }, cache: "no-store" });
  return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
}

function company(request: Request, body?: Record<string, unknown>) {
  const value = new URL(request.url).searchParams.get("empresa")?.trim() || String(body?.empresa ?? "").trim();
  return EMPRESA_PATTERN.test(value) ? value : null;
}

export async function GET(request: Request) {
  const empresa = company(request);
  if (!empresa) return NextResponse.json({ message: "empresa é obrigatória e deve conter apenas 3 a 10 dígitos" }, { status: 400 });
  return proxy(request, `?empresa=${encodeURIComponent(empresa)}`);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "start";
  if (action === "start") {
    const body = await request.json().catch(() => ({}));
    const empresa = company(request, body);
    if (!empresa) return NextResponse.json({ message: "empresa inválida" }, { status: 400 });
    return proxy(request, `/start?empresa=${encodeURIComponent(empresa)}`, { method: "POST" });
  }
  if (action === "appointment" || action === "contact" || action === "company") {
    const body = await request.json().catch(() => ({}));
    const empresa = company(request, body);
    const id = String(body.id || "");
    if (!empresa || !id) return NextResponse.json({ message: "Ativação inválida" }, { status: 400 });
    return proxy(request, `/${encodeURIComponent(id)}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, empresa }) });
  }
  const form = await request.formData();
  const id = String(form.get("id") || "");
  const empresa = String(form.get("empresa") || "");
  const file = form.get("file");
  if (!id || !EMPRESA_PATTERN.test(empresa) || !(file instanceof File)) return NextResponse.json({ message: "Arquivo ou ativação inválidos" }, { status: 400 });
  const payload = new FormData();
  payload.append("file", file);
  return proxy(request, `/${encodeURIComponent(id)}/employee-sheet?empresa=${encodeURIComponent(empresa)}`, { method: "POST", body: payload });
}
