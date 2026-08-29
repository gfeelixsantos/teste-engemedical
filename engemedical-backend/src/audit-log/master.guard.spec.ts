import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { MasterGuard } from './master.guard';

describe('MasterGuard', () => {
  const guard = new MasterGuard();

  function makeContext(headers: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as ExecutionContext;
  }

  it('retorna Unauthorized quando o header Authorization nao esta presente', () => {
    expect(() => guard.canActivate(makeContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('retorna Forbidden quando o usuario autenticado nao e MASTER', () => {
    expect(() =>
      guard.canActivate(
        makeContext({
          authorization: 'Bearer token',
          'x-auth-user': JSON.stringify({
            codigo: '123',
            nome: 'Usuario Teste',
            perfil: 'MEDICO',
          }),
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('permite acesso quando o usuario autenticado e MASTER', () => {
    expect(
      guard.canActivate(
        makeContext({
          authorization: 'Bearer token',
          'x-auth-user': JSON.stringify({
            codigo: '321',
            nome: 'Master Teste',
            perfil: 'MASTER',
          }),
        }),
      ),
    ).toBe(true);
  });
});
