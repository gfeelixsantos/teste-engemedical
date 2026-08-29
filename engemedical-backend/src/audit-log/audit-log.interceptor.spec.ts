import { CallHandler, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';

function createExecutionContext(request: Record<string, unknown>, response?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response ?? {},
    }),
  } as ExecutionContext;
}

describe('AuditLogInterceptor', () => {
  const logUserAction = jest.fn();
  const auditLogService = { logUserAction };
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new AuditLogInterceptor(auditLogService as any);
  });

  it('gera log de sucesso com request_id e contexto minimo quando a rota e mapeada', (done) => {
    const request = {
      method: 'POST',
      route: { path: '/update' },
      url: '/schedulings/update',
      headers: {
        'user-agent': 'jest-agent',
        'x-forwarded-for': '10.0.0.9',
      },
      socket: { remoteAddress: '127.0.0.1' },
      user: {
        codigo: 'USR-001',
        nome: 'Felix',
        perfil: 'MASTER',
      },
      body: {
        schedulingId: 'sched-123',
        unidade: 'RIO CLARO',
        pacienteCodigo: 'PAC-001',
        pacienteNome: 'Paciente Teste',
      },
      query: {},
      params: {},
    };

    interceptor.intercept(
      createExecutionContext(request),
      { handle: () => of({ ok: true }) } as CallHandler,
    ).subscribe({
      next: () => {
expect(logUserAction).toHaveBeenCalledWith(
           expect.objectContaining({
             acao: 'RECEPCAO_ATUALIZAR',
             recursoId: 'sched-123',
             pacienteCodigo: 'PAC-001',
             pacienteNome: 'Paciente Teste',
             unidade: 'RIO CLARO',
             requestId: expect.stringMatching(/^engemedical-connect_\d+_[a-z0-9]{7}$/),
             detalhes: expect.objectContaining({
               resultado: 'SUCESSO',
             }),
           }),
         );
        done();
      },
      error: done,
    });
  });

  it('reutiliza request_id vindo do header e nao persiste payload completo', (done) => {
    const request = {
      method: 'POST',
      route: { path: '/finish' },
      url: '/schedulings/finish',
      headers: {
        'user-agent': 'jest-agent',
        'x-request-id': 'req-header-001',
      },
      socket: { remoteAddress: '127.0.0.1' },
      user: {
        codigo: 'MED-001',
        nome: 'Medico',
        perfil: 'MEDICO',
      },
      body: {
        options: { opinionType: 'APTO' },
        parecer: 'texto sigiloso',
        formulario: { completo: true },
      },
      query: {},
      params: {},
    };

    interceptor.intercept(
      createExecutionContext(request),
      { handle: () => of({ ok: true }) } as CallHandler,
    ).subscribe({
      next: () => {
        expect(logUserAction).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: 'req-header-001',
            detalhes: {
              resultado: 'SUCESSO',
              opinionType: 'APTO',
            },
          }),
        );
        expect(logUserAction).not.toHaveBeenCalledWith(
          expect.objectContaining({
            detalhes: expect.objectContaining({
              parecer: expect.anything(),
            }),
          }),
        );
        done();
      },
      error: done,
    });
  });

  it('gera log de erro sanitizado e preserva a excecao original', (done) => {
    const request = {
      method: 'POST',
      route: { path: '/update' },
      url: '/schedulings/update',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: {
        codigo: 'USR-002',
      },
      body: {
        schedulingId: 'sched-999',
      },
      query: {},
      params: {},
    };
    const response = { statusCode: 500 };
    const exception = new HttpException('falha interna', HttpStatus.BAD_REQUEST);

    interceptor.intercept(
      createExecutionContext(request, response),
      { handle: () => throwError(() => exception) } as CallHandler,
    ).subscribe({
      next: () => done(new Error('expected observable to fail')),
      error: (error) => {
        expect(error).toBe(exception);
        expect(logUserAction).toHaveBeenCalledWith(
          expect.objectContaining({
            acao: 'RECEPCAO_ATUALIZAR',
            recursoId: 'sched-999',
            detalhes: expect.objectContaining({
              resultado: 'ERRO',
              statusCode: 400,
              codigoErroSanitizado: 'HTTP_EXCEPTION',
            }),
          }),
        );
        done();
      },
    });
  });

  it('mescla detalhes operacionais da exclusao critica sem persistir payload completo', (done) => {
    const request = {
      method: 'DELETE',
      route: { path: '/delete' },
      url: '/schedulings/delete',
      headers: {
        'x-request-id': 'engemedical-connect_123_abc1234',
      },
      socket: { remoteAddress: '127.0.0.1' },
      user: {
        codigo: 'USR-001',
        nome: 'Felix',
        perfil: 'MASTER',
      },
      body: {
        schedulingId: 'sched-123',
        motivo: 'cadastro duplicado',
        password: 'nao-deve-ir',
      },
      auditLogContext: {
        recursoId: 'sched-123',
        recursoTipo: 'atendimento',
        pacienteCodigo: 'PAC-001',
        pacienteNome: 'Paciente Teste',
        unidade: 'RIO CLARO',
        requestId: 'engemedical-connect_123_abc1234',
        detalhes: {
          motivo: 'cadastro duplicado',
          reautenticado: true,
          snapshotId: 'snapshot_001',
          snapshotHash:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      },
      query: {},
      params: {},
    };

    interceptor.intercept(
      createExecutionContext(request),
      { handle: () => of({ ok: true }) } as CallHandler,
    ).subscribe({
      next: () => {
expect(logUserAction).toHaveBeenCalledWith(
           expect.objectContaining({
             acao: 'EXCLUIR_ATENDIMENTO',
             requestId: 'engemedical-connect_123_abc1234',
             pacienteCodigo: 'PAC-001',
             pacienteNome: 'Paciente Teste',
             unidade: 'RIO CLARO',
             detalhes: {
               motivo: 'cadastro duplicado',
               reautenticado: true,
               snapshotId: 'snapshot_001',
               snapshotHash:
                 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
               resultado: 'SUCESSO',
             },
           }),
         );
        expect(logUserAction).not.toHaveBeenCalledWith(
          expect.objectContaining({
            detalhes: expect.objectContaining({
              password: expect.anything(),
            }),
          }),
        );
        done();
      },
      error: done,
    });
  });

  it('usa dados do auditLogContext definido pelo handler apos execucao', (done) => {
    const request = {
      method: 'DELETE',
      route: { path: '/delete' },
      url: '/schedulings/delete',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: {
        codigo: 'USR-001',
        nome: 'Felix',
        perfil: 'MASTER',
      },
      body: {
        schedulingId: 'sched-456',
        motivo: 'teste',
      },
      query: {},
      params: {},
    };

    interceptor.intercept(
      createExecutionContext(request),
      {
        handle: () => {
          request.auditLogContext = {
            recursoId: 'sched-456',
            recursoTipo: 'atendimento',
            pacienteCodigo: 'FUNC-789',
            pacienteNome: 'Joao Silva',
            unidade: 'SAO PAULO',
            requestId: 'req-handler-001',
            detalhes: { motivo: 'teste' },
          };
          return of({ ok: true });
        },
      } as CallHandler,
    ).subscribe({
      next: () => {
expect(logUserAction).toHaveBeenCalledWith(
           expect.objectContaining({
             pacienteCodigo: 'FUNC-789',
             pacienteNome: 'Joao Silva',
             unidade: 'SAO PAULO',
             requestId: 'req-handler-001',
           }),
         );
        done();
      },
      error: done,
    });
  });

  it('falha na auditoria nao altera a resposta original', (done) => {
    logUserAction.mockImplementation(() => {
      throw new Error('supabase offline');
    });

    const request = {
      method: 'POST',
      route: { path: '/update' },
      url: '/schedulings/update',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      body: {},
      query: {},
      params: {},
    };

    interceptor.intercept(
      createExecutionContext(request),
      { handle: () => of({ ok: true }) } as CallHandler,
    ).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
        done();
      },
      error: done,
    });
  });
});
