import { NextRequest, NextResponse } from "next/server";

import { IUserRegister } from "@/lib/user/interfaces/IUser";
import { UserService } from "@/lib/user/services/user.service";
import { userRegisterSchema } from "@/lib/user/zod/schemas";
import { NEST_URL } from "@/config/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.consentimento !== true) {
      return NextResponse.json(
        { status: 400, message: "Aceite dos termos de uso é obrigatório para o registro." },
        { status: 400 },
      );
    }

    const data: IUserRegister = userRegisterSchema.parse(body);
    const response = await UserService.register(data);

    if (response.status === 201 && response.data?.codigo) {
      const tipos = ["TERMOS_DE_USO", "POLITICA_PRIVACIDADE"];

      for (const tipo of tipos) {
        try {
          await fetch(`${NEST_URL}users/consent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tipo,
              versao: "1.0",
              aceito: true,
              user_codigo: response.data.codigo,
            }),
          });
        } catch (err) {
          console.error(`Erro ao registrar consentimento ${tipo}:`, err);
        }
      }
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[BFF:register]", err);

    return NextResponse.json(
      { status: 500, message: "Erro interno ao processar registro." },
      { status: 500 },
    );
  }
}
