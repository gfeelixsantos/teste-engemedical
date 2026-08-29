import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';
import { MongoService } from 'src/mongo/mongo.service';
import { PushService } from 'src/push/push.service';
import { SocService } from 'src/soc/soc.service';
import { TicketActionType, TicketStatus } from 'src/ticket/enum/ticket.enum';
import { TicketService } from 'src/ticket/ticket.service';
import { TtsService } from 'src/aws/tts.service';
import { EventType } from './events/events';
import { ActionRequestAtendimento } from './interfaces/actions';
import { WebsocketGateway } from './websocket-connection';
import { BiometriaCryptoService } from 'src/biometria/biometria-crypto.service';
import { AzureService } from 'src/azure/azure.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { BiometriaLgpdTermoService } from 'src/biometria/biometria-lgpd-termo.service';
import { AtendimentoAuthService } from 'src/atendimento-auth/atendimento-auth.service';
import { FacialService } from 'src/facial/facial.service';
import { TeleatendimentoService } from 'src/teleatendimento/teleatendimento.service';


describe('WebsocketGateway - atendimento_action ACK leve', () => {
  let gateway: WebsocketGateway;

  const mockMongoService = {
    schedulingsCollection: {
      findOne: jest.fn(),
    },
    executeAction: jest.fn(),
    reconcileInconsistentActiveTickets: jest.fn(),
    getSchedulingsToday: jest.fn(),
  };

  const mockTicketService = {
    convertToPainelCall: jest.fn(),
    audioGenerate: jest.fn(),
  };

  const mockSocService = {};
  const mockPushService = { sendAtendimentoNotification: jest.fn() };
  const mockTtsService = {
    deleteAudio: jest.fn(),
  };

  const mockPanelEmitter = {
    emit: jest.fn(),
  };

  const mockServer = {
    to: jest.fn().mockReturnValue(mockPanelEmitter),
    emit: jest.fn(),
    sockets: {
      sockets: { size: 0 },
      adapter: { rooms: new Map() },
    },
  };

  const payload: ActionRequestAtendimento = {
    funcionarioId: new ObjectId().toHexString(),
    ticketId: 123,
    action: TicketActionType.CHAMAR,
    unidade: 'RIO CLARO',
    sala: 'SALA 4',
    exame: 'Audiometria',
    user: 'Dr. Teste',
    nomeFuncionario: 'Hebert',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        { provide: TicketService, useValue: mockTicketService },
        { provide: MongoService, useValue: mockMongoService },
        { provide: SocService, useValue: mockSocService },
        { provide: PushService, useValue: mockPushService },
        { provide: TtsService, useValue: mockTtsService },
        { provide: BiometriaCryptoService, useValue: {} },
        { provide: AzureService, useValue: {} },
        { provide: AuditLogService, useValue: { logUserAction: jest.fn() } },
        { provide: BiometriaLgpdTermoService, useValue: {} },
        { provide: AtendimentoAuthService, useValue: {} },
        { provide: FacialService, useValue: {} },
        { provide: TeleatendimentoService, useValue: {} },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
    (gateway as any).server = mockServer;
  });

  it('deve emitir ACK leve para o cliente quando atendimento_action for aceito', async () => {
    mockMongoService.schedulingsCollection.findOne.mockResolvedValue({
      NOME: 'Hebert',
      TICKET: { id: 123 },
    });
    mockMongoService.executeAction.mockResolvedValue({
      id: 123,
      status: TicketStatus.FINALIZADO,
    });
    mockTicketService.convertToPainelCall.mockReturnValue({
      name: 'Hebert',
      sala: 'SALA 4',
    });

    const client = { emit: jest.fn() } as any;

    await gateway.handleAtendimentoAction(payload, client);

    expect(client.emit).toHaveBeenCalledWith(
      EventType.TICKET_ACTION_SUCCESS,
      expect.objectContaining({
        ticketId: 123,
        action: TicketActionType.CHAMAR,
        statusFinal: TicketStatus.FINALIZADO,
      }),
    );
    expect(mockTtsService.deleteAudio).toHaveBeenCalled();
  });

  it('deve continuar emitindo TICKET_ERROR quando atendimento_action falhar', async () => {
    mockMongoService.schedulingsCollection.findOne.mockResolvedValue({
      NOME: 'Hebert',
      TICKET: { id: 123 },
    });
    mockMongoService.executeAction.mockRejectedValue(
      new Error('Falha simulada no atendimento'),
    );

    const client = { emit: jest.fn() } as any;

    await gateway.handleAtendimentoAction(payload, client);

    expect(client.emit).toHaveBeenCalledWith(
      EventType.TICKET_ERROR,
      expect.any(String),
    );
  });

  describe('handleTicketAction ACK', () => {
    it('deve retornar ok: true quando ticket_action for executado com sucesso', async () => {
      const ticketMock = { id: 123, status: TicketStatus.AGUARDANDO, grupo: 'EXAME', funcionario: { nome: 'Hebert' } };
      mockTicketService['executeAction'] = jest.fn().mockResolvedValue(ticketMock);

      const actionPayload = {
        ticketId: 123,
        action: TicketActionType.EXAME,
        unidade: 'RIO CLARO',
        sala: 'SALA 1',
        user: 'Dr. Teste',
        funcionario: 'Hebert',
      } as any;

      const client = { id: 'socket123', emit: jest.fn() } as any;
      const response = await gateway.handleTicketAction(actionPayload, client);

      expect(response).toEqual({ ok: true });
      expect(mockTicketService['executeAction']).toHaveBeenCalledWith(expect.objectContaining({
        ticketId: 123,
        action: TicketActionType.EXAME,
      }));
      expect(mockServer.to).toHaveBeenCalledWith('RIO CLARO');
    });

    it('deve retornar ok: false quando ticket_action falhar', async () => {
      mockTicketService['executeAction'] = jest.fn().mockRejectedValue(new Error('Erro no banco'));

      const actionPayload = {
        ticketId: 123,
        action: TicketActionType.EXAME,
        unidade: 'RIO CLARO',
      } as any;

      const client = { id: 'socket123', emit: jest.fn() } as any;
      const response = await gateway.handleTicketAction(actionPayload, client);

      expect(response).toEqual({ ok: false, error: 'Erro no banco' });
      expect(client.emit).toHaveBeenCalledWith(
        EventType.TICKET_ERROR,
        expect.any(String),
      );
    });
  });
});
