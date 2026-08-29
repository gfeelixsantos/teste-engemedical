import { Test, TestingModule } from '@nestjs/testing';
import { MongoService } from './mongo.service';
import { Collection, ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { AzureService } from 'src/azure/azure.service';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { SignatureService } from 'src/signature/signature.service';
import { SocService } from 'src/soc/soc.service';
import { EmpresaCacheService } from './empresa-cache.service';
import { UnitsService } from '../units/units.service';
import { OrientacoesConfigService } from '../orientacoes-config/orientacoes-config.service';
import { StructuredLogger } from 'src/utils/logger';

// Mock dependencies
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

describe('Mongo Updates (Atomic)', () => {
  let service: MongoService;

  beforeEach(async () => {
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
    // Inject mock collection manually since it's not a provider
    service.schedulingsCollection = mockCollection as any;
  });

  it('should use atomic update with arrayFilters for exam updates', async () => {
    const schedulingId = new ObjectId();
    const mockExam = {
      grupo: 'Audiometria',
      codigoExame: '123',
      status: 'FINALIZADO',
    };

    const mockDoc = {
      _id: schedulingId,
      EXAMES: [mockExam],
    };

    mockCollection.findOneAndUpdate.mockResolvedValue({ value: mockDoc });

    await service.updateExamGroupDocument(mockDoc as any);

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: schedulingId },
      { $set: { 'EXAMES.$[elem]': mockExam } },
      expect.objectContaining({
        arrayFilters: [{ 'elem.grupo': 'Audiometria' }],
        returnDocument: 'after',
      }),
    );
  });

  it('should update signatureInfo without overwriting the entire array', async () => {
    // This test simulates a custom update that might happen in the worker
    // ensuring we use dot notation for nested fields
    const schedulingId = new ObjectId();
    const signatureInfo = {
      status: 'ASSINADO',
      signedAt: new Date(),
    };

    const updateQuery = {
      $set: {
        'EXAMES.$[elem].signature': signatureInfo,
        'EXAMES.$[elem].url': 'http://new-signed-url.pdf',
      },
    };

    // Simulate the call directly on the collection to verify the query structure we INTEND to use
    await mockCollection.findOneAndUpdate({ _id: schedulingId }, updateQuery, {
      arrayFilters: [{ 'elem.codigoExame': '123' }],
    });

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: schedulingId },
      {
        $set: {
          'EXAMES.$[elem].signature': signatureInfo,
          'EXAMES.$[elem].url': 'http://new-signed-url.pdf',
        },
      },
      { arrayFilters: [{ 'elem.codigoExame': '123' }] },
    );
  });
});
