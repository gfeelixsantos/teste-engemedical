export {};

const assert = require('node:assert/strict');
const axios = require('axios');

const { BryClientService } = require('./bry-client.service');

async function run() {
  process.env.BRY_AUTH_URL = 'https://auth.bry.test/oauth/token';
  process.env.BRY_CLIENT_ID = 'client-id';
  process.env.BRY_CLIENT_SECRET = 'client-secret';
  process.env.BRY_HUB_URL = 'https://hub.bry.test';

  const originalFetch = global.fetch;
  const originalPost = axios.post;
  const requests: { url: any; data: any; config: any }[] = [];

  global.fetch = async () =>
    ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          access_token: 'jwt-token',
          expires_in: 3600,
        }),
    }) as Response;

  axios.post = async (url: any, data: any, config: any) => {
    requests.push({ url, data, config });

    return {
      status: 200,
      data: {
        generalStatus: 'VALID',
        signatureFormat: 'PADES',
        signatureStatus: {
          fileName: 'documento.pdf',
        },
        signatures: [
          {
            signatureStatus: 'OK',
            verificationReference: 'Certificado ICP A3 xyz',
            signingTime: '2026-04-29T23:50:00Z',
            algorithm: 'RSA',
            hashAlgorithm: 'SHA-256',
            signatureFormat: 'PADES',
          },
        ],
      },
    };
  };

  try {
    const service = new BryClientService();
    const response = await service.verifyPdfSignature(
      Buffer.from('%PDF-assinado%'),
      'documento.pdf',
    );

    assert.equal(response.generalStatus, 'VALID');

    const verifyCall = requests.find((item) =>
      String(item.url).includes(
        '/api/pdf-verification-service/v1/signatures/verify',
      ),
    );

    if (!verifyCall) {
      throw new Error('Chamada de verificacao BRy nao encontrada em requests');
    }
    assert.equal(verifyCall.config.headers.Authorization, 'Bearer jwt-token');
    assert.equal(verifyCall.config.timeout, 30000);

    const contentTypeHeader =
      verifyCall.config.headers['content-type'] ||
      verifyCall.config.headers['Content-Type'];
    assert.equal(typeof contentTypeHeader, 'string');
    assert.equal(contentTypeHeader.includes('multipart/form-data'), true);

    const payloadBuffer = verifyCall.data.getBuffer();
    const payloadText = payloadBuffer.toString('utf-8');
    assert.equal(payloadText.includes('name="nonce"'), true);
    assert.equal(payloadText.includes('\r\n1\r\n'), true);
    assert.equal(payloadText.includes('name="signatures[0][nonce]"'), true);
    assert.equal(
      payloadText.includes(
        'name="signatures[0][content]"; filename="documento.pdf"',
      ),
      true,
    );
    assert.equal(payloadText.includes('Content-Type: application/pdf'), true);
    assert.equal(payloadText.includes('%PDF-assinado%'), true);
    assert.equal(payloadText.includes('name="contentsReturn"'), true);
    assert.equal(payloadText.includes('\r\nfalse\r\n'), true);

    console.log(
      'OK verifyPdfSignature envia PDF assinado para o endpoint BRy de verificacao',
    );
  } finally {
    global.fetch = originalFetch;
    axios.post = originalPost;
  }
}

run().catch((error) => {
  console.error(
    '[bry-verification.contract-test] erro:',
    error?.message || error,
  );
  process.exit(1);
});
