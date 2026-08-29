import { SignJWT, jwtVerify, decodeJwt, JWTPayload } from "jose";

import { IUserInfo } from "../user/interfaces/IUser";

const secretRaw = process.env.JWT_SECRET;

if (!secretRaw) throw new Error("Missing JWT_SECRET env variable");
const secret = new TextEncoder().encode(secretRaw);

// Ajuste conforme os dados do seu token
export interface JwtPayload extends IUserInfo {
  exp: number; // sempre number na nossa tipagem final
  iat: number;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);

    return Number.isFinite(n) ? n : undefined;
  }

  return undefined;
}

export class JWT {
  // Decodifica SEM validar assinatura — usa o decodeJwt do jose
  static decodeJwt(token: string): JwtPayload {
    // decodeJwt retorna JWTPayload (com campos opcionais)
    const raw = decodeJwt(token) as JWTPayload;

    const exp = toNumber(raw.exp);
    const iat = toNumber(raw.iat);

    if (exp == null || iat == null) {
      throw new Error("Token payload missing exp/iat");
    }

    // Spread dos campos que coincidem com IUserInfo (nome, perfil, codigo, etc.)
    // usamos as any apenas para mapear dinamicamente
    return {
      ...(raw as unknown as IUserInfo),
      exp,
      iat,
    } as JwtPayload;
  }

  // Assina um JWT com payload informado
  static async signJwt(
    payload: Omit<JwtPayload, "iat" | "exp">,
    expiresIn: string | number = "1h",
  ) {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }

  // Gera JWT (mantive sua função original)
  static async generateJwt(userInfo: any) {
    return await new SignJWT(userInfo)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);
  }

  // Verifica a assinatura e expiração
  static async verifyJwt(token: string): Promise<JwtPayload | null> {
    try {
      // jwtVerify retorna { payload, protectedHeader, ... }
      const result = await jwtVerify(token, secret);

      // result.payload é JWTPayload (exp, iat podem ser string | number | undefined)
      const raw = result.payload as JWTPayload;

      const exp = toNumber(raw.exp);
      const iat = toNumber(raw.iat);

      if (exp == null || iat == null) {
        // token sem exp/iat — tratar como inválido
        return null;
      }

      const payload: JwtPayload = {
        ...(raw as unknown as IUserInfo),
        exp,
        iat,
      };

      return payload;
    } catch (err) {
      console.error("Erro ao verificar JWT:", err);

      return null;
    }
  }
}
