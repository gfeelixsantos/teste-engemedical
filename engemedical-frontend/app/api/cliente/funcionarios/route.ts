import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";

import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";

const ALLOWED_QUERY_PARAMETERS = [
  "empresa",
  "page",
  "limit",
  "q",
  "status",
] as const;

const EMPRESA_PATTERN = /^\d{3,10}$/;

export async function GET(request: Request): Promise<NextResponse> {
  const incomingUrl = new URL(request.url);
  const empresa = incomingUrl.searchParams.get("empresa");

  if (!empresa || !EMPRESA_PATTERN.test(empresa)) {
    return NextResponse.json(
      { message: "empresa é obrigatória e deve conter apenas 3 a 10 dígitos" },
      { status: 400 },
    );
  }

  try {
    const cookieStore = await cookies();
    const { bearerToken } = await resolveAuthProxyContextFromTokens({
      authToken: cookieStore.get("auth_token")?.value,
      refreshToken: cookieStore.get("refresh_token")?.value,
      verifyJwt: JWT.verifyJwt,
    });

    const targetUrl = new URL(`${NEST_URL}cliente/funcionarios`);
    const targetSearchParams = new URLSearchParams();

    for (const parameter of ALLOWED_QUERY_PARAMETERS) {
      const value = incomingUrl.searchParams.get(parameter);
      if (value !== null) targetSearchParams.set(parameter, value);
    }
    targetUrl.search = targetSearchParams.toString();

    const headers = new Headers();
    if (bearerToken) headers.set("Authorization", `Bearer ${bearerToken}`);

    const response = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Falha ao consultar funcionários." },
      { status: 502 },
    );
  }
}
