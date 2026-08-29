import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { JWT } from "@/lib/jwt/jwt";
import { NEST_URL } from "@/config/constants";
import { resolveAuthProxyContextFromTokens } from "../_authContext.mjs";

async function resolveAuthContext(): Promise<{
  bearerToken?: string;
  authUser?: Record<string, unknown>;
}> {
  const ck = await cookies();
  const authToken = ck.get("auth_token")?.value;
  const refreshToken = ck.get("refresh_token")?.value;

  return resolveAuthProxyContextFromTokens({
    authToken,
    refreshToken,
    verifyJwt: JWT.verifyJwt,
  });
}

export async function proxySchedulingRequest(
  req: Request,
  endpoint: string,
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { bearerToken, authUser } = await resolveAuthContext();
    let requestBody = body;

    const headers = new Headers({
      "Content-Type": "application/json",
    });

    if (bearerToken) {
      headers.set("Authorization", `Bearer ${bearerToken}`);
    }

    if (authUser) {
      headers.set("x-auth-user", JSON.stringify(authUser));

      if (body && typeof body === "object") {
        if (endpoint === "schedulings/exame/update" && !body?.profissional) {
          requestBody = {
            ...body,
            profissional: authUser,
          };
        }

        if (endpoint === "schedulings/finish" && !body?.user) {
          requestBody = {
            ...body,
            user: authUser,
          };
        }
      }
    }

    const response = await fetch(`${NEST_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error(`[BFF:${endpoint}]`, error);

    return NextResponse.json(
      { message: "Falha ao processar requisicao interna." },
      { status: 500 },
    );
  }
}
