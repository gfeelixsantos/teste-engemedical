import { Test, TestingModule } from '@nestjs/testing';
import { SftpReportsService } from './sftp-reports.service';
import { MongoService } from 'src/mongo/mongo.service';
import { Collection, ObjectId } from 'mongodb';

describe('SftpReportsService', () => {
  let service: SftpReportsService;
  let mongoService: jest.Mocked<MongoService>;
  let filesCollection: jest.Mocked<Collection>;
  let runsCollection: jest.Mocked<Collection>;

  const createMockCollection = () => {
    return {
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      insertOne: jest.fn(),
      aggregate: jest.fn(),
      createIndex: jest.fn().mockResolvedValue(undefined),
    };
  };

  beforeEach(async () => {
    filesCollection = createMockCollection();
    runsCollection = createMockCollection();

    mongoService = {
      db: {
        collection: jest.fn((name: string) =>
          name === 'sftp_integrator_files' ? filesCollection : runsCollection
        ),
      },
      schedulingsCollection: {} as any,
      examFormSnapshotsCollection: {} as any,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SftpReportsService,
        {
          provide: MongoService,
          useValue: mongoService,
        },
      ],
    }).compile();

    service = module.get<SftpReportsService>(SftpReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getExecutions', () => {
    it('should return executions with total count', async () => {
      const mockExecutions = [
        {
          _id: new ObjectId('65f1234567890abcdef12345'),
          clientKey: 'grupo-tora',
          fileId: new ObjectId('65f1234567890abcdef12346'),
          status: 'dry_run',
          summary: { totalRows: 100, validRows: 95, invalidRows: 5 },
          createdAt: new Date('2026-09-01T10:00:00Z'),
          updatedAt: new Date('2026-09-01T10:05:00Z'),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn(async () => mockExecutions),
      };

      (runsCollection.find as any).mockReturnValue(mockQuery);
      (runsCollection.countDocuments as any).mockResolvedValue(1);

      const result = await service.getExecutions({ limit: 50, skip: 0 });

      expect(runsCollection.find).toHaveBeenCalledWith({});
      expect(runsCollection.countDocuments).toHaveBeenCalledWith({});
      expect(result.total).toBe(1);
      expect(result.executions).toHaveLength(1);
      expect(result.executions[0].id).toBeDefined();
    });

    it('should filter by clientKey and status', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn(async () => []),
      };

      (runsCollection.find as any).mockReturnValue(mockQuery);
      (runsCollection.countDocuments as any).mockResolvedValue(0);

      await service.getExecutions({
        clientKey: 'grupo-tora',
        status: 'dry_run',
        limit: 25,
        skip: 10,
      });

      expect(runsCollection.find).toHaveBeenCalledWith({
        clientKey: 'grupo-tora',
        status: 'dry_run',
      });
      expect(runsCollection.countDocuments).toHaveBeenCalledWith({
        clientKey: 'grupo-tora',
        status: 'dry_run',
      });
    });
  });

  describe('getFiles', () => {
    it('should return files with total count', async () => {
      const mockFiles = [
        {
          _id: new ObjectId('65f1234567890abcdef12346'),
          clientKey: 'grupo-tora',
          remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx',
          size: 1024000,
          status: 'downloaded',
          createdAt: new Date('2026-09-01T09:05:00Z'),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn(async () => mockFiles),
      };

      (filesCollection.find as any).mockReturnValue(mockQuery);
      (filesCollection.countDocuments as any).mockResolvedValue(1);

      const result = await service.getFiles({ limit: 50, skip: 0 });

      expect(filesCollection.find).toHaveBeenCalledWith({});
      expect(filesCollection.countDocuments).toHaveBeenCalledWith({});
      expect(result.total).toBe(1);
      expect(result.files).toHaveLength(1);
    });
  });

  describe('getReportById', () => {
    it('should return execution and related file when found', async () => {
      const executionId = '65f1234567890abcdef12345';
      const fileId = new ObjectId('65f1234567890abcdef12346');

      const mockExecution = {
        _id: new ObjectId(executionId),
        clientKey: 'grupo-tora',
        fileId,
        status: 'dry_run',
        summary: { totalRows: 100, validRows: 95, invalidRows: 5 },
        createdAt: new Date('2026-09-01T10:00:00Z'),
        updatedAt: new Date('2026-09-01T10:05:00Z'),
      };

      const mockFile = {
        _id: fileId,
        clientKey: 'grupo-tora',
        remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx',
        size: 1024000,
        status: 'downloaded',
        createdAt: new Date('2026-09-01T09:05:00Z'),
      };

      (runsCollection.findOne as any).mockResolvedValue(mockExecution);
      (filesCollection.findOne as any).mockResolvedValue(mockFile);

      const result = await service.getReportById(executionId);

      expect(result.execution).toBeDefined();
      expect(result.execution!.id).toBe(executionId);
      expect(result.file).toBeDefined();
      expect(result.file!.id).toBeDefined();
    });

    it('should return null execution when id not found', async () => {
      (runsCollection.findOne as any).mockResolvedValue(null);

      const result = await service.getReportById('nonexistent');

      expect(result.execution).toBeNull();
      expect(result.file).toBeUndefined();
    });

    it('should return null for invalid ObjectId', async () => {
      const result = await service.getReportById('invalid-id');

      expect(result.execution).toBeNull();
    });
  });

  describe('getHorarios', () => {
    it('should return horarios from environment configuration', async () => {
      process.env.SFTP_INTEGRATOR_GRUPO_TORA_HOST = 'sftp.example.com';
      process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED = 'true';
      process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_EXPRESSION = '0 2 * * 1-5';

      const result = await service.getHorarios();

      expect(result.horarios).toBeDefined();
      expect(Array.isArray(result.horarios)).toBe(true);
      expect(result.horarios.length).toBeGreaterThan(0);

      delete process.env.SFTP_INTEGRATOR_GRUPO_TORA_HOST;
      delete process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED;
      delete process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_EXPRESSION;
    });

    it('should return empty array when no configuration', async () => {
      const result = await service.getHorarios();

      expect(result.horarios).toEqual([]);
    });
  });
});