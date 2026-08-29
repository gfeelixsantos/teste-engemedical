import { GedBatchService } from './ged-batch.service';
import {
  inferScope,
  validateScopeConstraints,
  CreateGedBatchDto,
} from './ged-batch.types';

describe('inferScope', () => {
  it('retorna o scope explícito quando fornecido', () => {
    expect(inferScope({ scope: 'empresa', codigoEmpresa: 'E1', razaoSocial: 'X' })).toBe('empresa');
    expect(inferScope({ scope: 'periodo', codigoEmpresa: 'E1', razaoSocial: 'X' })).toBe('periodo');
    expect(inferScope({ scope: 'prontuario', codigoEmpresa: 'E1', razaoSocial: 'X' })).toBe('prontuario');
  });

  it('infere "prontuario" quando prontuarios tem exatamente 1 item e scope está ausente', () => {
    const dto: CreateGedBatchDto = {
      codigoEmpresa: 'E1',
      razaoSocial: 'X',
      periodo: { ano: '2026', mes: '05' },
      prontuarios: [{ codigoProntuario: 'P1', nome: 'João' }],
    };
    expect(inferScope(dto)).toBe('prontuario');
  });

  it('infere "periodo" quando periodo está presente mas prontuarios está ausente/vazio', () => {
    const dto: CreateGedBatchDto = {
      codigoEmpresa: 'E1',
      razaoSocial: 'X',
      periodo: { ano: '2026', mes: '05' },
    };
    expect(inferScope(dto)).toBe('periodo');
  });

  it('infere "empresa" como fallback quando scope, periodo e prontuarios estão ausentes', () => {
    const dto: CreateGedBatchDto = { codigoEmpresa: 'E1', razaoSocial: 'X' };
    expect(inferScope(dto)).toBe('empresa');
  });

  it('infere "empresa" quando prontuarios tem mais de 1 item e scope está ausente', () => {
    const dto: CreateGedBatchDto = {
      codigoEmpresa: 'E1',
      razaoSocial: 'X',
      prontuarios: [
        { codigoProntuario: 'P1', nome: 'João' },
        { codigoProntuario: 'P2', nome: 'Maria' },
      ],
    };
    expect(inferScope(dto)).toBe('empresa');
  });
});

describe('validateScopeConstraints', () => {
  it('scope=empresa: aceita payload mínimo', () => {
    expect(() =>
      validateScopeConstraints('empresa', { codigoEmpresa: 'E1', razaoSocial: 'X' }),
    ).not.toThrow();
  });

  it('scope=periodo: lança erro quando periodo está ausente', () => {
    expect(() =>
      validateScopeConstraints('periodo', { codigoEmpresa: 'E1', razaoSocial: 'X' }),
    ).toThrow('scope=periodo exige periodo.ano e periodo.mes preenchidos.');
  });

  it('scope=periodo: aceita payload com ano e mes preenchidos', () => {
    expect(() =>
      validateScopeConstraints('periodo', {
        codigoEmpresa: 'E1',
        razaoSocial: 'X',
        periodo: { ano: '2026', mes: '05' },
      }),
    ).not.toThrow();
  });

  it('scope=prontuario: lança erro quando periodo está ausente', () => {
    expect(() =>
      validateScopeConstraints('prontuario', {
        codigoEmpresa: 'E1',
        razaoSocial: 'X',
        prontuarios: [{ codigoProntuario: 'P1', nome: 'João' }],
      }),
    ).toThrow('scope=prontuario exige periodo.ano e periodo.mes preenchidos.');
  });

  it('scope=prontuario: lança erro quando prontuarios está vazio', () => {
    expect(() =>
      validateScopeConstraints('prontuario', {
        codigoEmpresa: 'E1',
        razaoSocial: 'X',
        periodo: { ano: '2026', mes: '05' },
        prontuarios: [],
      }),
    ).toThrow('scope=prontuario exige exatamente um item em prontuarios.');
  });

  it('scope=prontuario: aceita payload com periodo e exatamente 1 prontuario', () => {
    expect(() =>
      validateScopeConstraints('prontuario', {
        codigoEmpresa: 'E1',
        razaoSocial: 'X',
        periodo: { ano: '2026', mes: '05' },
        prontuarios: [{ codigoProntuario: 'P1', nome: 'João' }],
      }),
    ).not.toThrow();
  });
});

describe('GedBatchService', () => {
  let service: GedBatchService;
  let collection: {
    insertOne: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    updateOne: jest.Mock;
  };
  let mongoService: {
    db: { collection: jest.Mock };
    listGedBatchProntuarios: jest.Mock;
  };
  let azureService: {
    deleteBlob: jest.Mock;
    upload: jest.Mock;
    downloadBlob: jest.Mock;
    generateSasUrlFromUrl: jest.Mock;
  };
  let pushService: {
    sendGedBatchUpdate: jest.Mock;
  };
  let websocketGateway: {
    emitGedBatchStatus: jest.Mock;
    emitGedBatchProgress: jest.Mock;
  };

  beforeEach(() => {
    collection = {
      insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
      }),
    };

    mongoService = {
      db: {
        collection: jest.fn().mockReturnValue(collection),
      },
      listGedBatchProntuarios: jest.fn().mockResolvedValue([
        { codigoProntuario: 'P1', nome: 'João Silva' },
        { codigoProntuario: 'P2', nome: 'Maria Souza' },
      ]),
    };

    azureService = {
      deleteBlob: jest.fn().mockResolvedValue(undefined),
      upload: jest.fn().mockResolvedValue('https://blob.url/zip'),
      downloadBlob: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      generateSasUrlFromUrl: jest.fn((p: string) => `sas://${p}`),
    };

    pushService = {
      sendGedBatchUpdate: jest.fn().mockResolvedValue(undefined),
    };

    websocketGateway = {
      emitGedBatchStatus: jest.fn(),
      emitGedBatchProgress: jest.fn(),
    };

    service = new GedBatchService(
      mongoService as any,
      azureService as any,
      pushService as any,
      websocketGateway as any,
    );
  });

  it('creates a pending GED batch job and triggers in-process processing', async () => {
    const job = await service.createJob(
      {
        scope: 'empresa',
        codigoEmpresa: '1733915',
        razaoSocial: 'ACME LTDA',
        tipo: 'prontuario',
      },
      'user-1',
    );

    expect(job.id).toEqual(expect.any(String));
    expect(job.status).toBe('pending');
    expect(job.scope).toBe('empresa');
    expect(job.totalFuncionarios).toBe(2);
    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: job.id,
        scope: 'empresa',
        empresa: { codigoEmpresa: '1733915', razaoSocial: 'ACME LTDA' },
        status: 'pending',
      }),
    );
  });

  it('scope=periodo: delega para listGedBatchProntuarios com periodo e cria job', async () => {
    mongoService.listGedBatchProntuarios.mockResolvedValue([
      { codigoProntuario: 'P3', nome: 'Carlos Lima' },
    ]);

    const job = await service.createJob(
      {
        scope: 'periodo',
        codigoEmpresa: '1733915',
        razaoSocial: 'ACME LTDA',
        periodo: { ano: '2026', mes: '05' },
        tipo: 'prontuario',
      },
      'user-1',
    );

    expect(job.scope).toBe('periodo');
    expect(job.totalFuncionarios).toBe(1);
    expect(mongoService.listGedBatchProntuarios).toHaveBeenCalledWith({
      codigoEmpresa: '1733915',
      periodo: { ano: '2026', mes: '05' },
    });
  });

  it('scope=prontuario: usa o prontuario do payload diretamente sem consultar o Mongo', async () => {
    const job = await service.createJob(
      {
        scope: 'prontuario',
        codigoEmpresa: '1733915',
        razaoSocial: 'ACME LTDA',
        periodo: { ano: '2026', mes: '05' },
        prontuarios: [{ codigoProntuario: 'P5', nome: 'Ana Pereira' }],
        tipo: 'prontuario',
      },
      'user-1',
    );

    expect(job.scope).toBe('prontuario');
    expect(job.totalFuncionarios).toBe(1);
    expect(job.items[0].codigoProntuario).toBe('P5');
    expect(mongoService.listGedBatchProntuarios).not.toHaveBeenCalled();
  });

  it('scope=empresa: lança BadRequestException quando nenhum prontuario for encontrado', async () => {
    mongoService.listGedBatchProntuarios.mockResolvedValue([]);

    await expect(
      service.createJob(
        {
          scope: 'empresa',
          codigoEmpresa: '9999',
          razaoSocial: 'SEM DADOS',
          tipo: 'prontuario',
        },
        'user-1',
      ),
    ).rejects.toThrow('Nenhum prontuario disponivel para a empresa selecionada.');
  });

  it('expiracao de job travado: getJob expira job sem progresso e envia push', async () => {
    const staleDate = new Date(Date.now() - 999_999_999);
    const staleJob = {
      _id: 'job-stale',
      scope: 'empresa',
      requestedBy: { userId: 'user-1' },
      empresa: { codigoEmpresa: '1733915', razaoSocial: 'ACME LTDA' },
      periodo: undefined,
      createdAt: staleDate,
      updatedAt: staleDate,
      status: 'processing',
      items: [
        { codigoProntuario: 'P1', nome: 'João Silva', status: 'pending' },
        { codigoProntuario: 'P2', nome: 'Maria Souza', status: 'completed' },
      ],
      totalFuncionarios: 2,
      processedFuncionarios: 1,
      succeededFuncionarios: 1,
      failedFuncionarios: 0,
      errors: [],
    };

    collection.findOne
      .mockResolvedValueOnce(staleJob)
      .mockResolvedValueOnce({
        ...staleJob,
        status: 'failed',
        processedFuncionarios: 2,
        failedFuncionarios: 1,
        errors: [{ message: 'timeout' }],
      });

    const result = await service.getJob('job-stale');

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: 'job-stale', status: { $nin: ['completed', 'failed', 'partial'] } },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'failed' }),
      }),
    );
    expect(result.status).toBe('failed');
    await Promise.resolve();
    expect(pushService.sendGedBatchUpdate).toHaveBeenCalled();
  });
});
