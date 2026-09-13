import 'reflect-metadata';

import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { SftpIntegratorScheduler } from './sftp-integrator.scheduler';

describe('SftpIntegratorScheduler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED;
    delete process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_ENABLED;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createService() {
    return {
      pullLatest: jest.fn().mockResolvedValue({
        file: { _id: 'file-123', remoteName: 'LOG.xlsx' },
      }),
      processSocLimited: jest.fn().mockResolvedValue({
        summary: { success: 1, failed: 0 },
      }),
    };
  }

  it('registers the Grupo Tora daily cron at 18:30 Sao Paulo time', () => {
    const scheduler = new SftpIntegratorScheduler(createService() as any);

    expect(
      Reflect.getMetadata(
        SCHEDULE_CRON_OPTIONS,
        scheduler.runGrupoToraDailyIntegration,
      ),
    ).toEqual({
      cronTime: '30 18 * * 1-5',
      timeZone: 'America/Sao_Paulo',
    });
  });

  it('does not run when the Grupo Tora cron flag is disabled', async () => {
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED = 'false';
    const service = createService();
    const scheduler = new SftpIntegratorScheduler(service as any);

    await scheduler.runGrupoToraDailyIntegration();

    expect(service.pullLatest).not.toHaveBeenCalled();
    expect(service.processSocLimited).not.toHaveBeenCalled();
  });

  it('pulls the latest file and processes it in production when both flags are enabled', async () => {
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED = 'true';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_ENABLED = 'true';
    const service = createService();
    const scheduler = new SftpIntegratorScheduler(service as any);

    await scheduler.runGrupoToraDailyIntegration();

    expect(service.pullLatest).toHaveBeenCalledWith('grupo-tora');
    expect(service.processSocLimited).toHaveBeenCalledWith(
      'grupo-tora',
      'file-123',
    );
  });

  it('skips concurrent executions while a previous run is active', async () => {
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED = 'true';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_ENABLED = 'true';
    let releaseDryRun!: () => void;
    const service = createService();
    service.pullLatest.mockReturnValue(
      new Promise((resolve) => {
        releaseDryRun = () =>
          resolve({
            file: { _id: 'file-123', remoteName: 'LOG.xlsx' },
          });
      }),
    );
    const scheduler = new SftpIntegratorScheduler(service as any);

    const firstRun = scheduler.runGrupoToraDailyIntegration();
    await scheduler.runGrupoToraDailyIntegration();
    releaseDryRun();
    await firstRun;

    expect(service.pullLatest).toHaveBeenCalledTimes(1);
    expect(service.processSocLimited).toHaveBeenCalledTimes(1);
  });
});
