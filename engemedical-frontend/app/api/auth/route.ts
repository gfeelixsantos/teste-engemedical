import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { JWT } from "@/lib/jwt/jwt";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { UserService } from "@/lib/user/services/user.service";
import { userLoginSchema } from "@/lib/user/zod/schemas";
import { ApiMessages } from "@/shared/responses/ApiMessages";
import { ApiResponse, IApiResponse } from "@/shared/responses/ApiResponse";
import { HttpCodes } from "@/shared/responses/HttpCodes";
import { ZodError } from "zod";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function logUserAction(acao: string, userInfo?: Partial<IUserInfo>, ip?: string, userAgent?: string) {
  try {
    await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        acao,
        userCodigo: userInfo?.codigo,
        userNome: userInfo?.nome,
        userPerfil: userInfo?.perfil,
        ip,
        userAgent,
      }),
    }).catch(() => {});
  } catch {
    // Auditoria não deve interromper fluxo de autenticação
  }
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<IApiResponse<IUserInfo>>> {
  const ip = (req as any).ip ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  try {
    const body = await req.json();
    const data = userLoginSchema.parse(body);

    const userLogged = await UserService.login(data);

    if (userLogged.status !== HttpCodes.OK || !userLogged.data) {
      return NextResponse.json(
        new ApiResponse(userLogged.status, userLogged.message),
        { status: userLogged.status },
      );
    }

    const { token, userInfo } = userLogged.data;

    if (!token) {
      return NextResponse.json(
        new ApiResponse(HttpCodes.UNAUTHORIZED, ApiMessages.USER_INPUT_INVALID),
        { status: HttpCodes.UNAUTHORIZED },
      );
    }

    const ck = await cookies();

    ck.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hora
    });

    const refreshToken = await JWT.signJwt(
      userInfo as unknown as Omit<IUserInfo, "iat" | "exp">,
      "7d",
    );

    ck.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    // Registrar login na auditoria (fire-and-forget)
    void logUserAction("LOGIN", userInfo, ip, userAgent);

    return NextResponse.json(
      new ApiResponse(
        HttpCodes.OK,
        ApiMessages.USER_LOGGED_IN_SUCCESSFULLY,
        userInfo,
      ),
    );
  } catch (err) {
    console.error(err);

    if (err instanceof ZodError) {
      return NextResponse.json(
        new ApiResponse(
          HttpCodes.BAD_REQUEST,
          ApiMessages.USER_INPUT_INVALID,
        ),
        { status: HttpCodes.BAD_REQUEST },
      );
    }

    return NextResponse.json(
      {
        ...new ApiResponse(
          HttpCodes.INTERNAL_SERVER_ERROR,
          ApiMessages.INTERNAL_ERROR,
        ),
        details:
          process.env.NODE_ENV === "development" && err instanceof Error
            ? err.message
            : undefined,
      },
      { status: HttpCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

export async function GET() {
  const ck = await cookies();
  const token = ck.get("auth_token")?.value ?? ck.get("refresh_token")?.value;

  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  try {
    const payload = await JWT.verifyJwt(token);

    return NextResponse.json({ user: payload });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
