import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT } from "@/lib/jwt/jwt";
import { NEST_URL } from "@/config/constants";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const codigos = searchParams.get("codigos") ?? "";
  if (!codigos.trim()) {
    return NextResponse.json({ message: "codigos é obrigatório" }, { status: 400 });
  }

  try {
    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;
    const refreshToken = ck.get("refresh_token")?.value;
    const { bearerToken } = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt: JWT.verifyJwt,
    });

    const headers: Record<string, string> = {};
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const res = await fetch(`${NEST_URL}cliente/dashboard/resumo?codigos=${encodeURIComponent(codigos)}`, {
      headers,
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ message: "Falha ao buscar dashboard cliente" }, { status: 500 });
  }
}
