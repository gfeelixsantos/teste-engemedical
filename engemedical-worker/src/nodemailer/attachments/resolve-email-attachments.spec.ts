import { resolveEmailAttachments } from './resolve-email-attachments';

describe('resolveEmailAttachments', () => {
  it('keeps inline base64 attachments untouched', async () => {
    const result = await resolveEmailAttachments(
      [
        {
          filename: 'inline.pdf',
          content: 'YmFzZTY0',
          contentType: 'application/pdf',
          encoding: 'base64',
        },
      ],
      async () => {
        throw new Error('download should not be called');
      },
    );

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe('inline.pdf');
    expect(result.attachments[0].content).toBe('YmFzZTY0');
    expect(result.blobBackedAttachments).toEqual([]);
  });

  it('downloads blob-backed attachments and keeps them as buffer content', async () => {
    const result = await resolveEmailAttachments(
      [
        {
          filename: 'ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
          contentType: 'application/pdf',
          encoding: 'base64',
          container: 'documents',
          blobName: 'cargo-adendos/2026/05/ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
        },
      ],
      async (container, blobName) => {
        expect(container).toBe('documents');
        expect(blobName).toBe(
          'cargo-adendos/2026/05/ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
        );

        return Buffer.from('%PDF');
      },
    );

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe(
      'ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
    );
    expect(Buffer.isBuffer(result.attachments[0].content)).toBe(true);
    expect(result.attachments[0].content.equals(Buffer.from('%PDF'))).toBe(
      true,
    );
  });

  it('collects cleanup references for blob-backed attachments', async () => {
    const result = await resolveEmailAttachments(
      [
        {
          filename: 'ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
          contentType: 'application/pdf',
          encoding: 'base64',
          container: 'documents',
          blobName: 'cargo-adendos/2026/05/ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
        },
      ],
      async () => Buffer.from('%PDF'),
    );

    expect(result.blobBackedAttachments).toEqual([
      {
        container: 'documents',
        blobName: 'cargo-adendos/2026/05/ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
      },
    ]);
  });
});
