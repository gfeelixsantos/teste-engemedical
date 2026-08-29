export {};

const assert = require('node:assert/strict');
const axios = require('axios');

const { ItiValidationService } = require('./iti-validation.service');

async function run() {
  const originalPost = axios.post;
  const calls: { url: any; data: any; config: any }[] = [];

  axios.post = async (url: any, data: any, config: any) => {
    calls.push({ url, data, config });

    if (url.endsWith('/arquivo')) {
      return { data: { ticket: 'upload-ok', files: ['a.pdf'] } };
    }

    if (url.endsWith('/conformidade')) {
      return { data: { protocolo: 'conformidade-ok', arquivos: ['r1'] } };
    }

    if (url.endsWith('/downloadPdf')) {
      return { data: Buffer.from('PDF_RELATORIO_ITI') };
    }

    throw new Error(`URL inesperada no teste: ${url}`);
  };

  try {
    const service = new ItiValidationService();
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj');
    const result = await service.validatePdf(pdfBuffer, 'exemplo_assinado.pdf');

    assert.equal(Buffer.isBuffer(result), true);
    assert.equal(result.toString(), 'PDF_RELATORIO_ITI');
    assert.equal(calls.length, 3);

    const uploadCall = calls[0];
    assert.equal(uploadCall.url, 'https://validar.iti.gov.br/arquivo');
    assert.equal(typeof uploadCall.config.headers['content-type'], 'string');
    assert.equal(
      uploadCall.config.headers['content-type'].includes('multipart/form-data'),
      true,
    );
    assert.equal(
      uploadCall.config.headers.Origin,
      'https://validar.iti.gov.br',
    );
    assert.equal(
      uploadCall.config.headers.Referer,
      'https://validar.iti.gov.br/',
    );
    assert.equal(uploadCall.config.timeout, 60000);

    const conformidadeCall = calls[1];
    assert.equal(
      conformidadeCall.url,
      'https://validar.iti.gov.br/conformidade',
    );
    assert.deepEqual(conformidadeCall.data, {
      ticket: 'upload-ok',
      files: ['a.pdf'],
    });
    assert.equal(conformidadeCall.config.timeout, 60000);
    assert.equal(
      conformidadeCall.config.headers['X-Requested-With'],
      'XMLHttpRequest',
    );

    const downloadCall = calls[2];
    assert.equal(downloadCall.url, 'https://validar.iti.gov.br/downloadPdf');
    assert.deepEqual(downloadCall.data, {
      data: JSON.stringify({
        protocolo: 'conformidade-ok',
        arquivos: ['r1'],
      }),
      language: 'portuga',
    });
    assert.equal(downloadCall.config.responseType, 'arraybuffer');
    assert.equal(downloadCall.config.timeout, 60000);
    assert.equal(
      downloadCall.config.headers.Accept,
      'application/pdf, application/octet-stream, */*',
    );
    assert.equal(
      downloadCall.config.headers['Content-Type'],
      'application/json;charset=UTF-8',
    );

    console.log(
      'OK ItiValidationService preserva o payload esperado em /arquivo, /conformidade e /downloadPdf',
    );
  } finally {
    axios.post = originalPost;
  }
}

run().catch((error) => {
  console.error(
    '[iti-validation-request-shape.contract-test] erro:',
    error?.message || error,
  );
  process.exit(1);
});
