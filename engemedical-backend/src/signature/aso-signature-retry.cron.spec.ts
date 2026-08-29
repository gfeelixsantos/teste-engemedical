import { AsoSignatureRetryCronService } from './aso-signature-retry.cron';

const mockWorkerOrchestrator = {
  callWorker: jest.fn(),
  buildWorkerPayload: jest.fn(),
};

describe('AsoSignatureRetryCronService', () => {
  const originalEnv = process.env;

  const createService = () => {
    const mongoService = {
      schedulingsCollection: {
        find: jest.fn(),
        updateOne: jest.fn(),
      },
      applyAsoResultFromWorker: jest.fn(),
    } as any;

    const supabaseService = {
      getUserSettings: jest.fn(),
      getValidPscSession: jest.fn(),
    } as any;

    const azureService = {
      filaAsoEnriquecimento: jest.fn(),
      filaAsoProcessing: jest.fn(),
    } as any;

    const service = new AsoSignatureRetryCronService(
      mongoService,
      supabaseService,
      azureService,
      mockWorkerOrchestrator as any,
    );

    return { service, mongoService, supabaseService, azureService };
  };

  const asChainedCursor = (items: any[]) => ({
    limit: () => ({
      toArray: () => Promise.resolve(items),
    }),
  });

  const makeBaseDoc = (overrides: Record<string, any> = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    NOME: 'Paciente Teste',
    NOMEEMPRESA: 'Empresa Teste',
    TIPOEXAMENOME: 'ADMISSIONAL',
    CODIGOEMPRESA: '991254',
    MEDICO: '1698',
    ASOINFO: {
      status: 'PENDENTE',
      url: 'https://blob/aso/teste.pdf',
      signature: {
        requiresSignature: true,
        status: 'PENDENTE',
        retry: {
          pending: true,
          count: 1,
          nextRetryAt: new Date(Date.now() - 60000),
        },
      },
      emailSent: false,
      professional: {
        codigo: '1698',
        nome: 'Dra Exemplo',
        cpf: '12345678900',
      },
      ...(overrides.ASOINFO || {}),
    },
    ...Object.fromEntries(
      Object.entries(overrides).filter(([k]) => k !== 'ASOINFO'),
    ),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips when disabled by env var', async () => {
    process.env.ASO_SIGNATURE_RETRY_ENABLED = 'false';
    const { service, mongoService } = createService();

    await service.handleAsoRetries();

    expect(mongoService.schedulingsCollection.find).not.toHaveBeenCalled();
  });

  it('skips when previous batch is still processing', async () => {
    process.env.ASO_SIGNATURE_RETRY_ENABLED = 'true';
    const { service, mongoService } = createService();

    (service as any).isProcessing = true;
    await service.handleAsoRetries();

    expect(mongoService.schedulingsCollection.find).not.toHaveBeenCalled();
  });

  it('processes signature retries and calls checkProfessionalCapability', async () => {
    const { service, mongoService, supabaseService, azureService } =
      createService();

    const doc = makeBaseDoc();

    mongoService.schedulingsCollection.find.mockReturnValue(asChainedCursor([doc]));
    supabaseService.getUserSettings.mockResolvedValue({
      assina_digitalmente: true,
      assinatura_provider: 'PSC',
    });
    supabaseService.getValidPscSession.mockResolvedValue({
      signature_session: 'valid-token',
    });

    await service.handleAsoRetries();

    expect(azureService.filaAsoEnriquecimento).toHaveBeenCalled();
    expect((service as any).isProcessing).toBe(false);
  });
});
