import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";
import { resolveAuthProxyContextFromTokens } from "../_authContext.mjs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined;
    const userAgent = req.headers.get("user-agent") ?? undefined;

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
        { message: "Autenticacao necessaria" },
        { status: 401 },
      );
    }

    const response = await fetch(`${NEST_URL}audit-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
        "x-auth-user": JSON.stringify(authUser),
        "x-forwarded-for": ip ?? "",
        "user-agent": userAgent ?? "",
      },
      body: JSON.stringify({
        ...body,
        userCodigo: authUser.codigo,
        userNome: authUser.nome ?? authUser.cpf,
        userPerfil: authUser.perfil,
        ip: body.ip ?? ip,
        userAgent: body.userAgent ?? userAgent,
        unidade: body.unidade ?? authUser.unidade ?? "MASTER",
        pacienteCodigo: body.pacienteCodigo ?? null,
        recursoId: body.recursoId ?? null,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        {
          message: `Erro ao registrar auditoria: ${response.status}`,
          details: errorBody,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BFF:audit-log] Erro:", error);
    return NextResponse.json(
      { message: "Falha ao registrar evento de auditoria." },
      { status: 500 },
    );
  }
}
