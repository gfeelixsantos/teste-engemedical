import { FacialController } from './facial.controller';
import { PDFDocument } from 'pdf-lib';
import { BadGatewayException } from '@nestjs/common';

describe('FacialController', () => {
  async function createPdfBuffer() {
    const pdf = await PDFDocument.create();
    pdf.addPage([595.28, 841.89]);
    return Buffer.from(await pdf.save());
  }

  function createController() {
    const mockFacialService = {
      createSignatureSession: jest.fn(),
      getSignatureStatus: jest.fn(),
      getSignedDocument: jest.fn(),
      getEvidenceReport: jest.fn(),
    };
    const mockMongoService = {
      schedulingsCollection: {
        findOne: jest.fn(),
      },
    };
    const mockAtendimentoAuthService = {
      registerAuthValidation: jest.fn(),
    };
    const mockAzureService = {
      downloadBlob: jest.fn(),
      uploadPublic: jest.fn(),
      getPublicUrl: jest.fn().mockReturnValue(
        'https://blob.test/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
      ),
    };

    const controller = new FacialController(
      mockFacialService as any,
      mockMongoService as any,
      mockAtendimentoAuthService as any,
      mockAzureService as any,
    );

    return {
      controller,
      mockFacialService,
      mockMongoService,
      mockAtendimentoAuthService,
      mockAzureService,
    };
  }

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.INTERNAL_WORKER_TOKEN = 'worker-token';
  });

  it('deve criar sessao facial usando o termo gerado no worker', async () => {
    const {
      controller,
      mockFacialService,
      mockMongoService,
      mockAtendimentoAuthService,
      mockAzureService,
    } = createController();

    mockMongoService.schedulingsCollection.findOne.mockResolvedValue({
      _id: '64f000000000000000000001',
      NOME: 'Paciente Teste',
      CPFFUNCIONARIO: '123.456.789-09',
      CODIGOPRONTUARIO: 'PRONT001',
      CODIGOEMPRESA: 'EMP001',
      NOMEEMPRESA: 'Empresa Teste',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      CODIGO: 'FUNC001',
    });
    mockFacialService.createSignatureSession.mockResolvedValue({
      requestId: 'req-1',
      documentNonce: 'doc-1',
      signatureLink: 'https://bry.test/iframe',
      positioningModeUsed: 'CREATOR',
    });

    const pdfBuffer = await createPdfBuffer();

    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'inline',
        filename: 'TERMO_FACIAL.pdf',
        contentType: 'application/pdf',
        bufferBase64: pdfBuffer.toString('base64'),
        documentHash: 'h'.repeat(64),
      }),
    } as any);

    const response = await controller.createSession(
      {
        schedulingId: '64f000000000000000000001',
        funcionarioId: 'FUNC001',
        signerEmail: 'teste@cmso.com',
      },
      JSON.stringify({ codigo: 'op-1', nome: 'Operador', perfil: 'ATENDIMENTO' }),
      'http://127.0.0.1:3000',
    );

    expect(response).toEqual({
      requestId: 'req-1',
      documentNonce: 'doc-1',
      signatureLink: 'https://bry.test/iframe',
      positioningMode: 'CREATOR',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/pdfmake/facial/termo'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const termoPayload = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as any)?.body || '{}'),
    );
    expect(termoPayload.facial.provider).toBe('BRY_SIGN');
    expect(termoPayload.facial.relatorioEvidenciasUrl).toBeUndefined();
    expect(mockFacialService.createSignatureSession).toHaveBeenCalledWith(
      expect.objectContaining({
        signerName: 'Paciente Teste',
        personalIdentifier: '12345678909',
        signaturePage: 1,
      }),
    );
    expect(mockAtendimentoAuthService.registerAuthValidation).toHaveBeenCalledWith(
      '64f000000000000000000001',
      expect.objectContaining({
        metodo: 'FACIAL',
        status: 'PENDENTE',
        requestId: 'req-1',
      }),
    );
  });

  it('deve regenerar o termo facial em modo inline quando o blob nao existir', async () => {
    const {
      controller,
      mockFacialService,
      mockMongoService,
      mockAtendimentoAuthService,
      mockAzureService,
    } = createController();

    mockMongoService.schedulingsCollection.findOne.mockResolvedValue({
      _id: '64f000000000000000000001',
      NOME: 'Paciente Teste',
      CPFFUNCIONARIO: '123.456.789-09',
      CODIGOPRONTUARIO: 'PRONT001',
      CODIGOEMPRESA: 'EMP001',
      NOMEEMPRESA: 'Empresa Teste',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      CODIGO: 'FUNC001',
    });
    mockFacialService.createSignatureSession.mockResolvedValue({
      requestId: 'req-1',
      documentNonce: 'doc-1',
      signatureLink: 'https://bry.test/iframe',
      positioningModeUsed: 'CREATOR',
    });
    mockAzureService.downloadBlob.mockRejectedValue(
      Object.assign(new Error('The specified blob does not exist.'), {
        statusCode: 404,
        code: 'BlobNotFound',
      }),
    );

    const pdfBuffer = await createPdfBuffer();
    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'uploaded',
          url: 'https://blob.test/public/autenticacao/PRONT001/termo-aceite.pdf',
          blobPath: 'autenticacao/PRONT001/termo-aceite.pdf',
          documentHash: 'h'.repeat(64),
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'inline',
          filename: 'TERMO_FACIAL.pdf',
          contentType: 'application/pdf',
          bufferBase64: pdfBuffer.toString('base64'),
          documentHash: 'i'.repeat(64),
        }),
      } as any);

    const response = await controller.createSession(
      {
        schedulingId: '64f000000000000000000001',
        funcionarioId: 'FUNC001',
        signerEmail: 'teste@cmso.com',
      },
      JSON.stringify({ codigo: 'op-1', nome: 'Operador', perfil: 'ATENDIMENTO' }),
      'http://127.0.0.1:3000',
    );

    expect(response).toEqual({
      requestId: 'req-1',
      documentNonce: 'doc-1',
      signatureLink: 'https://bry.test/iframe',
      positioningMode: 'CREATOR',
    });
    expect(mockAzureService.downloadBlob).toHaveBeenCalledWith(
      'https://blob.test/public/autenticacao/PRONT001/termo-aceite.pdf',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      String((fetchMock.mock.calls[1]?.[1] as any)?.body || '{}'),
    );
    expect(secondBody.forceInline).toBe(true);
  });

  it('deve finalizar sessao facial e persistir evidencias assinadas', async () => {
    const {
      controller,
      mockFacialService,
      mockMongoService,
      mockAtendimentoAuthService,
      mockAzureService,
    } = createController();

    mockMongoService.schedulingsCollection.findOne.mockResolvedValue({
      _id: '64f000000000000000000001',
      NOME: 'Paciente Teste',
      CPFFUNCIONARIO: '123.456.789-09',
      CODIGOPRONTUARIO: 'PRONT001',
      CODIGOEMPRESA: 'EMP001',
      NOMEEMPRESA: 'Empresa Teste',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      CODIGO: 'FUNC001',
    });
    mockFacialService.getSignatureStatus.mockResolvedValue({
      status: 'FINISHED',
      signerStatus: 'SIGNED',
      isComplete: true,
    });
    mockFacialService.getSignedDocument.mockResolvedValue(
      Buffer.from('signed-pdf'),
    );
    mockFacialService.getEvidenceReport.mockResolvedValue(
      Buffer.from('report-pdf'),
    );
    mockAzureService.uploadPublic
      .mockResolvedValueOnce('https://blob.test/public/autenticacao/PRONT001/termo-aceite.pdf')
      .mockResolvedValueOnce('https://blob.test/public/autenticacao/PRONT001/relatorio-evidencias.pdf');

    const response = await controller.finalizeSession(
      {
        schedulingId: '64f000000000000000000001',
        requestId: 'req-1',
        documentNonce: 'doc-1',
      },
      JSON.stringify({ codigo: 'op-1', nome: 'Operador', perfil: 'ATENDIMENTO' }),
    );

    expect(response).toEqual({
      success: true,
      requestId: 'req-1',
      documentNonce: 'doc-1',
      termoCienciaUrl: 'https://blob.test/public/autenticacao/PRONT001/termo-aceite.pdf',
      relatorioEvidenciasUrl:
        'https://blob.test/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
    });
    expect(mockAtendimentoAuthService.registerAuthValidation).toHaveBeenCalledWith(
      '64f000000000000000000001',
      expect.objectContaining({
        metodo: 'FACIAL',
        status: 'VALIDADO',
        evidencias: expect.objectContaining({
          termoCienciaUrl: 'https://blob.test/public/autenticacao/PRONT001/termo-aceite.pdf',
          relatorioEvidenciasUrl:
            'https://blob.test/public/autenticacao/PRONT001/relatorio-evidencias.pdf',
        }),
      }),
    );
    expect(mockAzureService.uploadPublic).toHaveBeenNthCalledWith(
      1,
      'public',
      'autenticacao/PRONT001/termo-aceite.pdf',
      expect.any(Buffer),
      'application/pdf',
    );
    expect(mockAzureService.uploadPublic).toHaveBeenNthCalledWith(
      2,
      'public',
      'autenticacao/PRONT001/relatorio-evidencias.pdf',
      expect.any(Buffer),
      'application/pdf',
    );
  });

  it('deve falhar a criacao da sessao quando o BRy rejeita o envelope', async () => {
    const {
      controller,
      mockFacialService,
      mockMongoService,
      mockAtendimentoAuthService,
    } = createController();

    mockMongoService.schedulingsCollection.findOne.mockResolvedValue({
      _id: '64f000000000000000000001',
      NOME: 'Paciente Teste',
      CPFFUNCIONARIO: '123.456.789-09',
      CODIGOPRONTUARIO: 'PRONT001',
      CODIGOEMPRESA: 'EMP001',
      NOMEEMPRESA: 'Empresa Teste',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      CODIGO: 'FUNC001',
    });
    mockFacialService.createSignatureSession.mockRejectedValue(
      new Error('error detecting image type'),
    );

    const pdfBuffer = await createPdfBuffer();

    jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'inline',
        filename: 'TERMO_FACIAL.pdf',
        contentType: 'application/pdf',
        bufferBase64: pdfBuffer.toString('base64'),
        documentHash: 'h'.repeat(64),
      }),
    } as any);

    await expect(
      controller.createSession(
        {
          schedulingId: '64f000000000000000000001',
          funcionarioId: 'FUNC001',
          signerEmail: 'teste@cmso.com',
        },
        JSON.stringify({
          codigo: 'op-1',
          nome: 'Operador',
          perfil: 'ATENDIMENTO',
        }),
        'http://127.0.0.1:3000',
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(
      mockAtendimentoAuthService.registerAuthValidation,
    ).not.toHaveBeenCalled();
  });
});
