import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";

import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";

const EMPRESA_PATTERN = /^\d{3,10}$/;

export async function GET(request: Request): Promise<NextResponse> {
  const empresa = new URL(request.url).searchParams.get("empresa")?.trim();

  if (!empresa || !EMPRESA_PATTERN.test(empresa)) {
    return NextResponse.json(
      { message: "empresa é obrigatória e deve conter apenas 3 a 10 dígitos" },
      { status: 400 },
    );
  }

  try {
    const cookieStore = await cookies();
    const authContext = await resolveAuthProxyContextFromTokens({
      authToken: cookieStore.get("auth_token")?.value,
      refreshToken: cookieStore.get("refresh_token")?.value,
      verifyJwt: JWT.verifyJwt,
    });

    if (!authContext.bearerToken) {
      return NextResponse.json(
        { message: "Sessão ausente ou inválida." },
        { status: 401 },
      );
    }

    const targetUrl = new URL(`${NEST_URL}cliente/ativacao`);

    targetUrl.searchParams.set("empresa", empresa);
    const response = await fetch(targetUrl, {
      headers: { Authorization: `Bearer ${authContext.bearerToken}` },
      cache: "no-store",
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Falha ao consultar a Central de Ativação." },
      { status: 502 },
    );
  }
}
