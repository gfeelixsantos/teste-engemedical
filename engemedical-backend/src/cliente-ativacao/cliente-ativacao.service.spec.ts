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
});
