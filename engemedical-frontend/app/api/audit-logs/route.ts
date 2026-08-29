import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";

import { handleAuditLogsProxy } from "./handler.mjs";

export async function GET(req: Request): Promise<NextResponse> {
  const ck = await cookies();
  const authToken = ck.get("auth_token")?.value;
  const refreshToken = ck.get("refresh_token")?.value;
  const incomingUrl = new URL(req.url);
  const targetUrl = new URL(`${NEST_URL}audit-logs`);

  targetUrl.search = incomingUrl.search;

  const response = await handleAuditLogsProxy({
    requestUrl: targetUrl.toString(),
    authToken,
    refreshToken,
    verifyJwt: JWT.verifyJwt,
    fetchImpl: fetch,
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.contentType,
    },
  });
}
