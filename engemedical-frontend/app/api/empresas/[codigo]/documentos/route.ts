import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { JWT } from "@/lib/jwt/jwt";
import { NEST_URL } from "@/config/constants";
import { resolveAuthProxyContextFromTokens } from "../../../_authContext.mjs";

export async function POST(
  req: Request,
  context: { params: Promise<{ codigo: string }> },
) {
  try {
    const { codigo } = await context.params;
    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;
    const refreshToken = ck.get("refresh_token")?.value;

    const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt: JWT.verifyJwt,
    });

    if (!bearerToken || !authUser) {
      return NextResponse.json(
        { message: "Token de autenticacao ausente ou expirado" },
        { status: 401 },
      );
    }

    if (authUser.perfil !== "MASTER") {
      return NextResponse.json(
        { message: "Acesso negado (requer perfil MASTER)" },
        { status: 403 },
      );
    }

    const formData = await req.formData();

    const response = await fetch(
      `${NEST_URL}empresas/${codigo}/documentos`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "x-auth-user": JSON.stringify(authUser),
        },
        body: formData,
      },
    );

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[BFF:empresas/documentos/POST]", error);
    return NextResponse.json(
      { message: "Falha ao processar requisicao interna." },
      { status: 500 },
    );
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ codigo: string }> },
) {
  try {
    const { codigo } = await context.params;
    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;
    const refreshToken = ck.get("refresh_token")?.value;

    const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt: JWT.verifyJwt,
    });

    if (!bearerToken || !authUser) {
      return NextResponse.json(
        { message: "Token de autenticacao ausente ou expirado" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const categoria = url.searchParams.get("categoria") || "";

    let nestUrl = `${NEST_URL}empresas/${codigo}/documentos`;
    if (categoria) nestUrl += `?categoria=${encodeURIComponent(categoria)}`;

    const response = await fetch(nestUrl, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "x-auth-user": JSON.stringify(authUser),
      },
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
    console.error("[BFF:empresas/documentos/GET]", error);
    return NextResponse.json(
      { message: "Falha ao processar requisicao interna." },
      { status: 500 },
    );
  }
}
