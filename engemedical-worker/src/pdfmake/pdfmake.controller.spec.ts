import { UnauthorizedException } from '@nestjs/common';
import { PdfmakeController } from './pdfmake.controller';

describe('PdfmakeController', () => {
  const validInput = {
    requestId: 'req-123',
    versaoTermo: 'v1.0',
    validadeDias: 365,
    validadeAte: '2027-05-27T10:00:00.000Z',
    funcionario: {
      nome: 'MARIA TESTE',
      codigo: 'FUNC-001',
      cpfMascarado: '***.222.***-44',
    },
    empresa: { nome: 'EMPRESA TESTE' },
    clinica: {
      nome: 'CENTRO MEDICO SAUDE OCUPACIONAL',
      contatoDpo: 'dpo@cms.test',
    },
    atendimento: {
      unidade: 'RIO CLARO',
      dataHora: '2026-05-27T10:00:00.000Z',
    },
    biometria: {
      dedo: 'INDICADOR_DIREITO',
      relatorioEvidenciasUrl: 'https://blob.test/evidencias/biometria.pdf',
      digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
      digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
      templateVersion: 'futronic-ansi-v1',
      templateStorage: 'ENCRYPTED_AES_256_GCM',
    },
    lgpd: {
      baseLegalCode: 'PROTECAO_DA_SAUDE',
      baseLegalTexto:
        'Protecao da saude e demais hipoteses legalmente aplicaveis ao atendimento ocupacional.',
      finalidade: 'VALIDACAO_IDENTIDADE_ATENDIMENTO_OCUPACIONAL',
      cienciaRegistradaEm: '2026-05-27T10:00:00.000Z',
      cienciaRegistradaPor: 'OPER-001',
      alternativaDisponivel: true,
    },
    operador: { codigo: 'OPER-001', nome: 'OPERADOR TESTE' },
  };

  const validFacialInput = {
    requestId: 'req-facial-123',
    versaoTermo: 'v1.0',
    validadeDias: 365,
    validadeAte: '2027-05-27T10:00:00.000Z',
    funcionario: {
      nome: 'MARIA TESTE',
      codigo: 'FUNC-001',
      cpfMascarado: '***.222.***-44',
    },
    empresa: { nome: 'EMPRESA TESTE' },
    clinica: {
      nome: 'CENTRO MEDICO SAUDE OCUPACIONAL',
      contatoDpo: 'dpo@cms.test',
    },
    atendimento: {
      unidade: 'RIO CLARO',
      dataHora: '2026-05-27T10:00:00.000Z',
    },
    facial: {
      provider: 'BRY_SIGN',
      sessionId: 'session-001',
      transactionId: 'tx-001',
      relatorioEvidenciasUrl: 'https://blob.test/evidencias/facial.pdf',
      relatorioEvidenciasHash: 'c'.repeat(64),
    },
    lgpd: {
      baseLegalCode: 'PROTECAO_DA_SAUDE',
      baseLegalTexto:
        'Protecao da saude e demais hipoteses legalmente aplicaveis ao atendimento ocupacional.',
      finalidade: 'VALIDACAO_IDENTIDADE_ATENDIMENTO_OCUPACIONAL',
      cienciaRegistradaEm: '2026-05-27T10:00:00.000Z',
      cienciaRegistradaPor: 'OPER-001',
      alternativaDisponivel: true,
    },
    operador: { codigo: 'OPER-001', nome: 'OPERADOR TESTE' },
  };

  beforeEach(() => {
    process.env.INTERNAL_WORKER_TOKEN = 'worker-token';
  });

  afterEach(() => {
    delete process.env.INTERNAL_WORKER_TOKEN;
    jest.clearAllMocks();
  });

  it('deve exigir x-internal-token valido', async () => {
    const controller = new PdfmakeController(
      {} as any,
      { gerar: jest.fn() } as any,
      { gerar: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    await expect(
      controller.gerarTermoBiometria(undefined, validInput as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve retornar payload de upload quando o blob estiver disponivel', async () => {
    const gerar = jest.fn().mockResolvedValue({
      url: 'https://blob.test/termos/abc.pdf',
      blobPath: 'termos/2026/05/EMPRESA/abc.pdf',
      documentHash: 'a'.repeat(64),
    });
    const controller = new PdfmakeController(
      {} as any,
      { gerar } as any,
      { gerar: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    const result = await controller.gerarTermoBiometria(
      'worker-token',
      validInput as any,
    );

    expect(gerar).toHaveBeenCalledWith(validInput);
    expect(result).toEqual({
      mode: 'uploaded',
      url: 'https://blob.test/termos/abc.pdf',
      blobPath: 'termos/2026/05/EMPRESA/abc.pdf',
      documentHash: 'a'.repeat(64),
    });
  });

  it('deve retornar payload inline quando o service nao subir para o blob', async () => {
    const gerar = jest.fn().mockResolvedValue({
      buffer: Buffer.from('pdf-inline'),
      contentType: 'application/pdf',
      filename: 'TERMO_TESTE.pdf',
      documentHash: 'b'.repeat(64),
    });
    const controller = new PdfmakeController(
      {} as any,
      { gerar } as any,
      { gerar: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    const result = await controller.gerarTermoBiometria(
      'worker-token',
      validInput as any,
    );

    expect(result).toEqual({
      mode: 'inline',
      filename: 'TERMO_TESTE.pdf',
      contentType: 'application/pdf',
      bufferBase64: Buffer.from('pdf-inline').toString('base64'),
      documentHash: 'b'.repeat(64),
    });
  });

  it('deve expor rota interna de termo facial', async () => {
    const gerar = jest.fn().mockResolvedValue({
      url: 'https://blob.test/termos/facial.pdf',
      blobPath: 'termos/2026/05/EMPRESA/facial.pdf',
      documentHash: 'd'.repeat(64),
      relatorioEvidenciasUrl:
        'https://blob.test/public/autenticacao/prt-001/relatorio-evidencias.pdf',
      relatorioEvidenciasHash: 'e'.repeat(64),
    });

    const controller = new PdfmakeController(
      {} as any,
      { gerar: jest.fn() } as any,
      { gerar } as any,
      {} as any,
      {} as any,
    );

    const result = await controller.gerarTermoFacial(
      'worker-token',
      validFacialInput as any,
    );

    expect(gerar).toHaveBeenCalledWith(validFacialInput);
    expect(result).toEqual({
      mode: 'uploaded',
      url: 'https://blob.test/termos/facial.pdf',
      blobPath: 'termos/2026/05/EMPRESA/facial.pdf',
      documentHash: 'd'.repeat(64),
      relatorioEvidenciasUrl:
        'https://blob.test/public/autenticacao/prt-001/relatorio-evidencias.pdf',
      relatorioEvidenciasHash: 'e'.repeat(64),
    });
  });

  it('deve aceitar termo-consentimento unificado via nova rota', async () => {
    const gerar = jest.fn().mockResolvedValue({
      url: 'https://blob.test/termos/consentimento.pdf',
      blobPath: 'termos/2026/05/EMPRESA/consentimento.pdf',
      documentHash: 'e'.repeat(64),
      relatorioEvidenciasUrl: 'https://blob.test/validacao/2026/prt-001.pdf',
    });

    const controller = new PdfmakeController(
      {} as any,
      { gerar: jest.fn() } as any,
      { gerar: jest.fn() } as any,
      {} as any,
      { gerar } as any,
    );

    const result = await controller.gerarTermoConsentimento(
      'worker-token',
      { tipo: 'BIOMETRIA', ...validInput } as any,
    );

    expect(gerar).toHaveBeenCalledWith({ tipo: 'BIOMETRIA', ...validInput });
    expect(result).toEqual({
      mode: 'uploaded',
      url: 'https://blob.test/termos/consentimento.pdf',
      blobPath: 'termos/2026/05/EMPRESA/consentimento.pdf',
      documentHash: 'e'.repeat(64),
      relatorioEvidenciasUrl: 'https://blob.test/validacao/2026/prt-001.pdf',
    });
  });
});
