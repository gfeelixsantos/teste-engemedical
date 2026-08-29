import { AuditLogService } from 'src/audit-log/audit-log.service';
import { MongoService } from 'src/mongo/mongo.service';
import { BiometriaLgpdTermoService } from './biometria-lgpd-termo.service';

describe('BiometriaLgpdTermoService', () => {
  let service: BiometriaLgpdTermoService;
  let mongoService: {
    getLatestSchedulingContextByProntuario: jest.Mock;
    atualizarBiometriaLgpd: jest.Mock;
    updateSchedulingAuthInfo: jest.Mock;
  };
  let auditLogService: {
    logUserAction: jest.Mock;
  };
  let fetchMock: jest.Mock;

  const baseArgs = {
    biometriaId: '682e0d6f53d5c153584c0d11',
    schedulingId: '64f000000000000000000001',
    requestId: 'engemedical-connect_1748330000000_ef45gh6',
    funcionario: {
      id: 'func-001',
      nome: 'Paciente Teste',
      cpf: '12345678909',
      prontuario: 'PRONT001',
      dataNascimento: '1990-01-01',
    },
    operador: {
      id: 'OPER-001',
      nome: 'Operador Teste',
      perfil: 'RECEPCAO',
    },
    unidade: 'RIO CLARO',
    dedo: 'INDICADOR_DIREITO',
    templateStorage: 'ENCRYPTED_AES_256_GCM',
    templateVersion: 'futronic-ansi-v1',
    digitalDocumentalBlobPath: 'biometria/PRONT001/INDICADOR_DIREITO.png',
    cadastradoEm: new Date('2026-05-27T11:30:00.000Z'),
  };

  beforeEach(() => {
    mongoService = {
      getLatestSchedulingContextByProntuario: jest.fn().mockResolvedValue({
        NOME: 'Paciente Teste',
        NOMEEMPRESA: 'Empresa Teste',
        UNIDADEATENDIMENTO: 'RIO CLARO',
        CODIGOPRONTUARIO: 'PRONT001',
        DATAAGENDAMENTO: '27/05/2026',
      }),
      atualizarBiometriaLgpd: jest.fn().mockResolvedValue(true),
      updateSchedulingAuthInfo: jest.fn().mockResolvedValue(undefined),
      db: {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({
            metadata: { operadorNome: 'Operador Teste' },
          }),
        }),
      },
      schedulingsCollection: {
        findOne: jest.fn(),
      },
    };

    auditLogService = {
      logUserAction: jest.fn(),
    };

    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    process.env.WORKER_INTERNAL_BASE_URL = 'http://worker-internal:3001';
    process.env.INTERNAL_WORKER_TOKEN = 'worker-token';
    service = new BiometriaLgpdTermoService(
      mongoService as unknown as MongoService,
      auditLogService as unknown as AuditLogService,
    );
  });

  afterEach(() => {
    delete process.env.WORKER_INTERNAL_BASE_URL;
    delete process.env.INTERNAL_WORKER_TOKEN;
    delete (global as any).fetch;
    jest.clearAllMocks();
  });

  it('deve ignorar cadastros sem template criptografado oficial', async () => {
    const result = await service.registrarTermoPosCadastro({
      ...baseArgs,
      templateStorage: 'PENDING_ENGINE',
    });

    expect(result).toEqual({
      success: false,
      motivo: 'TEMPLATE_STORAGE_INCOMPATIVEL',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mongoService.atualizarBiometriaLgpd).not.toHaveBeenCalled();
    expect(auditLogService.logUserAction).not.toHaveBeenCalled();
  });

  it('deve chamar o worker interno e persistir documentoTermoUrl/documentoTermoHash', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'uploaded',
        url: 'https://blob.test/termos/2026/05/EMPRESA/TERMO.pdf',
        blobPath: 'termos/2026/05/EMPRESA/TERMO.pdf',
        documentHash: 'a'.repeat(64),
      }),
    });

    const result = await service.registrarTermoPosCadastro(baseArgs);

    expect(result).toEqual({
      success: true,
      termoCienciaUrl: 'https://blob.test/termos/2026/05/EMPRESA/TERMO.pdf',
      termoCienciaHash: 'a'.repeat(64),
      relatorioEvidenciasUrl:
        'https://cmsodocs.blob.core.windows.net/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
      relatorioEvidenciasHash: null,
      lgpdPersistido: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://worker-internal:3001/pdfmake/biometria/termo',
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': 'worker-token',
      },
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(payload.funcionario.nome).toBe('Paciente Teste');
    expect(payload.operador.nome).toBe('Operador Teste');
    expect(payload.funcionario.cpfMascarado).toBe('***.456.***-09');
    expect(payload.funcionario.cpf).toBeUndefined();
    expect(payload.validadeDias).toBe(365);
    expect(payload.versaoTermo).toBe('v1.1');
    expect(payload.lgpd.baseLegalCode).toBeDefined();
    expect(payload.lgpd.baseLegalTexto).toContain('atendimento ocupacional');

    expect(mongoService.atualizarBiometriaLgpd).toHaveBeenCalledTimes(2);
    expect(mongoService.atualizarBiometriaLgpd).toHaveBeenNthCalledWith(
      1,
      '682e0d6f53d5c153584c0d11',
      expect.objectContaining({
        versaoTermo: 'v1.1',
        validadeAte: '2027-05-27T11:30:00.000Z',
      }),
    );
    expect(mongoService.atualizarBiometriaLgpd).toHaveBeenLastCalledWith(
      '682e0d6f53d5c153584c0d11',
      expect.objectContaining({
        documentoTermoUrl:
          'https://blob.test/termos/2026/05/EMPRESA/TERMO.pdf',
        documentoTermoHash: 'a'.repeat(64),
        relatorioEvidenciasUrl:
          'https://cmsodocs.blob.core.windows.net/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
        relatorioEvidenciasHash: null,
      }),
    );
    expect(mongoService.updateSchedulingAuthInfo).toHaveBeenCalledWith(
      '64f000000000000000000001',
      expect.objectContaining({
        metodo: 'BIOMETRIA',
        status: 'VALIDADO',
        requestId: 'engemedical-connect_1748330000000_ef45gh6',
        validadoEm: '2026-05-27T11:30:00.000Z',
        validadoPor: 'Operador Teste',
        evidencias: {
          termoCienciaUrl:
            'https://blob.test/termos/2026/05/EMPRESA/TERMO.pdf',
          termoCienciaHash: 'a'.repeat(64),
          relatorioEvidenciasUrl:
            'https://cmsodocs.blob.core.windows.net/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
          relatorioEvidenciasHash: null,
        },
        biometria: {
          cadastroId: 'PRONT001',
          dedo: 'INDICADOR_DIREITO',
          templateVersion: 'futronic-ansi-v1',
        },
      }),
    );
    expect(auditLogService.logUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'BIOMETRIA_CIENCIA_REGISTRADA',
        requestId: 'engemedical-connect_1748330000000_ef45gh6',
      }),
    );
    expect(auditLogService.logUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'BIOMETRIA_TERMO_GERADO',
        requestId: 'engemedical-connect_1748330000000_ef45gh6',
      }),
    );
  });

  it('deve registrar base LGPD mesmo quando o worker falhar', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'UPLOAD_NAO_DISPONIVEL',
    });

    const result = await service.registrarTermoPosCadastro(baseArgs);

    expect(result).toEqual({
      success: false,
      lgpdPersistido: true,
      motivo: 'FALHA_GERACAO_TERMO',
    });

    expect(mongoService.atualizarBiometriaLgpd).toHaveBeenCalledTimes(1);
    expect(mongoService.atualizarBiometriaLgpd).toHaveBeenCalledWith(
      '682e0d6f53d5c153584c0d11',
      expect.objectContaining({
        versaoTermo: 'v1.1',
        validadeAte: '2027-05-27T11:30:00.000Z',
        documentoTermoUrl: null,
        documentoTermoHash: null,
      }),
    );
    expect(auditLogService.logUserAction).toHaveBeenCalledTimes(1);
    expect(auditLogService.logUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'BIOMETRIA_CIENCIA_REGISTRADA',
      }),
    );
    expect(mongoService.updateSchedulingAuthInfo).not.toHaveBeenCalled();
  });

  it('deve gerar termo facial mesmo sem biometriaId usando o endpoint facial', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'uploaded',
        url: 'https://blob.test/termos/2026/05/EMPRESA/TERMO_FACIAL.pdf',
        blobPath: 'termos/2026/05/EMPRESA/TERMO_FACIAL.pdf',
        documentHash: 'b'.repeat(64),
        relatorioEvidenciasUrl:
          'https://cmsodocs.blob.core.windows.net/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
        relatorioEvidenciasHash: 'c'.repeat(64),
      }),
    });

    await service.registrarTermoPosCadastro({
      requestId: 'req_facial_001',
      schedulingId: '64f000000000000000000001',
      funcionario: {
        id: 'func-002',
        nome: 'Paciente Facial',
        cpf: '12345678909',
        prontuario: 'PRONT001',
        dataNascimento: '1990-01-01',
      },
      operador: {
        id: 'OPER-002',
        nome: 'Operador Facial',
        perfil: 'RECEPCAO',
      },
      unidade: 'RIO CLARO',
      dedo: 'FACIAL',
      templateStorage: 'ENCRYPTED_AES_256_GCM',
      templateVersion: 'facial-v1',
      digitalDocumentalBlobPath: 'facial/PRONT001/representativa.jpg',
      cadastradoEm: new Date('2026-05-27T11:30:00.000Z'),
      origem: 'FACIAL',
      facial: {
        provider: 'BRY_SIGN',
        sessionId: 'session-123',
        transactionId: 'tx-123',
        relatorioEvidenciasUrl: 'https://blob.test/evidencias/facial.pdf',
        relatorioEvidenciasHash: 'c'.repeat(64),
      },
    } as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://worker-internal:3001/pdfmake/facial/termo',
    );

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(payload.facial.provider).toBe('BRY_SIGN');
    expect(payload.facial.sessionId).toBe('session-123');
    expect(payload.facial.relatorioEvidenciasUrl).toBe(
      'https://blob.test/evidencias/facial.pdf',
    );
    expect(mongoService.atualizarBiometriaLgpd).not.toHaveBeenCalled();
    expect(mongoService.updateSchedulingAuthInfo).toHaveBeenCalledWith(
      '64f000000000000000000001',
      expect.objectContaining({
        metodo: 'FACIAL',
        status: 'VALIDADO',
        requestId: 'req_facial_001',
        validadoEm: '2026-05-27T11:30:00.000Z',
        validadoPor: 'Operador Facial',
        evidencias: {
          termoCienciaUrl:
            'https://blob.test/termos/2026/05/EMPRESA/TERMO_FACIAL.pdf',
          termoCienciaHash: 'b'.repeat(64),
          relatorioEvidenciasUrl:
            'https://cmsodocs.blob.core.windows.net/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
          relatorioEvidenciasHash: 'c'.repeat(64),
        },
        facial: {
          provider: 'BRY_SIGN',
          sessionId: 'session-123',
          transactionId: 'tx-123',
          imagemRepresentativaUrl: null,
          imagemRepresentativaHash: null,
          confidence: null,
        },
      }),
    );
  });
});
