import { TeleatendimentoService } from './teleatendimento.service';

describe('TeleatendimentoService', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_WEB_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_BASE_URL;
  });

  function createSession(service: TeleatendimentoService) {
    return service.createSession({
      schedulingId: 'sched-1',
      professionalId: 'med-1',
      professionalName: 'Medico Teste',
      unidade: 'RIO CLARO',
      sala: 'SALA 1',
      exame: 'Exame Clinico',
      employeeId: 'func-1',
      employeeName: 'Funcionario Teste',
      companyCode: 'EMP001',
      prontuarioCode: 'PRONT001',
      examType: 'CLINICO',
      appOrigin: 'http://127.0.0.1:3000',
    });
  }

  it('deve criar sessao com convite opaco e URLs publicas', () => {
    const service = new TeleatendimentoService();

    const result = createSession(service);

    expect(result.sessionId).toBeTruthy();
    expect(result.inviteToken).toBeTruthy();
    expect(result.inviteUrl).toContain('/teleatendimento/convite/');
    expect(result.professionalUrl).toContain('/atendimento/videochamada/');
  });

  it('deve bloquear segunda conexao de funcionario na mesma sessao', () => {
    const service = new TeleatendimentoService();
    const session = createSession(service);

    service.joinEmployeeByInvite(session.inviteToken, 'sock-emp-1');

    expect(() =>
      service.joinEmployeeByInvite(session.inviteToken, 'sock-emp-2'),
    ).toThrow('ocupada');
  });

  it('deve refletir IN_CALL quando profissional e funcionario entram', () => {
    const service = new TeleatendimentoService();
    const created = createSession(service);

    service.joinProfessional(created.sessionId, 'sock-pro-1');
    service.joinEmployeeByInvite(created.inviteToken, 'sock-emp-1');

    const view = service.getSessionForProfessional(created.sessionId);
    expect(view.status).toBe('IN_CALL');
    expect(view.professional.connected).toBe(true);
    expect(view.employee.connected).toBe(true);
    expect(view.inviteUrl).toBe(
      `http://127.0.0.1:3000/teleatendimento/convite/${created.inviteToken}`,
    );
    expect(view.professionalUrl).toBe(
      `http://127.0.0.1:3000/atendimento/videochamada/${created.sessionId}`,
    );
  });

  it('deve priorizar a origem publica configurada sobre localhost do navegador', () => {
    process.env.NEXT_PUBLIC_WEB_APP_URL = 'http://192.168.0.222:3000';

    const service = new TeleatendimentoService();
    const created = service.createSession({
      schedulingId: 'sched-2',
      professionalName: 'Medico Teste',
      employeeName: 'Funcionario Teste',
      appOrigin: 'http://localhost:3000',
    });

    expect(created.inviteUrl).toBe(
      `http://192.168.0.222:3000/teleatendimento/convite/${created.inviteToken}`,
    );
    expect(created.professionalUrl).toBe(
      `http://192.168.0.222:3000/atendimento/videochamada/${created.sessionId}`,
    );
  });
});
