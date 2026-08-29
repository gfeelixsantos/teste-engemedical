import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { JWT } from "@/lib/jwt/jwt";
import { NEST_URL } from "@/config/constants";
import { resolveAuthProxyContextFromTokens } from "../../../../_authContext.mjs";

async function getAuthContext() {
  const ck = await cookies();
  const authToken = ck.get("auth_token")?.value;
  const refreshToken = ck.get("refresh_token")?.value;

  const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({
    authToken,
    refreshToken,
    verifyJwt: JWT.verifyJwt,
  });

  if (!bearerToken || !authUser) {
    return { error: NextResponse.json(
      { message: "Token de autenticacao ausente ou expirado" },
      { status: 401 },
    )};
  }

  if (authUser.perfil !== "MASTER") {
    return { error: NextResponse.json(
      { message: "Acesso negado (requer perfil MASTER)" },
      { status: 403 },
    )};
  }

  return { bearerToken, authUser };
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ codigo: string; documentoId: string }> },
) {
  try {
    const { codigo, documentoId } = await context.params;
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;

    const response = await fetch(
      `${NEST_URL}empresas/${codigo}/documentos/${documentoId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.bearerToken}`,
          "x-auth-user": JSON.stringify(auth.authUser),
        },
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
    console.error("[BFF:empresas/documentos/DELETE]", error);
    return NextResponse.json(
      { message: "Falha ao processar requisicao interna." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ codigo: string; documentoId: string }> },
) {
  try {
    const { codigo, documentoId } = await context.params;
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;

    const formData = await req.formData();

    const response = await fetch(
      `${NEST_URL}empresas/${codigo}/documentos/${documentoId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.bearerToken}`,
          "x-auth-user": JSON.stringify(auth.authUser),
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
    console.error("[BFF:empresas/documentos/PATCH]", error);
    return NextResponse.json(
      { message: "Falha ao processar requisicao interna." },
      { status: 500 },
    );
  }
}
