export {};

const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');

const { AsoSignatureService } = require('./aso-signature.service');

async function buildPdfBuffer() {
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 300]);
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

async function run() {
  const signedPdfBaseBuffer = await buildPdfBuffer();
  const signedPdfBuffer = Buffer.concat([
    signedPdfBaseBuffer,
    Buffer.from(
      '\n/ByteRange [0 10 20 30]\n/Contents <ABCDEF>\n/Sig\n/AcroForm',
    ),
  ]);
  const inputPdfBuffer = await buildPdfBuffer();
  let signedInputBuffer: Buffer | undefined;

  const bryClient = {
    signPdfWithKms: async ({ pdfBuffer }) => {
      signedInputBuffer = pdfBuffer;
      return signedPdfBuffer;
    },
  };

  const itiService = {
    validatePdf: async () => Buffer.from('RELATORIO_ITI'),
  };

  const uploadedUrls: string[] = [];
  const blobService = {
    getBlobUrl: (_container, _blobPath) =>
      'https://cmsodocs.blob.core.windows.net/documents/validacao/2026/270513-32-2-29042026.pdf',
    upload: async (_container, _blobPath, reportBuffer) => {
      assert.equal(reportBuffer.toString(), 'RELATORIO_ITI');
      const url =
        'https://cmsodocs.blob.core.windows.net/documents/validacao/2026/270513-32-2-29042026.pdf';
      uploadedUrls.push(url);
      return url;
    },
  };

  const service = new AsoSignatureService(bryClient, itiService, blobService);

  const metadata = {
    professionalName: 'AMANDA DE SOUZA ZANETTI',
    crm: '226402',
    uf: 'SP',
    cpf: '389.583.238-33',
    prontuario: '270513-32-2-29042026',
  };

  const result = await service.signAndValidate(
    inputPdfBuffer,
    'PSC',
    { token: 'token', url: 'https://integra.local' },
    '270513-32-2-29042026',
    'CRISTINA APARECIDA BARBOSA',
    metadata,
  );

  assert.equal(uploadedUrls.length, 1);
  assert.equal(
    result.validationUrl,
    'https://cmsodocs.blob.core.windows.net/documents/validacao/2026/270513-32-2-29042026.pdf',
  );
  assert.equal(result.hasEmbeddedSignature, true);
  assert.equal(result.itiValidationEnabled, true);
  assert.ok(Buffer.isBuffer(signedInputBuffer));
  if (signedInputBuffer === undefined) {
    throw new Error(
      'Buffer enviado para assinatura nao foi capturado no teste',
    );
  }
  assert.ok(signedInputBuffer.length > 0);
  assert.ok(Buffer.isBuffer(result.signedPdf));
  assert.ok(result.signedPdf.length > 0);
  assert.equal(result.signedPdf.equals(signedPdfBuffer), true);

  const failingItiService = {
    validatePdf: async () => {
      throw new Error('ITI indisponivel');
    },
  };

  const serviceWithoutValidation = new AsoSignatureService(
    bryClient,
    failingItiService,
    blobService,
  );

  await assert.rejects(
    serviceWithoutValidation.signAndValidate(
      inputPdfBuffer,
      'PSC',
      { token: 'token', url: 'https://integra.local' },
      '270513-32-2-29042026',
      'CRISTINA APARECIDA BARBOSA',
      metadata,
    ),
    /Validacao ITI indisponivel/,
  );

  let bryVerifyCalls = 0;
  let bryReportUploads = 0;
  const bryClientForBrykms = {
    signPdfWithKms: async ({ pdfBuffer }) => {
      signedInputBuffer = pdfBuffer;
      return signedPdfBuffer;
    },
    verifyPdfSignature: async () => {
      bryVerifyCalls += 1;
      return {
        generalStatus: 'VALID',
        signatureFormat: 'PADES',
        signatureStatus: {
          fileName: 'ASO.pdf',
          signatureAlgorithm: 'SHA256_WITH_RSA_ENCRYPTION',
        },
      };
    },
  };

  const itiServiceForBrykms = {
    validatePdf: async () => {
      throw new Error('ITI nao deve ser chamado para BRYKMS');
    },
  };

  const blobServiceForBrykms = {
    getBlobUrl: (_container, _blobPath) =>
      'https://blob.local/validacao/bry-report.pdf',
    upload: async (_container, _blobPath, reportBuffer) => {
      bryReportUploads += 1;
      assert.ok(Buffer.isBuffer(reportBuffer));
      assert.ok(reportBuffer.length > 0);
      return 'https://blob.local/validacao/bry-report.pdf';
    },
  };

  const brykmsService = new AsoSignatureService(
    bryClientForBrykms,
    itiServiceForBrykms,
    blobServiceForBrykms,
  );

  const brykmsResult = await brykmsService.signAndValidate(
    inputPdfBuffer,
    'BRYKMS',
    { user: '123', pin: 'abc' },
    '270513-32-2-29042026',
    'CRISTINA APARECIDA BARBOSA',
    metadata,
  );

  assert.equal(bryVerifyCalls, 1);
  assert.equal(bryReportUploads, 1);
  assert.equal(
    brykmsResult.validationUrl,
    'https://blob.local/validacao/bry-report.pdf',
  );
  assert.equal(brykmsResult.hasEmbeddedSignature, true);
  assert.equal(brykmsResult.itiValidationEnabled, true);

  const invalidBryClient = {
    signPdfWithKms: async () => signedPdfBuffer,
    verifyPdfSignature: async () => ({
      generalStatus: 'INVALID',
      signatureFormat: 'PADES',
      signatureStatus: {
        fileName: 'ASO.pdf',
      },
    }),
  };

  const invalidBrykmsService = new AsoSignatureService(
    invalidBryClient,
    itiServiceForBrykms,
    blobServiceForBrykms,
  );

  await assert.rejects(
    invalidBrykmsService.signAndValidate(
      inputPdfBuffer,
      'BRYKMS',
      { user: '123', pin: 'abc' },
      '270513-32-2-29042026',
      'CRISTINA APARECIDA BARBOSA',
      metadata,
    ),
    /Validacao BRy indisponivel|Verificacao BRy invalida/,
  );

  console.log(
    'OK AsoSignatureService usa a URL do relatorio ITI para PSC, usa verificacao BRy para BRYKMS, preserva a assinatura final e bloqueia liberacao sem validacao',
  );
}

run().catch((error) => {
  console.error(
    '[aso-iti-validation.contract-test] erro:',
    error?.message || error,
  );
  process.exit(1);
});
