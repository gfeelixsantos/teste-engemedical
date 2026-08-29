import { AsoSignatureService } from './aso-signature.service';
import * as assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

async function buildPdfBuffer() {
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 300]);
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

async function run() {
  console.log('--- Iniciando Teste de Fluxo Completo BRYKMS ---');

  const signedPdfBaseBuffer = await buildPdfBuffer();
  const signedPdfBuffer = Buffer.concat([
    signedPdfBaseBuffer,
    Buffer.from(
      '\n/ByteRange [0 10 20 30]\n/Contents <ABCDEF>\n/Sig\n/AcroForm',
    ),
  ]);
  const inputPdfBuffer = await buildPdfBuffer();

  const mockBryClient = {
    signPdfWithKms: async () => signedPdfBuffer,
    verifyPdfSignature: async () => ({
      nonce: '123456789',
      generalStatus: 'VALID',
      signatureFormat: 'PADES',
      signatureStatus: {
        fileName: 'documento_assinado.pdf',
        verificationReference: 'ICP-Brasil AC xyz',
        signingTime: '2026-04-30T10:00:00Z',
        signatureAlgorithm: 'SHA256withRSA',
        hashAlgorithm: 'SHA-256',
        chainStatus: {
          certificateStatusList: [{ status: 'OK' }],
        },
      },
      signatures: [
        {
          algorithm: 'RSA',
          hashAlgorithm: 'SHA-256',
          signingTime: '2026-04-30T10:00:00Z',
        },
      ],
    }),
  };

  const mockItiService = {
    validatePdf: async () => {
      throw new Error('ITI nao deve ser chamado');
    },
  };

  const uploads: any[] = [];
  const mockBlobService: any = {
    getBlobUrl: (c: string, b: string) => `https://blob.local/${c}/${b}`,
    upload: async (c: string, b: string, buffer: Buffer) => {
      uploads.push({ container: c, path: b, size: buffer.length });
      return `https://blob.local/${c}/${b}`;
    },
  };

  const service = new AsoSignatureService(
    mockBryClient as any,
    mockItiService as any,
    mockBlobService,
  );

  const metadata = {
    professionalName: 'DR. TESTE BRYKMS',
    crm: '123456',
    uf: 'SP',
    cpf: '111.222.333-44',
    prontuario: 'PRT-2026-TEST',
  };

  console.log('Passo 1: Executando signAndValidate...');
  const result = await service.signAndValidate(
    inputPdfBuffer,
    'BRYKMS',
    { user: 'user', pin: '1234' },
    '69eb5703a7c459d71c8e1f50',
    'MARIANA FERREIRA DE CARVALHO',
    metadata,
  );

  console.log('Passo 2: Verificando resultados...');
  const ascii = result.signedPdf.toString('latin1');
  console.log('Markers check:', {
    hasByteRange: ascii.includes('/ByteRange'),
    hasSig: ascii.includes('/Sig'),
    hasAcroForm: ascii.includes('/AcroForm'),
  });
  console.log('result.hasEmbeddedSignature:', result.hasEmbeddedSignature);
  assert.equal(result.hasEmbeddedSignature, true);
  assert.ok(result.validationUrl.includes('PRT-2026-TEST.pdf'));
  assert.equal(uploads.length, 1);

  // Verifica se o relatorio gerado nao causou erro de PDF
  const reportUpload = uploads.find((u) =>
    u.path.includes('PRT-2026-TEST.pdf'),
  );
  assert.ok(reportUpload);
  assert.ok(reportUpload.size > 1000);

  console.log(
    '\n[SUCESSO] Fluxo BRYKMS validado com geracao de relatorio e bypass de ITI.',
  );
}

run().catch((err) => {
  console.error('[ERRO NO TESTE]', err);
  process.exit(1);
});
