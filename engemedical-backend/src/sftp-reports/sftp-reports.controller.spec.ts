import { Test, TestingModule } from '@nestjs/testing';
import { SftpReportsController } from './sftp-reports.controller';
import { SftpReportsService } from './sftp-reports.service';
import { NotFoundException } from '@nestjs/common';

describe('SftpReportsController', () => {
  let controller: SftpReportsController;
  let service: jest.Mocked<SftpReportsService>;

  const mockService = {
    getExecutions: jest.fn(),
    getFiles: jest.fn(),
    getReportById: jest.fn(),
    getHorarios: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SftpReportsController],
      providers: [
        {
          provide: SftpReportsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SftpReportsController>(SftpReportsController);
    service = module.get(SftpReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /sftp-executions', () => {
    it('should return executions with pagination', async () => {
      const mockExecutions = [
        {
          id: '65f1234567890abcdef12345',
          clientKey: 'grupo-tora',
          fileId: '65f1234567890abcdef12346',
          status: 'dry_run',
          summary: {
            totalRows: 100,
            validRows: 95,
            invalidRows: 5,
          },
          createdAt: new Date('2026-09-01T10:00:00Z'),
          updatedAt: new Date('2026-09-01T10:05:00Z'),
        },
      ];

      mockService.getExecutions.mockResolvedValue({
        executions: mockExecutions,
        total: 1,
      });

      const result = await controller.getExecutions();

      expect(mockService.getExecutions).toHaveBeenCalledWith({
        limit: 50,
        skip: 0,
      });
      expect(result).toEqual({
        executions: mockExecutions,
        total: 1,
      });
    });

    it('should apply query filters', async () => {
      mockService.getExecutions.mockResolvedValue({
        executions: [],
        total: 0,
      });

      await controller.getExecutions('grupo-tora', 'dry_run', 25, 10);

      expect(mockService.getExecutions).toHaveBeenCalledWith({
        clientKey: 'grupo-tora',
        status: 'dry_run',
        limit: 25,
        skip: 10,
      });
    });
  });

  describe('GET /sftp-files', () => {
    it('should return files with pagination', async () => {
      const mockFiles = [
        {
          id: '65f1234567890abcdef12346',
          clientKey: 'grupo-tora',
          remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx',
          remotePath: '/planilhas/LOG_INTEGRACAO_2026-09-01.xlsx',
          size: 1024000,
          sha256: 'abc123',
          remoteMtime: new Date('2026-09-01T09:00:00Z'),
          status: 'downloaded',
          createdAt: new Date('2026-09-01T09:05:00Z'),
          updatedAt: new Date('2026-09-01T09:10:00Z'),
        },
      ];

      mockService.getFiles.mockResolvedValue({
        files: mockFiles,
        total: 1,
      });

      const result = await controller.getFiles();

      expect(mockService.getFiles).toHaveBeenCalledWith({
        limit: 50,
        skip: 0,
      });
      expect(result).toEqual({
        files: mockFiles,
        total: 1,
      });
    });

    it('should filter by clientKey', async () => {
      mockService.getFiles.mockResolvedValue({
        files: [],
        total: 0,
      });

      await controller.getFiles('grupo-tora');

      expect(mockService.getFiles).toHaveBeenCalledWith({
        clientKey: 'grupo-tora',
        limit: 50,
        skip: 0,
      });
    });
  });

  describe('GET /sftp-report/:id', () => {
    it('should return report for valid id', async () => {
      const mockExecution = {
        id: '65f1234567890abcdef12345',
        clientKey: 'grupo-tora',
        fileId: '65f1234567890abcdef12346',
        status: 'dry_run',
        summary: { totalRows: 100, validRows: 95, invalidRows: 5 },
        createdAt: new Date('2026-09-01T10:00:00Z'),
        updatedAt: new Date('2026-09-01T10:05:00Z'),
      };

      const mockFile = {
        id: '65f1234567890abcdef12346',
        clientKey: 'grupo-tora',
        remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx',
        size: 1024000,
        sha256: 'abc123',
        remoteMtime: new Date('2026-09-01T09:00:00Z'),
        status: 'downloaded',
        createdAt: new Date('2026-09-01T09:05:00Z'),
        updatedAt: new Date('2026-09-01T09:10:00Z'),
      };

      mockService.getReportById.mockResolvedValue({
        execution: mockExecution,
        file: mockFile,
      });

      const result = await controller.getReportById('65f1234567890abcdef12345');

      expect(mockService.getReportById).toHaveBeenCalledWith(
        '65f1234567890abcdef12345'
      );
      expect(result.execution).toEqual(mockExecution);
      expect(result.file).toEqual(mockFile);
    });

    it('should throw NotFoundException for invalid id', async () => {
      mockService.getReportById.mockResolvedValue({
        execution: null,
      });

      await expect(controller.getReportById('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('GET /sftp-horarios', () => {
    it('should return horarios with cron information', async () => {
      const mockHorarios = [
        {
          clientKey: 'grupo-tora',
          cronExpression: '0 2 * * 1-5',
          cronEnabled: true,
          nextExecution: new Date('2026-09-08T02:00:00Z'),
          lastExecution: new Date('2026-09-01T02:00:00Z'),
          timezone: 'America/Sao_Paulo',
        },
      ];

      mockService.getHorarios.mockResolvedValue({
        horarios: mockHorarios,
      });

      const result = await controller.getHorarios();

      expect(mockService.getHorarios).toHaveBeenCalled();
      expect(result.horarios).toEqual(mockHorarios);
    });

    it('should return empty array when no horarios configured', async () => {
      mockService.getHorarios.mockResolvedValue({
        horarios: [],
      });

      const result = await controller.getHorarios();

      expect(result.horarios).toEqual([]);
    });
  });
});