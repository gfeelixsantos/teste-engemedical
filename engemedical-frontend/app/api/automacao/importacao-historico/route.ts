import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { JWT } from '@/lib/jwt/jwt';
import { NEST_URL } from '@/config/constants';
import { resolveAuthProxyContextFromTokens } from '../../_authContext.mjs';

async function auth() {
  const ck = await cookies();
  return resolveAuthProxyContextFromTokens({ authToken: ck.get('auth_token')?.value, refreshToken: ck.get('refresh_token')?.value, verifyJwt: JWT.verifyJwt });
}

export async function POST(req: Request) {
  try {
    const { bearerToken, authUser } = await auth();
    if (!bearerToken || !authUser) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    const form = await req.formData();
    const action = form.get('action');
    const url = action === 'confirm' && form.get('id') ? `${NEST_URL}soc/history-import/${encodeURIComponent(String(form.get('id')))}/confirm` : action === 'cancel' && form.get('id') ? `${NEST_URL}soc/history-import/${encodeURIComponent(String(form.get('id')))}/cancel` : `${NEST_URL}soc/history-import/analyze`;
    const body = action === 'confirm' ? JSON.stringify({ targetCompany: form.get('targetCompany'), documentIds: JSON.parse(String(form.get('documentIds') || '[]')) }) : action === 'cancel' ? undefined : (() => { const upload = new FormData(); const file = form.get('file'); if (file) upload.append('file', file); return upload; })();
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${bearerToken}`, 'x-auth-user': JSON.stringify(authUser), ...(action === 'confirm' ? { 'Content-Type': 'application/json' } : {}) }, body: body as BodyInit });
    return new NextResponse(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' } });
  } catch (error) { return NextResponse.json({ message: 'Falha ao processar importação', details: String(error) }, { status: 500 }); }
}

export async function GET(req: Request) {
  try {
    const { bearerToken, authUser } = await auth();
    if (!bearerToken || !authUser) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    const params = new URL(req.url).searchParams;
    if (params.get('resource') === 'companies') {
      const response = await fetch(`${NEST_URL}soc/empresas/soc-export`, { headers: { Authorization: `Bearer ${bearerToken}`, 'x-auth-user': JSON.stringify(authUser) } });
      return new NextResponse(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' } });
    }
    const id = params.get('id');
    if (!id) return NextResponse.json({ message: 'Análise não informada' }, { status: 400 });
    const response = await fetch(`${NEST_URL}soc/history-import/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${bearerToken}`, 'x-auth-user': JSON.stringify(authUser) } });
    return new NextResponse(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' } });
  } catch (error) { return NextResponse.json({ message: 'Falha ao carregar análise', details: String(error) }, { status: 500 }); }
}
