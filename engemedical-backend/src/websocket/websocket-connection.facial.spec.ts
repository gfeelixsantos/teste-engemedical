import { WebsocketGateway } from './websocket-connection';
import { EventType } from './events/events';

function criarMockServer() {
  const mockRoom = { emit: jest.fn() };
  return {
    emit: jest.fn(),
    to: jest.fn().mockReturnValue(mockRoom),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
  };
}

function criarMockClient() {
  return {
    id: 'client-facial-1',
    emit: jest.fn(),
    handshake: { address: '127.0.0.1' },
  } as any;
}

function criarGateway() {
  const mockServer = criarMockServer();
  const mockMongo = {
    schedulingsCollection: {
      findOne: jest.fn(),
    },
  };
  const mockCrypto = {};
  const mockSoc = {};
  const mockPush = {};
  const mockTts = {};
  const mockAzure = {
    uploadFacialImage: jest.fn(),
    generateSasUrlFromUrl: jest.fn(),
    uploadPublic: jest.fn(),
  };
  const mockAuditLog = {
    logUserAction: jest.fn(),
  };
  const mockBiometriaLgpdTermo = {
    registrarTermoPosCadastro: jest.fn(),
  };
  const mockAtendimentoAuth = {
    registerAuthValidation: jest.fn(),
    appendAuthEvidence: jest.fn(),
  };
  const mockFacialService = {
    iniciarTransacao: jest.fn(),
    consultarStatus: jest.fn(),
    processarResultado: jest.fn(),
    getEvidenceReport: jest.fn(),
  };
  const mockTeleatendimentoService = {};
  const gateway = new WebsocketGateway(
    {} as any,
    mockMongo as any,
    mockCrypto as any,
    mockSoc as any,
    mockPush as any,
    mockTts as any,
    mockAzure as any,
    mockAuditLog as any,
    mockBiometriaLgpdTermo as any,
    mockAtendimentoAuth as any,
    mockFacialService as any,
    mockTeleatendimentoService as any,
  );

  (gateway as any).server = mockServer;

  return {
    gateway,
    mockServer,
    mockMongo,
    mockAzure,
    mockAuditLog,
    mockBiometriaLgpdTermo,
    mockAtendimentoAuth,
    mockFacialService,
  };
}

describe('WebsocketGateway - Facial', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve iniciar a transacao facial e registrar termo sem URL de redirect no payload', async () => {
    const { gateway, mockMongo, mockBiometriaLgpdTermo, mockFacialService } =
      criarGateway();
    const client = criarMockClient();

    mockMongo.schedulingsCollection.findOne.mockResolvedValue({
      NOME: 'Paciente Facial',
      CPFFUNCIONARIO: '123.456.789-09',
      CODIGOPRONTUARIO: 'PRONT001',
    });
    mockFacialService.iniciarTransacao.mockResolvedValue({
      sessionId: 'session-1',
      transactionId: 'tx-1',
      redirectUrl: 'https://bry.test/redirect',
    });
    mockBiometriaLgpdTermo.registrarTermoPosCadastro.mockResolvedValue(undefined);

    await gateway.handleFacialCadastroRequest(
      {
        schedulingId: '64f000000000000000000001',
        unidade: 'RIO CLARO',
        sala: 'SALA 1',
        estacaoId: 'EST-1',
        funcionario: {
          id: 'func-1',
          nome: 'Paciente Facial',
          cpf: '12345678909',
          prontuario: 'PRONT001',
        },
        operador: {
          id: 'op-1',
          nome: 'Operador',
          perfil: 'RECEPCAO',
        },
        origem: 'ATENDIMENTO',
        solicitadoEm: '2026-05-27T11:30:00.000Z',
      } as any,
      client,
    );

    expect(mockFacialService.iniciarTransacao).toHaveBeenCalledWith(
      expect.objectContaining({
        schedulingId: '64f000000000000000000001',
        funcionario: expect.objectContaining({
          nome: 'Paciente Facial',
          cpf: '12345678909',
          prontuario: 'PRONT001',
        }),
      }),
    );
    expect(mockBiometriaLgpdTermo.registrarTermoPosCadastro).toHaveBeenCalledWith(
      expect.objectContaining({
        origem: 'FACIAL',
        schedulingId: '64f000000000000000000001',
        facial: expect.objectContaining({
          provider: 'BRY_SIGN',
          sessionId: 'session-1',
          transactionId: 'tx-1',
        }),
      }),
    );
    expect(
      mockBiometriaLgpdTermo.registrarTermoPosCadastro.mock.calls[0][0].facial
        .relatorioEvidenciasUrl,
    ).toBeUndefined();
    expect(client.emit).toHaveBeenCalledWith(
      EventType.FACIAL_CADASTRO_COMMAND,
      expect.objectContaining({
        sessionId: 'session-1',
        transactionId: 'tx-1',
        redirectUrl: 'https://bry.test/redirect',
      }),
    );
  });

  it('deve persistir resultado facial com relatorio PDF canonico no scheduling', async () => {
    const { gateway, mockAzure, mockAtendimentoAuth, mockFacialService } =
      criarGateway();
    const client = criarMockClient();
    const pendingMap = new Map();
    const requestId = 'req-facial-1';
    pendingMap.set(requestId, {
      requestId,
      clientId: client.id,
      unidade: 'RIO CLARO',
      sala: 'SALA 1',
      estacaoId: 'EST-1',
      funcionarioId: 'func-1',
      prontuario: 'PRONT001',
      operadorId: 'op-1',
      operadorNome: 'Operador',
      operadorPerfil: 'RECEPCAO',
      schedulingId: '64f000000000000000000001',
      sessionId: 'session-1',
      transactionId: 'tx-1',
      redirectUrl: 'https://bry.test/redirect',
      createdAt: new Date(),
      timeoutRef: setTimeout(() => {}, 0),
    });
    (gateway as any).pendingFacialRequests = pendingMap;

    mockAzure.uploadFacialImage.mockResolvedValue('facial/PRONT001/representativa.jpg');
    mockAzure.generateSasUrlFromUrl.mockReturnValue(
      'https://blob.test/facial/PRONT001/representativa.jpg?sas=1',
    );
    mockFacialService.getEvidenceReport.mockResolvedValue(
      Buffer.from('report-pdf'),
    );
    mockAzure.uploadPublic.mockResolvedValue(
      'https://cmsodocs.blob.core.windows.net/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
    );
    mockAtendimentoAuth.registerAuthValidation.mockResolvedValue(undefined);

    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({
        ok: true,
        arrayBuffer: async () =>
          Buffer.from('image-bytes').buffer.slice(0),
        headers: {
          get: () => 'image/jpeg',
        },
      } as any);

    await gateway.handleFacialCadastroResult(
      {
        requestId,
        schedulingId: '64f000000000000000000001',
        status: 'concluido',
        facialId: 'face-1',
        confidence: 0.98,
        imagemUrl: 'https://bry.test/facial.jpg',
        imagemHash: 'f'.repeat(64),
        termoCienciaUrl: 'https://blob.test/termo.pdf',
        termoCienciaHash: 't'.repeat(64),
      } as any,
      client,
    );

    expect(fetchMock).toHaveBeenCalledWith('https://bry.test/facial.jpg');
    expect(mockAzure.uploadFacialImage).toHaveBeenCalledWith(
      'PRONT001',
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(mockFacialService.getEvidenceReport).toHaveBeenCalledWith(
      'session-1',
      'tx-1',
    );
    expect(mockAzure.uploadPublic).toHaveBeenCalledWith(
      'public',
      'autenticacao/PRONT001/relatorio-evidencias.pdf',
      expect.any(Buffer),
      'application/pdf',
    );
    expect(mockAtendimentoAuth.registerAuthValidation).toHaveBeenCalledWith(
      '64f000000000000000000001',
      expect.objectContaining({
        metodo: 'FACIAL',
        status: 'VALIDADO',
        requestId,
        validadoPor: 'Operador',
        facial: expect.objectContaining({
          provider: 'BRY_SIGN',
          sessionId: 'session-1',
          transactionId: 'tx-1',
          confidence: 0.98,
          imagemRepresentativaUrl:
            'https://blob.test/facial/PRONT001/representativa.jpg?sas=1',
        }),
        evidencias: expect.objectContaining({
          termoCienciaUrl: 'https://blob.test/termo.pdf',
          termoCienciaHash: 't'.repeat(64),
          relatorioEvidenciasUrl:
            'https://cmsodocs.blob.core.windows.net/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
          relatorioEvidenciasHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(client.emit).toHaveBeenCalledWith(
      EventType.FACIAL_CADASTRO_RESULT,
      expect.objectContaining({
        status: 'concluido',
        facialId: 'face-1',
      }),
    );
  });
});
