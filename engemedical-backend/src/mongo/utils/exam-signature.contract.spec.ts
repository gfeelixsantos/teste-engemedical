import {
  mapLegacyExamSignatureStatus,
  normalizeLegacyExamSignature,
} from './exam-signature.contract';

describe('backend exam signature contract', () => {
  it('normalizes a BRYKMS legacy signature into the unified exam contract', () => {
    const normalized = normalizeLegacyExamSignature(
      {
        status: 'ASSINADO',
        kmsType: 'BRYKMS',
        signedAt: '2026-04-23T03:00:00.000Z',
        retryCount: 0,
      },
      'https://storage.local/assinado_ExameClinico.pdf',
    );

    expect(normalized).toEqual(
      expect.objectContaining({
        documentType: 'EXAME',
        requiresSignature: true,
        status: 'ASSINADO',
        provider: 'BRYKMS',
        signedAt: '2026-04-23T03:00:00.000Z',
        signedUrl: 'https://storage.local/assinado_ExameClinico.pdf',
        retry: expect.objectContaining({
          pending: false,
          count: 0,
        }),
      }),
    );
  });

  it('maps legacy retry states to the new pending status', () => {
    expect(mapLegacyExamSignatureStatus('AGUARDANDO_REPROCESSAMENTO')).toBe(
      'PENDENTE',
    );
    expect(mapLegacyExamSignatureStatus('WAITING_AUTH')).toBe('PENDENTE');
  });
});
