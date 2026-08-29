import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { handleCriticalDeleteProxy } from "@/app/api/schedulings/_criticalDeleteProxy.mjs";
import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";
import { UserService } from "@/lib/user/services/user.service";
import { HttpCodes } from "@/shared/responses/HttpCodes";

export async function DELETE(request: Request) {
  const ck = await cookies();
  const authToken = ck.get("auth_token")?.value;
  const refreshToken = ck.get("refresh_token")?.value;

  const result = await handleCriticalDeleteProxy({
    request,
    endpoint: "schedulings/remove-anexo",
    method: "DELETE",
    authToken,
    refreshToken,
    verifyJwt: JWT.verifyJwt,
    reauthenticate: async ({
      cpf,
      password,
    }: {
      cpf: string;
      password: string;
    }) => {
      const response = await UserService.reauthenticate({ cpf, password });
      return { ok: response.status === HttpCodes.OK };
    },
    fetchImpl: fetch,
    backendBaseUrl: NEST_URL,
  });

  return new NextResponse(result.body, {
    status: result.status,
    headers: {
      "Content-Type": result.contentType,
    },
  });
}
