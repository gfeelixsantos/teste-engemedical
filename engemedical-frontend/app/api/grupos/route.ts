import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";
import { resolveAuthProxyContextFromTokens } from "../_authContext.mjs";

async function getAuthHeaders() {
  const ck = await cookies();
  const authToken = ck.get("auth_token")?.value;
  const refreshToken = ck.get("refresh_token")?.value;
  const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({
    authToken,
    refreshToken,
    verifyJwt: JWT.verifyJwt,
  });
  const headers = new Headers({ "Content-Type": "application/json" });
  if (bearerToken) headers.set("Authorization", `Bearer ${bearerToken}`);
  if (authUser) headers.set("x-auth-user", JSON.stringify(authUser));
  return { headers, authUser };
}

export async function GET(): Promise<NextResponse> {
  try {
    const { headers } = await getAuthHeaders();
    const response = await fetch(`${NEST_URL}grupos`, { headers });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[BFF:grupos:GET]", error);
    return NextResponse.json({ message: "Falha ao listar grupos." }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { headers } = await getAuthHeaders();
    const response = await fetch(`${NEST_URL}grupos`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BFF:grupos:POST]", error);
    return NextResponse.json({ message: "Falha ao criar grupo." }, { status: 500 });
  }
}
