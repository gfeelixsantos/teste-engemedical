import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { JwtAuthGuard } from './jwt-auth.guard';

const secret = 'test-jwt-secret';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeToken(payload: Record<string, unknown>): string {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('attaches only safe verified claims to request.user', () => {
    const request: Record<string, unknown> = {
      headers: {
        authorization: `Bearer ${makeToken({
          sub: 'auth-user-1',
          userId: 'user-1',
          codigo: '123',
          email: 'user@example.com',
          perfil: 'CLIENTE',
          exp: Math.floor(Date.now() / 1000) + 60,
          registration_code: 'must-not-leak',
          admin: true,
        })}`,
      },
    };

    expect(new JwtAuthGuard().canActivate(makeContext(request))).toBe(true);
    expect(request.user).toEqual({
      sub: 'auth-user-1',
      userId: 'user-1',
      codigo: '123',
      email: 'user@example.com',
      perfil: 'CLIENTE',
    });
  });

  it('rejects a token with an invalid signature', () => {
    const token = makeToken({ sub: 'auth-user-1', exp: Math.floor(Date.now() / 1000) + 60 });
    const request = {
      headers: { authorization: `Bearer ${token.slice(0, -1)}x` },
    };

    expect(() => new JwtAuthGuard().canActivate(makeContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', () => {
    const request = {
      headers: {
        authorization: `Bearer ${makeToken({
          sub: 'auth-user-1',
          exp: Math.floor(Date.now() / 1000) - 1,
        })}`,
      },
    };

    expect(() => new JwtAuthGuard().canActivate(makeContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it.each([0, 'not-a-number', 'Infinity'])(
    'rejects a token with invalid exp=%p',
    (exp) => {
      const request = {
        headers: {
          authorization: `Bearer ${makeToken({ sub: 'auth-user-1', exp })}`,
        },
      };

      expect(() => new JwtAuthGuard().canActivate(makeContext(request))).toThrow(
        UnauthorizedException,
      );
    },
  );
});
