export {};

const assert = require('node:assert/strict');
const axios = require('axios');

const { ItiValidationService } = require('./iti-validation.service');

function createAxiosLikeError(message: string, status: number, data: any) {
  const error: any = new Error(message);
  error.isAxiosError = true;
  error.response = {
    status,
    data,
  };
  return error;
}

async function runScenario(
  name: string,
  responseData: any,
  expectedDetailFragment: string,
) {
  const originalPost = axios.post;
  const originalIsAxiosError = axios.isAxiosError;
  const originalError = console.error;

  const capturedConsoleErrors: string[] = [];
  console.error = (...args: any[]) => {
    capturedConsoleErrors.push(args.map(String).join(' '));
  };

  axios.isAxiosError = (value: any) => Boolean(value?.isAxiosError);
  axios.post = async () => {
    throw createAxiosLikeError(
      'Request failed with status code 500',
      500,
      responseData,
    );
  };

  try {
    const service = new ItiValidationService();
    service['logger'] = {
      log: () => undefined,
      debug: () => undefined,
      error: (...args: any[]) =>
        capturedConsoleErrors.push(args.map(String).join(' ')),
    };

    await assert.rejects(
      service.validatePdf(Buffer.from('%PDF-1.4'), 'captura_iti.pdf'),
      /Falha ao validar documento no portal do ITI na etapa upload: Request failed with status code 500/,
    );

    const joined = capturedConsoleErrors.join('\n');
    assert.equal(
      joined.includes('Erro na validação ITI na etapa upload'),
      true,
    );
    assert.equal(
      joined.includes('Etapa: upload | Status: 500 | Detalhe:'),
      true,
    );
    assert.equal(joined.includes(expectedDetailFragment), true);

    console.log(`OK captura retorno ITI (${name}) na etapa upload`);
  } finally {
    axios.post = originalPost;
    axios.isAxiosError = originalIsAxiosError;
    console.error = originalError;
  }
}

async function run() {
  await runScenario(
    'objeto-json',
    { errorCode: 500, ticket: 'iti-failure', reason: 'upstream' },
    '"errorCode":500',
  );

  await runScenario('texto', 'falha textual do iti', 'falha textual do iti');

  await runScenario(
    'buffer',
    Buffer.from('falha buffer iti'),
    'falha buffer iti',
  );
}

run().catch((error) => {
  console.error(
    '[iti-validation-error-shape.contract-test] erro:',
    error?.message || error,
  );
  process.exit(1);
});
