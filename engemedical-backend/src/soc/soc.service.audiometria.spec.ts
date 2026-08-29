import { SocService } from './soc.service';
import { WsResultadoExame } from './webservice/resultadoExame/WsResultadoExame';

jest.mock('./webservice/resultadoExame/WsResultadoExame', () => ({
  WsResultadoExame: jest.fn(),
}));

describe('SocService - resultado de exame para SOC', () => {
  const schedulingId = '65f0a5d9f0c2f63f84f0a111';

  const makeScheduling = (overrides: any = {}) => ({
    _id: schedulingId,
    SEQUENCIAFICHA: 'FICHA-001',
    CODIGOEMPRESA: '100',
    CODIGO: '200',
    DATAAGENDAMENTO: '30/03/2026',
    HORARIO: '08:30:00',
    TIPOEXAME: '2',
    EXAMES: [
      {
        grupo: 'Audiometria',
        codigoExame: 'AUD-01',
        sequencialResultadoExame: 'SEQ-001',
        codigoProfissional: '1006',
        formulario: { ouvidoDireito: true },
        resultadoExameSoc: {
          status: 'PENDENTE',
          attemptCount: 0,
        },
      },
      {
        grupo: 'Exame Clínico',
        nomeExame: 'Exame Clínico',
        codigoExame: 'CLI-01',
        sequencialResultadoExame: 'SEQ-002',
        codigoProfissional: '1007',
        formulario: { conclusao: 'Apto', observacoesMedicas: 'Sem alteracoes' },
      },
    ],
    ...overrides,
  });

  const makeService = (scheduling = makeScheduling()) => {
    const mongoService = {
      normalizeGroupName: jest.fn((value: string) =>
        String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toLowerCase(),
      ),
      getSchedulingById: jest.fn().mockResolvedValue(scheduling),
      schedulingsCollection: {
        updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
    };

    const azureService = {
      filaEnvioDeEmail: jest.fn().mockResolvedValue(undefined),
      downloadBlob: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };

    const service = new SocService(
      mongoService as any,
      azureService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        setContext: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      } as any,
    );

    return {
      service,
      mongoService,
    };
  };

  function mockFetchEmpty(): jest.SpyInstance {
    return jest.spyOn(global as any, 'fetch').mockResolvedValue({
      ok: false,
    } as Response);
  }

  function mockFetchReturning(data: any[]): jest.SpyInstance {
    return jest.spyOn(global as any, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(data),
    } as any);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processa com sucesso quando a mensagem de audiometria eh valida', async () => {
    const { service } = makeService();
    (WsResultadoExame as jest.Mock).mockResolvedValue({
      status: 200,
      responseText: '<ok/>',
    });

    const result = await service.processResultadoExameSocQueueMessage({
      schedulingId,
      grupo: 'Audiometria',
      examIndex: 0,
      requestedAt: new Date().toISOString(),
      requestId: 'req-1',
      sequencialFicha: 'FICHA-001',
      sequencialResultadoExame: 'SEQ-001',
      codigoExame: 'AUD-01',
    });

    expect(result).toEqual({ deleteMessage: true });
    expect(WsResultadoExame).toHaveBeenCalledWith(
      expect.objectContaining({ _id: schedulingId }),
      0,
    );
  });

  it('processa com sucesso exame nao-audiometria (Exame Clinico)', async () => {
    const { service } = makeService();
    (WsResultadoExame as jest.Mock).mockResolvedValue({
      status: 200,
      responseText: '<ok/>',
    });

    const result = await service.processResultadoExameSocQueueMessage({
      schedulingId,
      grupo: 'Exame Clínico',
      examIndex: 1,
      requestedAt: new Date().toISOString(),
      requestId: 'req-3',
      sequencialFicha: 'FICHA-001',
      sequencialResultadoExame: 'SEQ-002',
      codigoExame: 'CLI-01',
    });

    expect(result).toEqual({ deleteMessage: true });
    expect(WsResultadoExame).toHaveBeenCalledWith(
      expect.objectContaining({ _id: schedulingId }),
      1,
    );
  });

  it('marca falha e propaga erro tecnico quando o envio ao SOC falha', async () => {
    const { service } = makeService();
    (WsResultadoExame as jest.Mock).mockRejectedValue(
      new Error('SOC unavailable'),
    );

    await expect(
      service.processResultadoExameSocQueueMessage({
        schedulingId,
        grupo: 'Audiometria',
        examIndex: 0,
        requestedAt: new Date().toISOString(),
        requestId: 'req-2',
        sequencialFicha: 'FICHA-001',
        sequencialResultadoExame: 'SEQ-001',
        codigoExame: 'AUD-01',
      }),
    ).rejects.toThrow('SOC unavailable');
  });

  it('faz skip quando nao tem sequencialResultadoExame e REST API fallback tambem nao retorna', async () => {
    mockFetchEmpty();

    const scheduling = makeScheduling({
      EXAMES: [
        {
          grupo: 'Audiometria',
          codigoExame: 'AUD-01',
          sequencialResultadoExame: 'SEQ-001',
          codigoProfissional: '1006',
          formulario: { ouvidoDireito: true },
        },
        {
          grupo: 'Exame Clínico',
          nomeExame: 'Exame Clínico',
          codigoExame: 'CLI-01',
          sequencialResultadoExame: '', // Clear to test skip behavior
          codigoProfissional: '1007',
          formulario: { conclusao: 'Apto', observacoesMedicas: 'Sem alteracoes' },
        },
      ],
    });
    const { service } = makeService(scheduling);

    const result = await service.processResultadoExameSocQueueMessage({
      schedulingId,
      grupo: 'Exame Clínico',
      examIndex: 1,
      requestedAt: new Date().toISOString(),
    });

    expect(result).toEqual({ deleteMessage: true });
    expect(WsResultadoExame).not.toHaveBeenCalled();
  });

  it('recupera sequencial via REST API fallback quando exam esta vazio e API retorna o valor', async () => {
    const scheduling = makeScheduling({
      EXAMES: [
        {
          grupo: 'Audiometria',
          codigoExame: 'AUD-01',
          sequencialResultadoExame: '', // Vazio - precisa do fallback
          codigoProfissional: '1006',
          formulario: { ouvidoDireito: true },
        },
      ],
    });
    // Mock da REST API SOC retornando o sequencial
    mockFetchReturning([
      { CODIGOEXAME: 'AUD-01', SEQUENCIALRESULTADO: 'FALLBACK-SEQ', NOMEEXAME: 'AUDIOMETRIA' },
    ]);

    const { service, mongoService } = makeService(scheduling);
    (WsResultadoExame as jest.Mock).mockResolvedValue({
      status: 200,
      responseText: '<ok/>',
    });

    const result = await service.processResultadoExameSocQueueMessage({
      schedulingId,
      grupo: 'Audiometria',
      examIndex: 0,
      requestedAt: new Date().toISOString(),
    });

    expect(result).toEqual({ deleteMessage: true });
    // Deve ter atualizado o DB com o sequencial recuperado
    expect(mongoService.schedulingsCollection.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.anything() }),
      expect.objectContaining({
        $set: expect.objectContaining({
          'EXAMES.0.sequencialResultadoExame': 'FALLBACK-SEQ',
        }),
      }),
    );
    // Deve ter chamado o SOAP
    expect(WsResultadoExame).toHaveBeenCalledWith(
      expect.objectContaining({ _id: schedulingId }),
      0,
    );
  });
});
