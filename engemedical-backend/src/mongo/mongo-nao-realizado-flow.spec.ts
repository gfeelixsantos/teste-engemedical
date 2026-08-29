import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';

import { MongoService } from './mongo.service';
import { AzureService } from 'src/azure/azure.service';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { AtendimentoStatus, ExamStatus } from './enum/scheduling.enum';
import { SignatureService } from 'src/signature/signature.service';
import { SocService } from 'src/soc/soc.service';
import { StructuredLogger } from 'src/utils/logger';
import { EmpresaCacheService } from './empresa-cache.service';
import { UnitsService } from '../units/units.service';
import { OrientacoesConfigService } from '../orientacoes-config/orientacoes-config.service';

type InMemoryScheduling = any;

function createTestSchedulingDoc(): InMemoryScheduling {
  return {
    _id: new ObjectId(),
    ATENDIMENTOSTATUS: AtendimentoStatus.EM_ATENDIMENTO,
    ASOSTATUS: 'NAO_GERADO',
    CODIGOPRONTUARIO: '100-200-1-20032026',
    CODIGOEMPRESA: '999999',
    CODIGOINTERNOEMPRESA: 'EMPRESA_TESTE',
    NOMESETOR: 'SETOREXAME',
    NOMECARGO: 'CARGOEXAME',
    NOMEFUNCIONARIO: 'PACIENTE TESTE',
    EXAMES: [
      {
        codigoExame: '19.01.029-0',
        nomeExame: 'Espirometria',
        grupo: 'Espirometria',
        status: ExamStatus.PENDENTE,
        dataExame: null,
        url: '',
        formulario: {},
        sequencialResultadoExame: 101,
      },
      {
        codigoExame: '28.01.097-3',
        nomeExame: 'Glicemia',
        grupo: 'Laboratório',
        status: ExamStatus.PENDENTE,
        dataExame: null,
        url: '',
        formulario: {},
        sequencialResultadoExame: 102,
      },
    ],
  };
}

describe('Fluxo de status de exames NAO_REALIZADO', () => {
  let service: MongoService;
  let inMemoryDoc: InMemoryScheduling;

  const mockAzureService = {
    filaResultadosExamesProcessar: jest.fn().mockResolvedValue({ messageId: 'm1' }),
    filaUploadSocged: jest.fn().mockResolvedValue(undefined),
    filaResultadoExameSoc: jest.fn().mockResolvedValue(undefined),
  };
  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const applyUpdate = (doc: any, set: any) => {
    for (const key in set) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let curr = doc;
        for (let i = 0; i < parts.length - 1; i++) {
          curr = curr[parts[i]];
        }
        curr[parts[parts.length - 1]] = set[key];
      } else {
        doc[key] = set[key];
      }
    }
  };

  const mockCollection = {
    findOne: jest.fn(async () => inMemoryDoc),
    findOneAndUpdate: jest.fn(async (_filter: any, update: any) => {
      if (update?.$set) {
        applyUpdate(inMemoryDoc, update.$set);
      }
      return { value: inMemoryDoc };
    }),
    updateOne: jest.fn(async (_filter: any, update: any) => {
      if (update?.$set) {
        applyUpdate(inMemoryDoc, update.$set);
      }
      return { acknowledged: true, modifiedCount: 1 };
    }),
  };

  beforeEach(async () => {
    inMemoryDoc = createTestSchedulingDoc();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock') },
        },
        { provide: AzureService, useValue: mockAzureService },
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
  });

  it('deve marcar exame como NAO_REALIZADO e manter ATENDIMENTOSTATUS como ATENDIMENTO se houver outro pendente', async () => {
    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['19.01.029-0'],
      formulario: {
        status: 'concluded',
        examesRealizados: [
          { sequencialResultadoExame: 101, realizado: false }
        ]
      },
      sala: 'SALA 01',
      profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
    });

    const espiro = inMemoryDoc.EXAMES.find((ex: any) => ex.codigoExame === '19.01.029-0');
    expect(espiro.status).toBe(ExamStatus.NAO_REALIZADO);
    
    // ATENDIMENTOSTATUS deve continuar como ATENDIMENTO (EM_ATENDIMENTO) porque o Glicemia está pendente
    expect(inMemoryDoc.ATENDIMENTOSTATUS).toBe(AtendimentoStatus.EM_ATENDIMENTO);

    // Deve enfileirar no SOC para exames não realizados
    expect(mockAzureService.filaResultadoExameSoc).toHaveBeenCalledWith(
      expect.objectContaining({
        schedulingId: inMemoryDoc._id.toHexString(),
        grupo: 'Espirometria',
        codigoExame: '19.01.029-0',
        naoRealizado: true,
      }),
    );

    // Não deve enfileirar no Azure para processar PDF/ASO
    expect(mockAzureService.filaResultadosExamesProcessar).not.toHaveBeenCalled();
  });

  it('deve definir ATENDIMENTOSTATUS como PENDENTE se todos os exames estiverem concluidos/nao realizados e houver pelo menos um nao realizado', async () => {
    // 1. Marca Espirometria como NAO_REALIZADO
    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['19.01.029-0'],
      formulario: {
        status: 'concluded',
        examesRealizados: [
          { sequencialResultadoExame: 101, realizado: false }
        ]
      },
      sala: 'SALA 01',
      profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
    });

    // 2. Conclui o Glicemia como realizado (vai para AGUARDANDO_RESULTADO)
    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['28.01.097-3'],
      formulario: {
        status: 'concluded',
        examesRealizados: [
          { sequencialResultadoExame: 102, realizado: true }
        ]
      },
      sala: 'SALA 01',
      profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
    });

    // 3. Callback finalizando o Glicemia
    await service.applyExamResultFromWorker({
      schedulingId: inMemoryDoc._id.toHexString(),
      examCodes: ['28.01.097-3'],
      url: 'https://blob.local/glicemia.pdf',
      source: 'test-upload',
    });

    const espiro = inMemoryDoc.EXAMES.find((ex: any) => ex.codigoExame === '19.01.029-0');
    const glicemia = inMemoryDoc.EXAMES.find((ex: any) => ex.codigoExame === '28.01.097-3');

    expect(espiro.status).toBe(ExamStatus.NAO_REALIZADO);
    expect(glicemia.status).toBe(ExamStatus.FINALIZADO);

    // Como não há mais pendentes e temos pelo menos um não realizado, ATENDIMENTOSTATUS vira PENDENTE
    expect(inMemoryDoc.ATENDIMENTOSTATUS).toBe(AtendimentoStatus.PENDENTE);
  });
});
