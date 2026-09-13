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

  it('streams the persisted report for an execution', async () => {
    const service = {
      getRunReportForDownload: jest.fn().mockResolvedValue({
        buffer: Buffer.from('xlsx'),
        fileName: 'Relatorio_SOC_LOG.xlsx',
      }),
    };
    const res = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new SftpIntegratorController(service as any);

    await controller.downloadReport('grupo-tora', '66f000000000000000000001', 'token-test', res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('spreadsheetml'));
    expect(res.send).toHaveBeenCalledWith(Buffer.from('xlsx'));
  });

  it('delegates spreadsheet parsing for a registered file', async () => {
    const result = {
      status: 'parsed',
      summary: { totalRows: 1, validRows: 1, invalidRows: 0 },
    };
    const service = { parseFile: jest.fn().mockResolvedValue(result) };
    const controller = new SftpIntegratorController(service as any);

    await expect(
      controller.parseFile('grupo-tora', '66f000000000000000000001', 'token-test'),
    ).resolves.toBe(result);
    expect(service.parseFile).toHaveBeenCalledWith(
      'grupo-tora',
      '66f000000000000000000001',
    );
  });

  it('delegates dry-run processing for a registered file', async () => {
    const result = {
      status: 'dry_run',
      summary: { totalRows: 1, payloadsPrepared: 1 },
    };
    const service = { runDryRun: jest.fn().mockResolvedValue(result) };
    const controller = new SftpIntegratorController(service as any);

    await expect(
      controller.dryRun('grupo-tora', '66f000000000000000000001', 'token-test'),
    ).resolves.toBe(result);
    expect(service.runDryRun).toHaveBeenCalledWith(
      'grupo-tora',
      '66f000000000000000000001',
    );
  });

  it('delegates pull plus dry-run processing for the latest file', async () => {
    const result = {
      pull: { downloaded: true, file: { remoteName: 'LOG.xlsx' } },
      dryRun: { status: 'dry_run', summary: { payloadsPrepared: 1 } },
    };
    const service = {
      pullLatestAndRunDryRun: jest.fn().mockResolvedValue(result),
    };
    const controller = new SftpIntegratorController(service as any);

    await expect(
      controller.dryRunLatest('grupo-tora', 'token-test'),
    ).resolves.toBe(result);
    expect(service.pullLatestAndRunDryRun).toHaveBeenCalledWith('grupo-tora');
  });

  it('lists dry-run executions for a client', async () => {
    const result = [{ status: 'dry_run', summary: { totalRows: 1 } }];
    const service = { listRuns: jest.fn().mockResolvedValue(result) };
    const controller = new SftpIntegratorController(service as any);

    await expect(
      controller.listRuns('grupo-tora', 'token-test', '25'),
    ).resolves.toBe(result);
    expect(service.listRuns).toHaveBeenCalledWith('grupo-tora', 25);
  });

  it('delegates limited SOC processing for a registered file', async () => {
    const result = {
      status: 'soc_limited',
      summary: { totalSelected: 3, success: 3, failed: 0 },
    };
    const service = { processSocLimited: jest.fn().mockResolvedValue(result) };
    const controller = new SftpIntegratorController(service as any);

    await expect(
      controller.processSocLimited(
        'grupo-tora',
        '66f000000000000000000001',
        'token-test',
      ),
    ).resolves.toBe(result);
    expect(service.processSocLimited).toHaveBeenCalledWith(
      'grupo-tora',
      '66f000000000000000000001',
    );
  });
});
