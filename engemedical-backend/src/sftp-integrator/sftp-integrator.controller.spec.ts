import { UnauthorizedException } from '@nestjs/common';
import { SftpIntegratorController } from './sftp-integrator.controller';

describe('SftpIntegratorController', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, INTERNAL_WORKER_TOKEN: 'token-test' };
  });

  afterEach(() => {
    process.env = env;
  });

  it('requires the internal token before pulling files', async () => {
    const service = { pullLatest: jest.fn() };
    const controller = new SftpIntegratorController(service as any);

    await expect(controller.pull('grupo-tora', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(service.pullLatest).not.toHaveBeenCalled();
  });

  it('delegates a manual pull to the service when the token is valid', async () => {
    const result = {
      clientKey: 'grupo-tora',
      downloaded: true,
      file: { remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx' },
    };
    const service = { pullLatest: jest.fn().mockResolvedValue(result) };
    const controller = new SftpIntegratorController(service as any);

    await expect(controller.pull('grupo-tora', 'token-test')).resolves.toBe(
      result,
    );
    expect(service.pullLatest).toHaveBeenCalledWith('grupo-tora');
  });

  it('streams a registered file through express download', async () => {
    const service = {
      getFileForDownload: jest.fn().mockResolvedValue({
        file: { remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx' },
        path: 'C:/app/data/sftp-integrator/grupo-tora/incoming/LOG.xlsx',
      }),
    };
    const res = { download: jest.fn() };
    const controller = new SftpIntegratorController(service as any);

    await controller.download('grupo-tora', '66f000000000000000000001', 'token-test', res as any);

    expect(res.download).toHaveBeenCalledWith(
      'C:/app/data/sftp-integrator/grupo-tora/incoming/LOG.xlsx',
      'LOG_INTEGRACAO_2026-09-01.xlsx',
    );
  });
});
