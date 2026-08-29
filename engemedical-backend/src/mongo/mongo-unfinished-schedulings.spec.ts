import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongodb';

import { AzureService } from '../azure/azure.service';
import { SignatureService } from '../signature/signature.service';
import { SocService } from '../soc/soc.service';
import { StructuredLogger } from '../utils/logger';
import * as pipelineUtils from '../utils/util';
import { MongoService } from './mongo.service';
import { AtendimentoStatus, ExamStatus } from './enum/scheduling.enum';

jest.mock('../utils/util', () => {
  const actual = jest.requireActual('../utils/util');
  return {
    ...actual,
    calcularRangePipeline: jest.fn(),
  };
});

describe('MongoService - backlog maintenance', () => {
  let service: MongoService;

  const mockCollection = {
    deleteMany: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-value'),
  } as unknown as ConfigService;

  const mockAzureService = {
    filaResultadosExamesProcessar: jest.fn().mockResolvedValue({ messageId: '1' }),
  } as unknown as AzureService;

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as StructuredLogger;

  const mockSignatureService = {
    hasValidSignatureSession: jest.fn().mockResolvedValue(false),
  } as unknown as SignatureService;

  const mockSocService = {} as SocService;
  const mockWebSocket = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();

    (pipelineUtils.calcularRangePipeline as jest.Mock).mockReturnValue({
      inicioDoDiaBR: new Date('2026-05-06T03:00:00.000Z'),
    });

    service = new MongoService(
      mockConfigService,
      mockAzureService,
      mockWebSocket,
      mockSignatureService,
      mockSocService,
      {} as any,
      {} as any,
      { findByIdSafe: jest.fn() } as any,
      mockLogger,
    );

    (service as any).schedulingsCollection = mockCollection;
    mockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    });
    mockCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mockCollection.updateOne.mockResolvedValue({ acknowledged: true });
  });

  describe('cleanupSchedule', () => {
    it('deletes all old AGENDADO records through a single Mongo query without retaining dismissional records', async () => {
      await service.cleanupSchedule();

      expect(mockCollection.find).not.toHaveBeenCalled();
      expect(mockCollection.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        ATENDIMENTOSTATUS: AtendimentoStatus.AGENDADO,
        DATAAGENDAMENTO_DATE: { $lt: new Date('2026-05-06T03:00:00.000Z') },
      });
    });
  });

  describe('processUnfinishedSchedulings', () => {
    it('queries only old active schedulings and moves naturally async pending exams to AGUARDANDO_RESULTADO', async () => {
      const toArray = jest.fn().mockResolvedValue([
        {
          _id: new ObjectId('6657a6f65d4d4f0a2bc11111'),
          DATAAGENDAMENTO: '05/05/2026',
          DATAAGENDAMENTO_DATE: new Date('2026-05-05T03:00:00.000Z'),
          ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
          EXAMES: [
            {
              codigoExame: '32050070',
              grupo: 'Raio-X',
              nomeExame: 'Raio-X',
              status: ExamStatus.PENDENTE,
            },
          ],
        },
      ]);
      mockCollection.find.mockReturnValue({ toArray });

      await service.processUnfinishedSchedulings();

      expect(mockCollection.find).toHaveBeenCalledWith({
        DATAAGENDAMENTO_DATE: { $lt: new Date('2026-05-06T03:00:00.000Z') },
        ATENDIMENTOSTATUS: {
          $in: [
            AtendimentoStatus.EM_ATENDIMENTO,
            AtendimentoStatus.AGUARDANDO_RESULTADOS,
            AtendimentoStatus.AVALIACAO_MEDICA,
          ],
        },
      });
      expect(mockAzureService.filaResultadosExamesProcessar).not.toHaveBeenCalled();
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId('6657a6f65d4d4f0a2bc11111') },
        {
          $set: {
            EXAMES: [
              expect.objectContaining({
                codigoExame: '32050070',
                status: ExamStatus.AGUARDANDO_RESULTADO,
              }),
            ],
            ATENDIMENTOSTATUS: AtendimentoStatus.AGUARDANDO_RESULTADOS,
          },
        },
      );
    });
  });
});
