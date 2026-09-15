import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NEST_URL } from '@/config/constants';
import { JWT } from '@/lib/jwt/jwt';
import { resolveAuthProxyContextFromTokens } from '../../_authContext.mjs';
export async function GET(request: Request) {
  const ck = await cookies(); const url = new URL(request.url);
  const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({ authToken: ck.get('auth_token')?.value, refreshToken: ck.get('refresh_token')?.value, verifyJwt: JWT.verifyJwt });
  const headers = new Headers({ 'Content-Type': 'application/json' }); if (bearerToken) headers.set('Authorization', `Bearer ${bearerToken}`); if (authUser) headers.set('x-auth-user', JSON.stringify(authUser));
  const target = url.pathname.endsWith('/refresh') ? 'financeiro/refresh' : `financeiro/dashboard${url.search}`;
  const response = await fetch(`${NEST_URL}${target}`, { headers, cache: 'no-store' });
  return new NextResponse(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
