import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";
import { UserService } from "@/lib/user/services/user.service";
import { HttpCodes } from "@/shared/responses/HttpCodes";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";
import { createAuditRequestId } from "@/lib/audit-log/request-id.mjs";

export async function DELETE(request: Request) {
  try {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ message: "Payload inválido." }, { status: 400 });
    }

    const id = payload?.id;
    const motivo = typeof payload?.motivo === "string" ? payload.motivo.trim() : "";
    const password = typeof payload?.password === "string" ? payload.password.trim() : "";

    if (!id || !motivo || !password) {
      return NextResponse.json(
        { message: "ID, motivo e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;
    const refreshToken = ck.get("refresh_token")?.value;
    const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt: JWT.verifyJwt,
    });

    if (!authUser?.cpf) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const reauth = await UserService.reauthenticate({ cpf: authUser.cpf, password });
    if (reauth.status !== HttpCodes.OK) {
      return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
    }

    const requestId = createAuditRequestId("req");

    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
      "x-auth-user": JSON.stringify(authUser),
      "x-request-id": requestId,
      "x-reauthenticated": "true",
    });

    const response = await fetch(`${NEST_URL}units/${id}`, {
      method: "DELETE",
      headers,
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    console.error("[BFF:units/delete]", error);
    return NextResponse.json(
      { message: "Falha ao excluir unidade." },
      { status: 500 },
    );
  }
}
