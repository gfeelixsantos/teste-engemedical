import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { MongoService } from './mongo.service';
import { AzureService } from 'src/azure/azure.service';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { SignatureService } from 'src/signature/signature.service';
import { SocService } from 'src/soc/soc.service';
import { StructuredLogger } from 'src/utils/logger';
import { EmpresaCacheService } from './empresa-cache.service';
import { UnitsService } from '../units/units.service';
import { OrientacoesConfigService } from '../orientacoes-config/orientacoes-config.service';
import { AtendimentoStatus, ExamStatus } from './enum/scheduling.enum';
import {
  TicketActionType,
  TicketGroups,
  TicketStatus,
} from 'src/ticket/enum/ticket.enum';

describe('MongoService ticket reconciliation', () => {
  let service: MongoService;

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockWebSocket = {
    server: {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    },
  };

  const mockCollection = {
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock') },
        },
        { provide: AzureService, useValue: {} },
        { provide: WebsocketGateway, useValue: mockWebSocket },
        {
          provide: SignatureService,
          useValue: {
            hasValidSignatureSession: jest.fn().mockResolvedValue(false),
          },
        },
        { provide: SocService, useValue: {} },
        { provide: EmpresaCacheService, useValue: {} },
        { provide: UnitsService, useValue: {} },
        { provide: OrientacoesConfigService, useValue: {} },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<MongoService>(MongoService);
    service.schedulingsCollection = mockCollection as any;
  });

  it('releases active tickets whose bound exam is no longer pending', async () => {
    const schedulingId = new ObjectId();
    const staleScheduling = {
      _id: schedulingId,
      DATAAGENDAMENTO: '08/04/2026',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      NOME: 'WELLYS MATHEUS FREITAS DA SILVA',
      ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
      EXAMES: [
        {
          codigoExame: '51.01.004-6',
          grupo: 'Audiometria',
          status: ExamStatus.PENDENTE,
        },
        {
          codigoExame: '19.01.029-0',
          grupo: 'Espirometria',
          status: ExamStatus.PENDENTE,
        },
      ],
      TICKET: {
        id: 45,
        status: TicketStatus.EM_ATENDIMENTO,
        sala: 'SALA 2',
        grupo: TicketGroups.EXAME,
        exame: 'Exame Clínico',
        unidade: 'RIO CLARO',
        updatedAt: new Date('2026-04-08T12:00:54.655Z'),
      },
    };

    mockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([staleScheduling]),
    });
    mockCollection.updateOne.mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });

    const result = await service.reconcileInconsistentActiveTickets('test');

    expect(result).toEqual({
      source: 'test',
      evaluated: 1,
      reconciled: 1,
    });
    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(schedulingId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          TICKET: expect.objectContaining({
            status: TicketStatus.AGUARDANDO,
            sala: '',
            profissional: '',
            atendente: '',
          }),
        }),
      }),
    );
  });

  it('keeps multiple active tickets in the same room when they belong to the same professional', async () => {
    const firstSchedulingId = new ObjectId();
    const secondSchedulingId = new ObjectId();
    const todayBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date());

    mockCollection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        {
          _id: firstSchedulingId,
          DATAAGENDAMENTO: todayBR,
          UNIDADEATENDIMENTO: 'RIO CLARO',
          NOME: 'PACIENTE 1',
          ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
          EXAMES: [
            {
              codigoExame: '51.01.004-6',
              grupo: 'Audiometria',
              status: ExamStatus.PENDENTE,
            },
          ],
          TICKET: {
            id: 100,
            status: TicketStatus.EM_ATENDIMENTO,
            sala: 'SALA 2',
            grupo: TicketGroups.EXAME,
            exame: 'Audiometria',
            unidade: 'RIO CLARO',
            profissional: 'Beatriz Audiometria',
            updatedAt: new Date('2026-04-08T12:00:54.655Z'),
          },
        },
        {
          _id: secondSchedulingId,
          DATAAGENDAMENTO: todayBR,
          UNIDADEATENDIMENTO: 'RIO CLARO',
          NOME: 'PACIENTE 2',
          ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
          EXAMES: [
            {
              codigoExame: '51.01.004-6',
              grupo: 'Audiometria',
              status: ExamStatus.PENDENTE,
            },
          ],
          TICKET: {
            id: 101,
            status: TicketStatus.EM_CHAMADA,
            sala: 'SALA 2',
            grupo: TicketGroups.EXAME,
            exame: 'Audiometria',
            unidade: 'RIO CLARO',
            profissional: 'Beatriz Audiometria',
            updatedAt: new Date('2026-04-08T12:05:54.655Z'),
          },
        },
      ]),
    });

    const result = await service.reconcileInconsistentActiveTickets('test');

    expect(result).toEqual({
      source: 'test',
      evaluated: 2,
      reconciled: 0,
    });
    expect(mockCollection.updateOne).not.toHaveBeenCalled();
  });

  it('blocks assigning a room already occupied by another active ticket from a different professional', async () => {
    const schedulingId = new ObjectId();
    const conflictingId = new ObjectId();

    const currentScheduling = {
      _id: schedulingId,
      DATAAGENDAMENTO: '08/04/2026',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
      EXAMES: [
        {
          codigoExame: '51.01.004-6',
          grupo: 'Audiometria',
          status: ExamStatus.PENDENTE,
        },
      ],
      TICKET: {
        id: 58,
        status: TicketStatus.AGUARDANDO,
        sala: '',
        grupo: TicketGroups.EXAME,
        exame: 'Audiometria',
        unidade: 'RIO CLARO',
      },
    };

    const conflictingScheduling = {
      _id: conflictingId,
      DATAAGENDAMENTO: '08/04/2026',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      NOME: 'PACIENTE EM SALA',
      ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
      EXAMES: [
        {
          codigoExame: '51.01.004-6',
          grupo: 'Audiometria',
          status: ExamStatus.PENDENTE,
        },
      ],
      TICKET: {
        id: 77,
        status: TicketStatus.EM_ATENDIMENTO,
        sala: 'SALA 2',
        grupo: TicketGroups.EXAME,
        exame: 'Audiometria',
        unidade: 'RIO CLARO',
        profissional: 'Outro Profissional',
        updatedAt: new Date('2026-04-08T13:05:00.000Z'),
      },
    };

    mockCollection.findOne.mockResolvedValueOnce(currentScheduling);
    mockCollection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([conflictingScheduling]),
    });

    await expect(
      service.executeAction({
        funcionarioId: schedulingId.toHexString(),
        ticketId: 58,
        action: TicketActionType.ATENDER,
        unidade: 'RIO CLARO',
        sala: 'SALA 2',
        exame: 'Audiometria',
        user: 'Profissional Teste',
      } as any),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        message: 'Sala SALA 2 já está ocupada por outro atendimento ativo.',
      }),
    });
  });

  it('allows assigning a room already used by another active ticket from the same professional', async () => {
    const schedulingId = new ObjectId();
    const conflictingId = new ObjectId();

    const currentScheduling = {
      _id: schedulingId,
      DATAAGENDAMENTO: '08/04/2026',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
      EXAMES: [
        {
          codigoExame: '51.01.004-6',
          grupo: 'Audiometria',
          status: ExamStatus.PENDENTE,
        },
      ],
      TICKET: {
        id: 58,
        status: TicketStatus.AGUARDANDO,
        sala: '',
        grupo: TicketGroups.EXAME,
        exame: 'Audiometria',
        unidade: 'RIO CLARO',
      },
    };

    const sameOwnerScheduling = {
      _id: conflictingId,
      DATAAGENDAMENTO: '08/04/2026',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      NOME: 'PACIENTE JA COMIGO',
      ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
      EXAMES: [
        {
          codigoExame: '51.01.004-6',
          grupo: 'Audiometria',
          status: ExamStatus.PENDENTE,
        },
      ],
      TICKET: {
        id: 77,
        status: TicketStatus.EM_ATENDIMENTO,
        sala: 'SALA 2',
        grupo: TicketGroups.EXAME,
        exame: 'Audiometria',
        unidade: 'RIO CLARO',
        profissional: 'Profissional Teste',
        updatedAt: new Date('2026-04-08T13:05:00.000Z'),
      },
    };

    mockCollection.findOne.mockResolvedValueOnce(currentScheduling);
    mockCollection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([sameOwnerScheduling]),
    });
    mockCollection.findOneAndUpdate.mockResolvedValue({
      TICKET: {
        ...currentScheduling.TICKET,
        status: TicketStatus.EM_ATENDIMENTO,
        sala: 'SALA 2',
        profissional: 'Profissional Teste',
        updatedAt: new Date(),
      },
    });

    await expect(
      service.executeAction({
        funcionarioId: schedulingId.toHexString(),
        ticketId: 58,
        action: TicketActionType.ATENDER,
        unidade: 'RIO CLARO',
        sala: 'SALA 2',
        exame: 'Audiometria',
        user: 'Profissional Teste',
      } as any),
    ).resolves.toMatchObject({
      status: TicketStatus.EM_ATENDIMENTO,
      sala: 'SALA 2',
      profissional: 'Profissional Teste',
    });
  });

  it('allows assigning a room when the active owner matches after accent and case normalization', async () => {
    const schedulingId = new ObjectId();
    const conflictingId = new ObjectId();

    const currentScheduling = {
      _id: schedulingId,
      DATAAGENDAMENTO: '08/04/2026',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
      EXAMES: [
        {
          codigoExame: '51.01.004-6',
          grupo: 'Audiometria',
          status: ExamStatus.PENDENTE,
        },
      ],
      TICKET: {
        id: 58,
        status: TicketStatus.AGUARDANDO,
        sala: '',
        grupo: TicketGroups.EXAME,
        exame: 'Audiometria',
        unidade: 'RIO CLARO',
      },
    };

    const sameOwnerScheduling = {
      _id: conflictingId,
      DATAAGENDAMENTO: '08/04/2026',
      UNIDADEATENDIMENTO: 'RIO CLARO',
      NOME: 'PACIENTE JA COMIGO',
      ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
      EXAMES: [
        {
          codigoExame: '51.01.004-6',
          grupo: 'Audiometria',
          status: ExamStatus.PENDENTE,
        },
      ],
      TICKET: {
        id: 77,
        status: TicketStatus.EM_ATENDIMENTO,
        sala: 'SALA 4',
        grupo: TicketGroups.EXAME,
        exame: 'Audiometria',
        unidade: 'RIO CLARO',
        profissional: 'Biánca Sabrina - CMSO',
        updatedAt: new Date('2026-04-08T13:05:00.000Z'),
      },
    };

    mockCollection.findOne.mockResolvedValueOnce(currentScheduling);
    mockCollection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([sameOwnerScheduling]),
    });
    mockCollection.findOneAndUpdate.mockResolvedValue({
      TICKET: {
        ...currentScheduling.TICKET,
        status: TicketStatus.EM_ATENDIMENTO,
        sala: 'SALA 4',
        profissional: 'bianca sabrina - cmso',
        updatedAt: new Date(),
      },
    });

    await expect(
      service.executeAction({
        funcionarioId: schedulingId.toHexString(),
        ticketId: 58,
        action: TicketActionType.ATENDER,
        unidade: 'RIO CLARO',
        sala: 'sala 4',
        exame: 'Audiometria',
        user: 'bianca sabrina - cmso',
      } as any),
    ).resolves.toMatchObject({
      status: TicketStatus.EM_ATENDIMENTO,
      sala: 'SALA 4',
      profissional: 'bianca sabrina - cmso',
    });
  });
});
