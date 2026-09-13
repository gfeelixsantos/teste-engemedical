import { getSftpIntegratorConfig } from './sftp-integrator.config';

describe('getSftpIntegratorConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads generic client envs using a normalized client key', () => {
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_HOST = 'sftp.example.com';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_PORT = '2222';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_USERNAME = 'grupo';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_PASSWORD = 'secret';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_REMOTE_PATH = '/planilhas';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_FILE_PATTERN =
      'LOG_INTEGRACAO_*.xlsx';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED = 'true';

    const config = getSftpIntegratorConfig('Grupo Tora');

    expect(config).toMatchObject({
      clientKey: 'grupo-tora',
      host: 'sftp.example.com',
      port: 2222,
      username: 'grupo',
      password: 'secret',
      remotePath: '/planilhas',
      filePattern: 'LOG_INTEGRACAO_*.xlsx',
      cronEnabled: true,
    });
  });

  it('keeps compatibility with the initial TORA_SFTP env names', () => {
    process.env.TORA_SFTP_HOST = 'legacy.example.com';
    process.env.TORA_SFTP_PORT = '2223';
    process.env.TORA_SFTP_USERNAME = 'grupotora';
    process.env.TORA_SFTP_PASSWORD = 'legacy-secret';
    process.env.TORA_SFTP_BASE_PATH = '/planilhas';
    process.env.TORA_SFTP_REMOTE_GLOB = 'LOG_INTEGRACAO_*.xlsx';

    const config = getSftpIntegratorConfig('grupo-tora');

    expect(config).toMatchObject({
      host: 'legacy.example.com',
      port: 2223,
      username: 'grupotora',
      password: 'legacy-secret',
      remotePath: '/planilhas',
      filePattern: 'LOG_INTEGRACAO_*.xlsx',
    });
  });

  it('enables the Grupo Tora schedule by default when no override is provided', () => {
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_HOST = 'sftp.example.com';
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_USERNAME = 'grupo';
    delete process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED;

    expect(getSftpIntegratorConfig('grupo-tora').cronEnabled).toBe(true);
  });
});
