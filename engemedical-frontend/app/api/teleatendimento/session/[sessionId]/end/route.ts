import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";

import { handleTeleatendimentoProxy } from "../../../proxy.mjs";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  const ck = await cookies();
  const authToken = ck.get("auth_token")?.value;
  const refreshToken = ck.get("refresh_token")?.value;

  const response = await handleTeleatendimentoProxy({
    request: req,
    authToken,
    refreshToken,
    verifyJwt: JWT.verifyJwt,
    fetchImpl: fetch,
    backendBaseUrl: NEST_URL,
    endpoint: `teleatendimento/session/${sessionId}/end`,
    method: "POST",
    requiresAuth: true,
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.contentType,
    },
  });
}
