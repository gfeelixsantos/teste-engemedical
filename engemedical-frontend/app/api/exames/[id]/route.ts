import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";

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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { headers } = await getAuthHeaders();
    const response = await fetch(`${NEST_URL}exames/${id}`, { headers });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BFF:exames:GET:id]", error);
    return NextResponse.json({ message: "Falha ao buscar exame." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await req.json();
    const { headers } = await getAuthHeaders();
    const response = await fetch(`${NEST_URL}exames/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BFF:exames:PATCH]", error);
    return NextResponse.json({ message: "Falha ao atualizar exame." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { headers } = await getAuthHeaders();
    const response = await fetch(`${NEST_URL}exames/${id}`, {
      method: "DELETE",
      headers,
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BFF:exames:DELETE]", error);
    return NextResponse.json({ message: "Falha ao excluir exame." }, { status: 500 });
  }
}
