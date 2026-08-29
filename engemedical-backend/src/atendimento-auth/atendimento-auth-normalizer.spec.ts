import {
  buildUnifiedAtendimentoAuthInfo,
} from './atendimento-auth-normalizer';

describe('buildUnifiedAtendimentoAuthInfo', () => {
  it('deve preencher SOC com biometria e facial nulos', () => {
    const result = buildUnifiedAtendimentoAuthInfo({
      metodo: 'SOC',
      status: 'VALIDADO',
      requestId: 'req-soc-1',
      validadoEm: '2026-05-27T10:00:00.000Z',
      validadoPor: 'op-1',
      evidencias: {
        termoCienciaUrl: 'https://blob.test/termo.pdf',
        termoCienciaHash: 't'.repeat(64),
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        metodo: 'SOC',
        status: 'VALIDADO',
        requestId: 'req-soc-1',
        validadoEm: '2026-05-27T10:00:00.000Z',
        validadoPor: 'op-1',
        evidencias: expect.objectContaining({
          termoCienciaUrl: 'https://blob.test/termo.pdf',
          termoCienciaHash: 't'.repeat(64),
          relatorioEvidenciasUrl: null,
          relatorioEvidenciasHash: null,
        }),
        biometria: {
          cadastroId: null,
          dedo: null,
          templateVersion: null,
        },
        facial: {
          provider: null,
          sessionId: null,
          transactionId: null,
          imagemRepresentativaUrl: null,
          imagemRepresentativaHash: null,
          confidence: null,
        },
      }),
    );
  });

  it('deve preencher BIOMETRIA com facial nulo', () => {
    const result = buildUnifiedAtendimentoAuthInfo({
      metodo: 'BIOMETRIA',
      status: 'VALIDADO',
      requestId: 'req-bio-1',
      validadoPor: 'op-2',
      biometria: {
        cadastroId: 'bio-1',
        dedo: 'INDICADOR_DIREITO',
        templateVersion: 'futronic-ansi-v1',
      },
      evidencias: {
        termoCienciaUrl: 'https://blob.test/termo-bio.pdf',
        termoCienciaHash: 'b'.repeat(64),
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        metodo: 'BIOMETRIA',
        biometria: expect.objectContaining({
          cadastroId: 'bio-1',
          dedo: 'INDICADOR_DIREITO',
          templateVersion: 'futronic-ansi-v1',
        }),
        facial: {
          provider: null,
          sessionId: null,
          transactionId: null,
          imagemRepresentativaUrl: null,
          imagemRepresentativaHash: null,
          confidence: null,
        },
      }),
    );
  });

  it('deve preencher FACIAL com biometria nulo', () => {
    const result = buildUnifiedAtendimentoAuthInfo({
      metodo: 'FACIAL',
      status: 'VALIDADO',
      requestId: 'req-facial-1',
      validadoPor: 'op-3',
      facial: {
        provider: 'BRY_SIGN',
        sessionId: 'session-1',
        transactionId: 'tx-1',
        imagemRepresentativaUrl: 'https://blob.test/facial.jpg',
        imagemRepresentativaHash: 'f'.repeat(64),
        confidence: 0.99,
      },
      evidencias: {
        termoCienciaUrl: 'https://blob.test/termo-facial.pdf',
        termoCienciaHash: 'e'.repeat(64),
        relatorioEvidenciasUrl: 'https://blob.test/facial-report.pdf',
        relatorioEvidenciasHash: 'r'.repeat(64),
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        metodo: 'FACIAL',
        biometria: {
          cadastroId: null,
          dedo: null,
          templateVersion: null,
        },
        facial: expect.objectContaining({
          provider: 'BRY_SIGN',
          sessionId: 'session-1',
          transactionId: 'tx-1',
          imagemRepresentativaUrl: 'https://blob.test/facial.jpg',
          confidence: 0.99,
        }),
      }),
    );
  });
});
