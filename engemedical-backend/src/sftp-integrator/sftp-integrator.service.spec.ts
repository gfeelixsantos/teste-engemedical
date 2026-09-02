import { ObjectId } from 'mongodb';
import { SftpIntegratorService } from './sftp-integrator.service';
import { SftpClientAdapter } from './sftp-integrator.types';

function createCollection() {
  const rows: any[] = [];
  return {
    rows,
    createIndex: jest.fn().mockResolvedValue('idx'),
    findOne: jest.fn(async (query: any) =>
      rows.find((row) => {
        if (query._id) {
          return (
            String(row._id) === String(query._id) &&
            row.clientKey === query.clientKey
          );
        }
        return (
          row.clientKey === query.clientKey &&
          row.remotePath === query.remotePath &&
          row.size === query.size
        );
      }) || null,
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
      SFTP_INTEGRATOR_GRUPO_TORA_REPORT_EMAIL_TO:
        'operacionalbh@engemedical.com,felix.devx@gmail.com',
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
      {} as any,
      {} as any,
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
      {} as any,
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
      {} as any,
      {} as any,
      'C:/app',
    );

    await expect(
      service.resolveDownloadPath('grupo-tora', '../secret.xlsx'),
    ).rejects.toThrow('Arquivo fora do diretorio do integrador SFTP');
  });

  it('parses a registered spreadsheet file and stores an execution report', async () => {
    const filesCollection = createCollection();
    const runsCollection = createCollection();
    const fileId = new ObjectId();
    filesCollection.rows.push({
      _id: fileId,
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
    const db = {
      collection: jest.fn((name: string) =>
        name === 'sftp_integrator_runs' ? runsCollection : filesCollection,
      ),
    };
    const parser = {
      parseGrupoToraFile: jest.fn(async () => ({
        rows: [
          {
            rowNumber: 2,
            valid: true,
            employee: { cpf: '12948532604', nomeFuncionario: 'Pessoa Teste' },
            errors: [],
          },
        ],
        summary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          situationCounts: { ATIVO: 1 },
        },
      })),
    };
    const service = new SftpIntegratorService(
      { db } as any,
      {} as any,
      {} as any,
      parser as any,
      {} as any,
      'C:/app',
    );

    const result = await service.parseFile('grupo-tora', fileId.toHexString());

    expect(parser.parseGrupoToraFile).toHaveBeenCalledWith(
      'C:\\app\\data\\sftp-integrator\\grupo-tora\\incoming\\LOG_INTEGRACAO_2026-09-01.xlsx',
    );
    expect(result.summary).toEqual({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      situationCounts: { ATIVO: 1 },
    });
    expect(runsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        clientKey: 'grupo-tora',
        fileId,
        status: 'parsed',
        summary: result.summary,
      }),
    );
  });

  it('runs a dry-run for all valid spreadsheet rows and emails the operational report', async () => {
    const filesCollection = createCollection();
    const runsCollection = createCollection();
    const fileId = new ObjectId();
    filesCollection.rows.push({
      _id: fileId,
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
    const db = {
      collection: jest.fn((name: string) =>
        name === 'sftp_integrator_runs' ? runsCollection : filesCollection,
      ),
    };
    const parser = {
      parseGrupoToraFile: jest.fn(async () => ({
        rows: [
          {
            rowNumber: 2,
            valid: true,
            employee: {
              codigoEmpresaProtheus: '04',
              codigoUnidadeProtheus: '001',
              nomeUnidadeProtheus: 'Unidade Teste',
              codigoUnidadeFt: '701',
              codigoSetor: '22',
              nomeSetor: 'Operacao',
              codigoCargo: '33',
              nomeCargo: 'Motorista',
              matriculaEsocial: 'E123',
              matriculaRh: 'RH456',
              nomeFuncionario: 'Pessoa Teste',
              situacao: 'FERIAS',
              cpf: '12345678901',
              categoriaEsocial: '101',
            },
            errors: [],
          },
          {
            rowNumber: 3,
            valid: true,
            employee: {
              codigoEmpresaProtheus: '04',
              codigoUnidadeProtheus: '001',
              nomeUnidadeProtheus: 'Unidade Teste',
              codigoUnidadeFt: '701',
              codigoSetor: '22',
              nomeSetor: 'Operacao',
              codigoCargo: '33',
              nomeCargo: 'Motorista',
              matriculaEsocial: 'E124',
              matriculaRh: 'RH457',
              nomeFuncionario: 'Outra Pessoa',
              situacao: 'INATIVO',
              cpf: '98765432100',
              categoriaEsocial: '101',
            },
            errors: [],
          },
          {
            rowNumber: 4,
            valid: false,
            employee: {
              codigoEmpresaProtheus: '04',
              codigoUnidadeProtheus: '001',
              nomeUnidadeProtheus: 'Unidade Teste',
              codigoUnidadeFt: '701',
              codigoSetor: '22',
              nomeSetor: 'Operacao',
              codigoCargo: '33',
              nomeCargo: 'Motorista',
              matriculaEsocial: '',
              matriculaRh: '',
              nomeFuncionario: '',
              situacao: 'ATIVO',
              cpf: '',
              categoriaEsocial: '101',
            },
            errors: [
              'CPF ausente',
              'Nome do funcionario ausente',
              'Matricula RH ausente',
            ],
          },
        ],
        summary: {
          totalRows: 3,
          validRows: 2,
          invalidRows: 1,
          situationCounts: { FERIAS: 1, INATIVO: 1, ATIVO: 1 },
        },
      })),
    };
    const emailService = { sendEmail: jest.fn(async () => undefined) };
    const service = new SftpIntegratorService(
      { db } as any,
      {} as any,
      {} as any,
      parser as any,
      emailService as any,
      'C:/app',
    );

    const result = await service.runDryRun('grupo-tora', fileId.toHexString());

    expect(result.status).toBe('dry_run');
    expect(result.summary).toMatchObject({
      totalRows: 3,
      validRows: 2,
      invalidRows: 1,
      payloadsPrepared: 2,
      skippedRows: 1,
      situationCounts: { FERIAS: 1, INATIVO: 1, ATIVO: 1 },
    });
    expect(result.soapPreview).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        lookupKey: 'CPF',
        situationToSend: 'FERIAS',
        maskedCpf: '*******8901',
      }),
      expect.objectContaining({
        rowNumber: 3,
        lookupKey: 'CPF',
        situationToSend: 'INATIVO',
        maskedCpf: '*******2100',
      }),
    ]);
    expect(runsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        clientKey: 'grupo-tora',
        fileId,
        status: 'dry_run',
      }),
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['operacionalbh@engemedical.com', 'felix.devx@gmail.com'],
        subject: expect.stringContaining('Dry-run SFTP Grupo Tora'),
        templatename: 'CUSTOM_REPORT',
        template: expect.stringContaining('CPF ausente'),
      }),
    );
  });
});
