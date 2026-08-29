import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";
import { resolveAuthProxyContextFromTokens } from "../_authContext.mjs";

export async function GET(): Promise<NextResponse> {
  try {
    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;
    const refreshToken = ck.get("refresh_token")?.value;
    const { authUser } = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt: JWT.verifyJwt,
    });

    if (!authUser?.codigo) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const response = await fetch(`${NEST_URL}users/${authUser.codigo}/consent`, {
      headers: { "Content-Type": "application/json" },
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[BFF:consent:GET]", error);
    return NextResponse.json({ message: "Falha ao verificar consentimento." }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;
    const refreshToken = ck.get("refresh_token")?.value;
    const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt: JWT.verifyJwt,
    });

    const headers = new Headers({
      "Content-Type": "application/json",
    });

    if (bearerToken) {
      headers.set("Authorization", `Bearer ${bearerToken}`);
    }

    if (authUser) {
      headers.set("x-auth-user", JSON.stringify(authUser));
    }

    const response = await fetch(`${NEST_URL}users/consent`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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
    console.error("[BFF:consent]", error);

    return NextResponse.json(
      { message: "Falha ao registrar consentimento via BFF." },
      { status: 500 },
    );
  }
}
