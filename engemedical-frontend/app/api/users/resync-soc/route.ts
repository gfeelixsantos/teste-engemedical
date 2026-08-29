import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";
import { SOC } from "@/lib/soc/services/soc";

export async function POST(req: Request) {
  try {
    const { codigo } = await req.json();
    if (!codigo) {
      return NextResponse.json({ message: "Código é obrigatório." }, { status: 400 });
    }

    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;
    const refreshToken = ck.get("refresh_token")?.value;
    const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt: JWT.verifyJwt,
    });

    if (!authUser) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const cadastroPessoas = await SOC.ExportaDadosCadastroPessoas();
    if (!cadastroPessoas) {
      return NextResponse.json({ message: "Falha ao consultar SOC." }, { status: 502 });
    }

    const socUser = cadastroPessoas.find((p) => p.CODIGO === codigo);
    if (!socUser) {
      return NextResponse.json({ message: "Código não encontrado no SOC." }, { status: 404 });
    }

    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
      "x-auth-user": JSON.stringify(authUser),
    });

    const response = await fetch(`${NEST_URL}users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        codigo: socUser.CODIGO,
        cpf: socUser.CPF,
        nome: socUser.NOME,
        email: socUser.EMAIL || null,
        telefone: socUser.TELEFONE_COM || null,
        perfil: socUser.REGISTRO_FUNCIONAL || "CONVIDADO",
        conselho: socUser.CONSELHO_CLASSE || null,
        uf_conselho: socUser.UF_CONSELHO || null,
      }),
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    console.error("[BFF:users/resync-soc]", error);
    return NextResponse.json({ message: "Falha ao re-sincronizar com SOC." }, { status: 500 });
  }
}
