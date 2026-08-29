import { MongoService } from './mongo/mongo.service';

describe('MongoService GED navigation', () => {
  const buildService = () => {
    const service = new MongoService(
      { get: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { findByIdSafe: jest.fn() } as any,
      { setContext: jest.fn(), warn: jest.fn(), log: jest.fn() } as any,
    );

    const aggregate = jest.fn();
    const find = jest.fn();

    (service as any).schedulingsCollection = {
      aggregate,
      find,
    };

    return { service, aggregate, find };
  };

  it('lists GED empresas using aggregation', async () => {
    const { service, aggregate } = buildService();
    aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        {
          codigoEmpresa: '1733915',
          nomeEmpresa: 'Empresa Teste',
          totalProntuarios: 2,
          totalArquivos: 4,
        },
      ]),
    });

    const result = await service.listGedEmpresas();

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        codigoEmpresa: '1733915',
        nomeEmpresa: 'Empresa Teste',
        totalProntuarios: 2,
        totalArquivos: 4,
      },
    ]);
  });

  it('lists GED periodos for one empresa', async () => {
    const { service, aggregate } = buildService();
    aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        {
          ano: '2026',
          mes: '05',
          totalProntuarios: 2,
          totalArquivos: 4,
        },
      ]),
    });

    const result = await service.listGedPeriodos('1733915');

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        ano: '2026',
        mes: '05',
        totalProntuarios: 2,
        totalArquivos: 4,
      },
    ]);
  });

  it('lists GED prontuarios for one empresa and period', async () => {
    const { service, aggregate } = buildService();
    aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        {
          codigoProntuario: '1733915-143-3-29042026',
          nomeFuncionario: 'JOAO TESTE',
          tipoExame: 'ADMISSIONAL',
          dataAgendamento: '2026-05-10',
          totalArquivos: 3,
        },
      ]),
    });

    const result = await service.listGedProntuarios({
      codigoEmpresa: '1733915',
      ano: '2026',
      mes: '05',
    });

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        codigoProntuario: '1733915-143-3-29042026',
        nomeFuncionario: 'JOAO TESTE',
        tipoExame: 'ADMISSIONAL',
        dataAgendamento: '2026-05-10',
        totalArquivos: 3,
      },
    ]);
  });

  it('lists GED arquivos for one prontuario using mongo document paths', async () => {
    const { service } = buildService();

    (service as any).schedulingsCollection.findOne = jest
      .fn()
      .mockResolvedValue({
        NOME: 'JOAO TESTE',
        TIPOEXAMENOME: 'ADMISSIONAL',
        DATAAGENDAMENTO: '2026-05-10',
      });
    (service as any).azureService = {
      getDocumentsContainerClient: jest.fn().mockReturnValue('CONTAINER'),
      listBlobsByPrefix: jest.fn().mockImplementation((prefix: string) => {
        if (prefix.startsWith('aso/')) {
          return Promise.resolve([{ name: `${prefix}ASO.pdf` }]);
        }
        if (prefix.startsWith('exames/')) {
          return Promise.resolve([{ name: `${prefix}AUDIOMETRIA.pdf` }]);
        }
        return Promise.resolve([{ name: `${prefix}RG.pdf` }]);
      }),
    };

    const result = await service.listGedArquivos({
      codigoEmpresa: '1733915',
      ano: '2026',
      mes: '05',
      codigoProntuario: 'PRONT001',
    });

    expect(
      (service as any).schedulingsCollection.findOne,
    ).toHaveBeenCalledWith({ CODIGOPRONTUARIO: 'PRONT001' }, expect.anything());
    expect((service as any).azureService.listBlobsByPrefix).toHaveBeenCalledTimes(
      3,
    );
    expect(result).toEqual([
      {
        blobName: 'aso/2026/05/1733915/PRONT001/ASO.pdf',
        fileName: 'ASO.pdf',
        nomeFuncionario: 'JOAO TESTE',
        tipoExame: 'ADMISSIONAL',
        dataAgendamento: '2026-05-10',
        origem: 'aso',
      },
      {
        blobName: 'exames/2026/05/1733915/PRONT001/AUDIOMETRIA.pdf',
        fileName: 'AUDIOMETRIA.pdf',
        nomeFuncionario: 'JOAO TESTE',
        tipoExame: 'ADMISSIONAL',
        dataAgendamento: '2026-05-10',
        origem: 'exame',
      },
      {
        blobName: 'anexos/2026/05/1733915/PRONT001/RG.pdf',
        fileName: 'RG.pdf',
        nomeFuncionario: 'JOAO TESTE',
        tipoExame: 'ADMISSIONAL',
        dataAgendamento: '2026-05-10',
        origem: 'anexo',
      },
    ]);
  });
});
