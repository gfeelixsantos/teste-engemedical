import { NextRequest, NextResponse } from "next/server";

import { UserService } from "@/lib/user/services/user.service";
import { recoveryResetSchema } from "@/lib/user/zod/schemas";
import { ApiResponse } from "@/shared/responses/ApiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = recoveryResetSchema.parse(body);

    const cpfNormalizado = data.cpf.replace(/\D/g, "");

    const response = await UserService.resetPassword(
      cpfNormalizado,
      data.nova_senha,
    );

    return NextResponse.json(response);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      new ApiResponse(400, "Dados inválidos", { success: false }),
    );
  }
}
