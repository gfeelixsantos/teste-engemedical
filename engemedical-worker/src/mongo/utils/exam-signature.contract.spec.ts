import {
  buildUnifiedExamSignature,
  mapLegacySignatureStatus,
} from './exam-signature.contract';

describe('worker exam signature contract', () => {
  it('builds the unified payload expected by backend/frontend for BRYKMS signed exams', () => {
    const unified = buildUnifiedExamSignature(
      {
        status: 'ASSINADO',
        kmsType: 'BRYKMS',
        signedAt: '2026-04-23T03:15:00.000Z',
        retryCount: 0,
      },
      'https://storage.local/assinado_ExameClinico.pdf',
    );

    expect(unified).toEqual(
      expect.objectContaining({
        documentType: 'EXAME',
        requiresSignature: true,
        status: 'ASSINADO',
        provider: 'BRYKMS',
        signedAt: '2026-04-23T03:15:00.000Z',
        signedUrl: 'https://storage.local/assinado_ExameClinico.pdf',
        retry: expect.objectContaining({
          pending: false,
          count: 0,
        }),
      }),
    );
  });

  it('maps legacy retry statuses to the unified pending contract', () => {
    const unified = buildUnifiedExamSignature({
      status: 'AGUARDANDO_REPROCESSAMENTO',
      provider: 'PSC',
      retryCount: 2,
      nextRetryAt: '2026-04-24T10:00:00.000Z',
    });

    expect(mapLegacySignatureStatus('AGUARDANDO_REPROCESSAMENTO')).toBe(
      'PENDENTE',
    );
    expect(unified).toEqual(
      expect.objectContaining({
        documentType: 'EXAME',
        requiresSignature: true,
        status: 'PENDENTE',
        provider: 'PSC',
        retry: expect.objectContaining({
          pending: true,
          count: 2,
          nextRetryAt: '2026-04-24T10:00:00.000Z',
        }),
      }),
    );
  });
});
