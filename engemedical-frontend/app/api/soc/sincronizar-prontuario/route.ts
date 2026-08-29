import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { JWT } from "@/lib/jwt/jwt";
import { NEST_URL } from "@/config/constants";

export async function POST(req: Request) {
  try {
    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;

    if (!authToken) {
      return NextResponse.json(
        { message: "Token de autenticacao ausente" },
        { status: 401 },
      );
    }

    const payload = await JWT.verifyJwt(authToken);

    if (!payload) {
      return NextResponse.json(
        { message: "Token invalido ou expirado" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const response = await fetch(`${NEST_URL}soc/sincronizar-prontuario`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
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
    console.error("[BFF:soc/sincronizar-prontuario]", error);

    return NextResponse.json(
      { message: "Falha ao processar requisicao interna." },
      { status: 500 },
    );
  }
}
