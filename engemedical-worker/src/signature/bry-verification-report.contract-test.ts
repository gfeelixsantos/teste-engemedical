export {};

const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');

const { buildBryVerificationReportPdf } = require('./bry-verification-report');

async function run() {
  const pdfBytes = await buildBryVerificationReportPdf({
    schedulingId: '270513-32-2-29042026',
    pacienteNome: 'CRISTINA APARECIDA BARBOSA',
    prontuario: '270513-32-2-29042026',
    verification: {
      generalStatus: 'VALID',
      signatureFormat: 'PADES',
      signatureStatus: {
        fileName: 'ASO.pdf',
        signatureAlgorithm: 'SHA256_WITH_RSA_ENCRYPTION',
      },
    },
  });

  const pdfDoc = await PDFDocument.load(pdfBytes);

  assert.ok(pdfDoc.getPageCount() >= 1);
  assert.ok(Buffer.from(pdfBytes).includes(Buffer.from('PDF')));

  console.log(
    'OK buildBryVerificationReportPdf gera relatorio PDF de verificacao BRy',
  );
}

run().catch((error) => {
  console.error(
    '[bry-verification-report.contract-test] erro:',
    error?.message || error,
  );
  process.exit(1);
});
