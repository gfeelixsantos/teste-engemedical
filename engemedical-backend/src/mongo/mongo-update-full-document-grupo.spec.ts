import { Test, TestingModule } from '@nestjs/testing';
import { MongoService } from './mongo.service';
import { ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { AzureService } from 'src/azure/azure.service';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { SignatureService } from 'src/signature/signature.service';
import { SocService } from 'src/soc/soc.service';
import { EmpresaCacheService } from 'src/mongo/empresa-cache.service';
import { UnitsService } from 'src/units/units.service';
import { OrientacoesConfigService } from 'src/orientacoes-config/orientacoes-config.service';
import { StructuredLogger } from 'src/utils/logger';

const mockCollection = {
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
};

const mockClient = {
  db: jest.fn().mockReturnValue(mockDb),
  connect: jest.fn(),
  close: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('MongoService.updateFullDocument - backfill de grupo de exame', () => {
  let service: MongoService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoService,
        { provide: ConfigService, useValue: { get: () => 'mock' } },
        { provide: AzureService, useValue: {} },
        { provide: WebsocketGateway, useValue: {} },
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
    service.db = mockDb as any;
    jest
      .spyOn(service as any, 'maybeTriggerSocgedUpload')
      .mockResolvedValue(undefined);
  });

  const montarCenario = (
    examesBanco: any[],
    examesPayload: any[],
  ) => {
    const schedulingId = new ObjectId();

    mockCollection.findOne.mockResolvedValue({
      _id: schedulingId,
      AUTENTICACAOATENDIMENTO: { metodo: 'SOC' },
      EXAMES: examesBanco,
    });

    mockCollection.findOneAndUpdate.mockResolvedValue({
      value: { _id: schedulingId },
    });

    const payload = {
      _id: schedulingId.toString(),
      ATENDIMENTOSTATUS: 'ATENDIMENTO',
      AUTENTICACAOATENDIMENTO: { metodo: 'SOC' },
      EXAMES: examesPayload,
    };

    return payload;
  };

  const grupoPersistido = (): string | undefined =>
    mockCollection.findOneAndUpdate.mock.calls[0][1]?.$set?.EXAMES?.[0]?.grupo;

  it('deve preservar o grupo do banco quando o payload vier sem grupo', async () => {
    const payload = montarCenario(
      [
        {
          codigoExame: '28100239',
          nomeExame: 'Cultura nas fezes',
          status: 'AGUARDANDO_RESULTADO',
          grupo: 'Laboratório',
          url: 'https://x.pdf',
        },
      ],
      [
        {
          codigoExame: '28100239',
          nomeExame: 'Cultura nas fezes',
          status: 'AGUARDANDO_RESULTADO',
          grupo: '',
          url: 'https://x.pdf',
        },
      ],
    );

    await service.updateFullDocument(payload as any);

    expect(grupoPersistido()).toBe('Laboratório');
  });

  it('deve resolver o grupo pelo catálogo quando banco e payload estiverem sem grupo', async () => {
    const payload = montarCenario(
      [
        {
          codigoExame: '28100239',
          nomeExame: 'Cultura nas fezes',
          status: 'PENDENTE',
          grupo: '',
        },
      ],
      [
        {
          codigoExame: '28100239',
          nomeExame: 'Cultura nas fezes',
          status: 'PENDENTE',
          grupo: '',
        },
      ],
    );

    await service.updateFullDocument(payload as any);

    expect(grupoPersistido()).toBe('Laboratório');
  });

  it('deve manter o grupo explicito enviado no payload', async () => {
    const payload = montarCenario(
      [
        {
          codigoExame: '51.01.004-6',
          nomeExame: 'Audiometria',
          status: 'PENDENTE',
          grupo: '',
        },
      ],
      [
        {
          codigoExame: '51.01.004-6',
          nomeExame: 'Audiometria',
          status: 'FINALIZADO',
          grupo: 'Audiometria',
        },
      ],
    );

    await service.updateFullDocument(payload as any);

    expect(grupoPersistido()).toBe('Audiometria');
  });

  it('deve resolver o grupo de um exame novo adicionado pelo payload', async () => {
    const payload = montarCenario(
      [],
      [
        {
          codigoExame: '28.04.048-1',
          nomeExame: 'Hemograma',
          status: 'PENDENTE',
          grupo: '',
        },
      ],
    );

    await service.updateFullDocument(payload as any);

    expect(grupoPersistido()).toBe('Laboratório');
  });

  it('nao deve definir grupo quando o codigo nao existe em nenhum catalogo', async () => {
    const payload = montarCenario(
      [],
      [
        {
          codigoExame: 'CODIGO_INEXISTENTE_XYZ',
          nomeExame: 'Exame customizado',
          status: 'PENDENTE',
          grupo: '',
        },
      ],
    );

    await service.updateFullDocument(payload as any);

    const exame = mockCollection.findOneAndUpdate.mock.calls[0][1]?.$set
      ?.EXAMES?.[0];
    expect(exame.grupo).toBeFalsy();
  });
});
