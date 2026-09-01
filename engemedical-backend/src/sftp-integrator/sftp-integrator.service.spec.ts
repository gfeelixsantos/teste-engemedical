import { ObjectId } from 'mongodb';
import { SftpIntegratorService } from './sftp-integrator.service';
import { SftpClientAdapter } from './sftp-integrator.types';

function createCollection() {
  const rows: any[] = [];
  return {
    rows,
    createIndex: jest.fn().mockResolvedValue('idx'),
    findOne: jest.fn(async (query: any) =>
      rows.find(
        (row) =>
          row.clientKey === query.clientKey &&
          row.remotePath === query.remotePath &&
          row.size === query.size,
      ) || null,
    ),
    insertOne: jest.fn(async (doc: any) => {
      const insertedId = new ObjectId();
      rows.push({ ...doc, _id: insertedId });
      return { insertedId };
    }),
    find: jest.fn(() => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(async () => rows),
    })),
  };
}

describe('SftpIntegratorService', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      SFTP_INTEGRATOR_GRUPO_TORA_HOST: 'sftp.example.com',
      SFTP_INTEGRATOR_GRUPO_TORA_PORT: '2222',
      SFTP_INTEGRATOR_GRUPO_TORA_USERNAME: 'grupo',
      SFTP_INTEGRATOR_GRUPO_TORA_PASSWORD: 'secret',
      SFTP_INTEGRATOR_GRUPO_TORA_REMOTE_PATH: '/planilhas',
      SFTP_INTEGRATOR_GRUPO_TORA_FILE_PATTERN: 'LOG_INTEGRACAO_*.xlsx',
      SFTP_INTEGRATOR_GRUPO_TORA_DOWNLOAD_DIR:
        'data/sftp-integrator/grupo-tora/incoming',
    };
  });

  afterEach(() => {
    process.env = env;
  });

  it('downloads the latest matching remote file and stores metadata', async () => {
    const collection = createCollection();
    const adapter: SftpClientAdapter = {
      list: jest.fn(async () => [
        {
          name: 'ignore.txt',
          path: '/planilhas/ignore.txt',
          size: 1,
          mtime: new Date('2026-09-01T18:00:00Z'),
        },
        {
          name: 'LOG_INTEGRACAO_2026-08-31.xlsx',
          path: '/planilhas/LOG_INTEGRACAO_2026-08-31.xlsx',
          size: 10,
          mtime: new Date('2026-08-31T21:00:00Z'),
        },
        {
          name: 'LOG_INTEGRACAO_2026-09-01.xlsx',
          path: '/planilhas/LOG_INTEGRACAO_2026-09-01.xlsx',
          size: 20,
          mtime: new Date('2026-09-01T21:00:00Z'),
        },
      ]),
      download: jest.fn(async () => undefined),
    };
    const fs = {
      mkdir: jest.fn(async () => undefined),
      sha256: jest.fn(async () => 'abc123'),
      stat: jest.fn(async () => ({ size: 20 })),
      createReadStream: jest.fn(),
    };
    const service = new SftpIntegratorService(
      { db: { collection: jest.fn(() => collection) } } as any,
      adapter,
      fs as any,
      'C:/app',
    );

    const result = await service.pullLatest('Grupo Tora');

    expect(result.downloaded).toBe(true);
    expect(adapter.download).toHaveBeenCalledWith(
      expect.objectContaining({ clientKey: 'grupo-tora' }),
      '/planilhas/LOG_INTEGRACAO_2026-09-01.xlsx',
      'C:\\app\\data\\sftp-integrator\\grupo-tora\\incoming\\LOG_INTEGRACAO_2026-09-01.xlsx',
    );
    expect(result.file).toMatchObject({
      clientKey: 'grupo-tora',
      remotePath: '/planilhas/LOG_INTEGRACAO_2026-09-01.xlsx',
      remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx',
      size: 20,
      sha256: 'abc123',
      status: 'downloaded',
    });
  });

  it('does not download again when the same remote file was already registered', async () => {
    const collection = createCollection();
    collection.rows.push({
      clientKey: 'grupo-tora',
      remotePath: '/planilhas/LOG_INTEGRACAO_2026-09-01.xlsx',
      remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx',
      localPath:
        'C:\\app\\data\\sftp-integrator\\grupo-tora\\incoming\\LOG_INTEGRACAO_2026-09-01.xlsx',
      size: 20,
      sha256: 'existing',
      remoteMtime: new Date('2026-09-01T21:00:00Z'),
      status: 'downloaded',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const adapter: SftpClientAdapter = {
      list: jest.fn(async () => [
        {
          name: 'LOG_INTEGRACAO_2026-09-01.xlsx',
          path: '/planilhas/LOG_INTEGRACAO_2026-09-01.xlsx',
          size: 20,
          mtime: new Date('2026-09-01T21:00:00Z'),
        },
      ]),
      download: jest.fn(),
    };
    const service = new SftpIntegratorService(
      { db: { collection: jest.fn(() => collection) } } as any,
      adapter,
      {} as any,
      'C:/app',
    );

    const result = await service.pullLatest('grupo-tora');

    expect(result.downloaded).toBe(false);
    expect(adapter.download).not.toHaveBeenCalled();
    expect(result.file.sha256).toBe('existing');
  });

  it('rejects download paths that are outside the configured client directory', async () => {
    const service = new SftpIntegratorService(
      { db: { collection: jest.fn(() => createCollection()) } } as any,
      {} as any,
      {} as any,
      'C:/app',
    );

    await expect(
      service.resolveDownloadPath('grupo-tora', '../secret.xlsx'),
    ).rejects.toThrow('Arquivo fora do diretorio do integrador SFTP');
  });
});
