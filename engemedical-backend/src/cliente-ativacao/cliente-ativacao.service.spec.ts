import { ClientActivationService } from './cliente-ativacao.service';

describe('ClientActivationService', () => {
  it('returns the activation for the authorized company only', async () => {
    const accessService = {
      assertCanAccess: jest.fn().mockResolvedValue({
        companyCode: '2106632',
        companyName: 'Empresa XPTO',
      }),
    };
    const repository = {
      findByUserAndCompany: jest.fn().mockResolvedValue({
        id: 'activation-1',
        userId: 'user-1',
        companyCode: '2106632',
        cnpj: '00.000.000/0001-00',
        companyName: 'Empresa XPTO',
        filialId: 'bh',
        status: 'IN_PROGRESS',
        currentStep: 'DOCUMENTS',
        completedSteps: ['COMPANY', 'EMPLOYEES'],
        pendingItems: ['POWER_OF_ATTORNEY'],
        progress: 50,
      }),
    };
    const companyReader = {
      findEmpresaByCode: jest.fn().mockResolvedValue({
        CODIGO: '2106632',
        RAZAOSOCIAL: 'Empresa XPTO',
        CNPJ: '00.000.000/0001-00',
      }),
    };
    const service = new ClientActivationService(
      accessService as any,
      repository as any,
      companyReader as any,
      { create: jest.fn() } as any,
    );

    const result = await service.getActivation('2106632', '1-2106632', 'user-1');

    expect(accessService.assertCanAccess).toHaveBeenCalledWith(
      '2106632',
      '1-2106632',
    );
    expect(repository.findByUserAndCompany).toHaveBeenCalledWith(
      'user-1',
      '2106632',
    );
    expect(result.company.companyCode).toBe('2106632');
    expect(result.activation.status).toBe('IN_PROGRESS');
    expect(result.activation.pendingItems).toEqual(['POWER_OF_ATTORNEY']);
  });

  it('returns a not-started activation when no record exists', async () => {
    const accessService = {
      assertCanAccess: jest.fn().mockResolvedValue({
        companyCode: '2106632',
        companyName: 'Empresa XPTO',
      }),
    };
    const repository = {
      findByUserAndCompany: jest.fn().mockResolvedValue(null),
    };
    const companyReader = {
      findEmpresaByCode: jest.fn().mockResolvedValue({
        CODIGO: '2106632',
        RAZAOSOCIAL: 'Empresa XPTO',
        CNPJ: '00.000.000/0001-00',
      }),
    };
    const service = new ClientActivationService(
      accessService as any,
      repository as any,
      companyReader as any,
      { create: jest.fn() } as any,
    );

    const result = await service.getActivation('2106632', '2106632', 'user-1');

    expect(result.activation).toEqual({
      status: 'NOT_STARTED',
      currentStep: 'COMPANY',
      completedSteps: [],
      pendingItems: ['COMPANY'],
      progress: 0,
    });
  });

  it('rejects appointments outside the configured activation schedule', async () => {
    const service = new ClientActivationService(
      { assertCanAccess: jest.fn().mockResolvedValue(undefined) } as any,
      { findByUserAndCompany: jest.fn().mockResolvedValue({ id: 'activation-1', companyName: 'Empresa XPTO' }), update: jest.fn() } as any,
      {} as any,
      { create: jest.fn() } as any,
    );

    await expect(service.saveAppointment(
      'activation-1', '2106632', '2106632', 'user-1',
      { start_time: '2026-09-20T13:00:00-03:00', end_time: '2026-09-20T14:00:00-03:00' },
    )).rejects.toThrow('segunda a sexta-feira');
  });

  it('creates a commitment using the existing agenda schema and keeps activation references in description', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'commitment-1' });
    const update = jest.fn();
    const service = new ClientActivationService(
      { assertCanAccess: jest.fn().mockResolvedValue({ companyCode: '2106632', companyName: 'Empresa XPTO' }) } as any,
      { findByUserAndCompany: jest.fn().mockResolvedValue({ id: 'activation-1', companyName: 'Empresa XPTO', contact: { email: 'contato@xpto.com' } }), update } as any,
      { findEmpresaByCode: jest.fn().mockResolvedValue({ RAZAOSOCIAL: 'Empresa XPTO', CNPJ: '00.000.000/0001-00' }) } as any,
      { create } as any,
    );

    await service.saveAppointment(
      'activation-1', '2106632', '2106632', 'user-1',
      { start_time: '2026-09-17T13:00:00-03:00', end_time: '2026-09-17T14:00:00-03:00' },
    );

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'ATIVACAO_CLIENTE',
      start_time: '2026-09-17T13:00:00-03:00',
      end_time: '2026-09-17T14:00:00-03:00',
      description: expect.stringContaining('Código da empresa: 2106632'),
    }));
    expect(create.mock.calls[0][0]).not.toHaveProperty('companyCode');
    expect(create.mock.calls[0][0]).not.toHaveProperty('activationId');
    expect(create.mock.calls[0][0].description).toContain('Identificador da ativação: activation-1');
    expect(update).toHaveBeenCalledWith('activation-1', 'user-1', '2106632', expect.objectContaining({ appointmentId: 'commitment-1' }));
  });
});
