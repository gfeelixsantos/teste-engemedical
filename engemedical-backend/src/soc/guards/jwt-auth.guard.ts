import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token de autenticacao ausente');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Formato de token invalido');
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new UnauthorizedException('JWT_SECRET nao configurado no servidor');
    }

    if (!this.verifyToken(token, secret)) {
      throw new UnauthorizedException('Token invalido ou expirado');
    }

    return true;
  }

  private verifyToken(token: string, secret: string): boolean {
    try {
      const segments = token.split('.');
      if (segments.length !== 3) return false;

      const [headerB64, payloadB64, signatureB64] = segments;

      const signature = this.base64UrlDecode(signatureB64);
      const expectedSignature = createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest();

      if (signature.length !== expectedSignature.length) return false;

      if (!timingSafeEqual(signature, expectedSignature)) return false;

      const payloadRaw = this.base64UrlDecode(payloadB64).toString('utf8');
      const payload = JSON.parse(payloadRaw);

      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (now > payload.exp) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private base64UrlDecode(input: string): Buffer {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const padded = padding ? base64 + '='.repeat(4 - padding) : base64;
    return Buffer.from(padded, 'base64');
  }
}
