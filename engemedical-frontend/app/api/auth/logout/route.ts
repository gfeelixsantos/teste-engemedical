import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { JWT } from "@/lib/jwt/jwt";
import { IUserInfo } from "@/lib/user/interfaces/IUser";

async function logLogout(userInfo?: Partial<IUserInfo>, ip?: string, userAgent?: string) {
  try {
    await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        acao: "LOGOUT",
        userCodigo: userInfo?.codigo,
        userNome: userInfo?.nome,
        userPerfil: userInfo?.perfil,
        ip,
        userAgent,
      }),
    }).catch(() => {});
  } catch {
    // Auditoria não deve interromper fluxo de logout
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const ck = await cookies();
  const token = ck.get("auth_token")?.value ?? ck.get("refresh_token")?.value;

  let userInfo: Partial<IUserInfo> | undefined;

  if (token) {
    try {
      userInfo = await JWT.verifyJwt(token).then((payload: any) => ({
        codigo: payload.codigo,
        nome: payload.nome,
        perfil: payload.perfil,
      }));
    } catch {
      // Token inválido - ainda registra logout com dados que temos
    }
  }

  // Limpar cookies de autenticação
  ck.delete("auth_token");
  ck.delete("refresh_token");

  // Registrar logout na auditoria (fire-and-forget)
  void logLogout(userInfo, ip, userAgent);

  return NextResponse.json({
    message: "Logout realizado com sucesso",
    user: null,
  });
}
