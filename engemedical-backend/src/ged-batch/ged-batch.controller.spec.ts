import { GedBatchController } from './ged-batch.controller';
import { GedBatchJob } from './ged-batch.types';

describe('GedBatchController', () => {
  let controller: GedBatchController;
  let gedBatchService: {
    createJob: jest.Mock;
    getJob: jest.Mock;
    listJobs: jest.Mock;
  };

  beforeEach(() => {
    gedBatchService = {
      createJob: jest.fn(),
      getJob: jest.fn(),
      listJobs: jest.fn(),
    };

    controller = new GedBatchController(gedBatchService as any);
  });

  it('create returns a job', async () => {
    const job = {
      id: 'job-1',
      scope: 'empresa' as const,
      requestedBy: { userId: 'user-1' },
      empresa: { codigoEmpresa: '1733915', razaoSocial: 'ACME' },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'completed' as const,
      totalFuncionarios: 1,
      processedFuncionarios: 1,
      succeededFuncionarios: 1,
      failedFuncionarios: 0,
      errors: [],
      items: [],
    } satisfies GedBatchJob;
    gedBatchService.createJob.mockResolvedValue(job);

    const result = await controller.create(
      { empresaCodigo: '1733915', tipo: 'prontuario' } as any,
      { user: { userId: 'user-1' } } as any,
    );

    expect(result).toEqual(job);
    expect(gedBatchService.createJob).toHaveBeenCalledWith(
      { empresaCodigo: '1733915', tipo: 'prontuario' },
      'user-1',
    );
  });

  it('getStatus returns a job', async () => {
    const job = {
      id: 'job-2',
      scope: 'empresa' as const,
      requestedBy: { userId: 'user-1' },
      empresa: { codigoEmpresa: '1733915', razaoSocial: 'ACME' },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'completed' as const,
      totalFuncionarios: 1,
      processedFuncionarios: 1,
      succeededFuncionarios: 1,
      failedFuncionarios: 0,
      errors: [],
      items: [],
    } satisfies GedBatchJob;
    gedBatchService.getJob.mockResolvedValue(job);

    const result = await controller.getStatus('job-2');
    expect(result).toEqual(job);
  });

  it('list returns jobs', async () => {
    gedBatchService.listJobs.mockResolvedValue([]);
    const result = await controller.list(
      { user: { userId: 'user-1' } } as any,
      '10',
      '0',
    );
    expect(result).toEqual([]);
    expect(gedBatchService.listJobs).toHaveBeenCalledWith('user-1', 10, 0);
  });
});
