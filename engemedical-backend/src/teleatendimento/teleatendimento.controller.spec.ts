import { TeleatendimentoController } from './teleatendimento.controller';
import { TeleatendimentoService } from './teleatendimento.service';

describe('TeleatendimentoController', () => {
  function createController() {
    const service = new TeleatendimentoService();
    return {
      controller: new TeleatendimentoController(service),
      service,
    };
  }

  it('deve criar sessao e consultar detalhes por sessionId e inviteToken', () => {
    const { controller } = createController();

    const created = controller.createSession(
      {
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
      },
      'http://127.0.0.1:3000',
    );

    const session = controller.getSession(created.sessionId);
    const invite = controller.getInvite(created.inviteToken);

    expect(session.sessionId).toBe(created.sessionId);
    expect(session.inviteUrl).toBe(created.inviteUrl);
    expect(invite.sessionId).toBe(created.sessionId);
    expect(invite.employee.name).toBe('Funcionario Teste');
  });

  it('deve encerrar a sessao', () => {
    const { controller } = createController();

    const created = controller.createSession(
      {
        schedulingId: 'sched-1',
        professionalName: 'Medico Teste',
        employeeName: 'Funcionario Teste',
      },
      'http://127.0.0.1:3000',
    );

    const ended = controller.endSession(created.sessionId);

    expect(ended).toEqual(
      expect.objectContaining({
        success: true,
        sessionId: created.sessionId,
        status: 'ENDED',
      }),
    );
  });
});
