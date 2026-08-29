import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { JWT } from "@/lib/jwt/jwt";

const RENEW_THRESHOLD = 10 * 60; // renovar faltando 10 min

export async function middleware(request: NextRequest) {
  // Página pública do totem — não requer autenticação
  if (request.nextUrl.pathname.startsWith("/teleatendimento/totem")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!token && !refreshToken) {
    return redirectToLogin(request);
  }

  let response = NextResponse.next();

  try {
    let payload = null;
    let needsRefresh = false;

    // 1. Tentar validar o auth_token via verifyJwt (assinatura real)
    if (token) {
      payload = await JWT.verifyJwt(token);

      if (payload) {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = payload.exp! - now;

        if (expiresIn < RENEW_THRESHOLD) {
          needsRefresh = true;
        }
      } else {
        // Token expirado ou assinatura inválida
        needsRefresh = true;
      }
    } else {
      needsRefresh = true;
    }

    // 2. Se precisa renovar, verificar validade do refresh_token
    if (needsRefresh && refreshToken) {
      const refreshPayload = await JWT.verifyJwt(refreshToken);

      if (!refreshPayload) {
        return redirectToLogin(request); // refresh também inválido ou expirado
      }

      // Restaura o payload a partir do refresh_token válido
      payload = refreshPayload;

      // Remove campos iat e exp gerados pelo token antigo
      const { iat, exp, ...userInfo } = payload as any;

      // Gera novos tokens (Sliding Session)
      const newToken = await JWT.signJwt(userInfo, "1h");
      const newRefreshToken = await JWT.signJwt(userInfo, "7d");

      response.cookies.set("auth_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hora
      });

      response.cookies.set("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 dias
      });
    } else if (!payload) {
      // Sem tokens válidos disponíveis
      return redirectToLogin(request);
    }

    return response;
  } catch (error) {
    console.error("Middleware Auth Error:", error);

    return redirectToLogin(request);
  }
}
function redirectToLogin(request: NextRequest) {
  const url = new URL("/", request.url);

  url.searchParams.set("callbackUrl", request.nextUrl.pathname);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/atendimento/:path*",
    "/dashboard/:path*",
    "/prontuarios/:path*",
    "/recepcao/:path*",
    "/relatorio/:path*",
    "/servicos/:path*",
    "/teleatendimento/:path*",
  ],
};
