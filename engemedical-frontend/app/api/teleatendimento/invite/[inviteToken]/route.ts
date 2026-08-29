import { NextRequest, NextResponse } from "next/server";

import { NEST_URL } from "@/config/constants";

import { handleTeleatendimentoProxy } from "../../proxy.mjs";

type RouteContext = {
  params: Promise<{
    inviteToken: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { inviteToken } = await context.params;

  const response = await handleTeleatendimentoProxy({
    request: req,
    authToken: undefined,
    refreshToken: undefined,
    verifyJwt: undefined,
    fetchImpl: fetch,
    backendBaseUrl: NEST_URL,
    endpoint: `teleatendimento/invite/${inviteToken}`,
    method: "GET",
    requiresAuth: false,
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.contentType,
    },
  });
}
