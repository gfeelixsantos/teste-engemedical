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

function createBaseSchedulingDoc(): InMemoryScheduling {
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
        grupo: '',
        status: ExamStatus.PENDENTE,
        dataExame: null,
        url: '',
        formulario: {},
      },
      {
        codigoExame: '28.01.097-3',
        nomeExame: 'Glicemia',
        grupo: 'Laboratório',
        status: ExamStatus.PENDENTE,
        dataExame: null,
        url: '',
        formulario: {},
      },
      {
        codigoExame: '32050070',
        nomeExame: 'Radiografia de tórax (PA) Padrão OIT',
        grupo: 'Raio-X',
        status: ExamStatus.PENDENTE,
        dataExame: null,
        url: '',
        formulario: {},
      },
    ],
  };
}

describe('Fluxo de status de exames (Espirometria/Laboratório/Raio-X)', () => {
  let service: MongoService;
  let inMemoryDoc: InMemoryScheduling;
  let mockExamFormSnapshotsCollection: {
    insertOne: jest.Mock;
    find: jest.Mock;
  };

  const mockAzureService = {
    filaResultadosExamesProcessar: jest
      .fn()
      .mockResolvedValue({ messageId: 'm1' }),
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
    inMemoryDoc = createBaseSchedulingDoc();
    mockExamFormSnapshotsCollection = {
      insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
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
    service.examFormSnapshotsCollection =
      mockExamFormSnapshotsCollection as any;
  });

  it('deve manter Espirometria em PROCESSANDO (transição) e Lab/Raio-X em PROCESSANDO antes do upload', async () => {
    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['19.01.029-0', '28.01.097-3', '32050070'],
      formulario: { conclusao: 'apto' },
      sala: 'SALA 01',
      profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
    });

    const espirometria = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '19.01.029-0',
    );
    const glicemia = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '28.01.097-3',
    );
    const raioX = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '32050070',
    );

    expect(espirometria.grupo).toBe('Espirometria');
    expect(espirometria.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(glicemia.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(raioX.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);

    expect(
      mockAzureService.filaResultadosExamesProcessar,
    ).toHaveBeenCalledTimes(1);
    expect(mockExamFormSnapshotsCollection.insertOne).toHaveBeenCalledTimes(1);
  });

  it('deve bloquear update de exame com formulario vazio para evitar PDF em branco', async () => {
    await expect(
      service.updateExam({
        funcionarioId: inMemoryDoc._id.toHexString(),
        codigoExame: ['19.01.029-0'],
        formulario: {},
        sala: 'SALA 01',
        profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
      }),
    ).rejects.toThrow('Formulario');

    expect(
      mockAzureService.filaResultadosExamesProcessar,
    ).not.toHaveBeenCalled();
    expect(mockExamFormSnapshotsCollection.insertOne).toHaveBeenCalledTimes(1);
  });

  it('deve bloquear update quando o formulario tiver apenas identidade profissional', async () => {
    await expect(
      service.updateExam({
        funcionarioId: inMemoryDoc._id.toHexString(),
        codigoExame: ['19.01.029-0'],
        formulario: {
          medico: 'Profissional Teste',
          codigoMedico: '123',
          profissional: 'Profissional Teste',
          codigoProfissional: '123',
        },
        sala: 'SALA 01',
        profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
      }),
    ).rejects.toThrow('Formulario');

    expect(
      mockAzureService.filaResultadosExamesProcessar,
    ).not.toHaveBeenCalled();
    expect(mockExamFormSnapshotsCollection.insertOne).toHaveBeenCalledTimes(1);
  });

  it('deve normalizar dataExame BR no scheduling e no snapshot com o mesmo contrato', async () => {
    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['19.01.029-0'],
      formulario: { conclusao: 'apto' },
      sala: 'SALA 01',
      dataExame: '24/04/2026',
      profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
    });

    const exame = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '19.01.029-0',
    );
    const snapshot =
      mockExamFormSnapshotsCollection.insertOne.mock.calls[0]?.[0];

    expect(exame.dataExame).toBeInstanceOf(Date);
    expect(snapshot.dataExame).toBeInstanceOf(Date);
    expect(exame.dataExame.getTime()).toBe(snapshot.dataExame.getTime());
    expect(String(snapshot.dataExame)).not.toContain('/');
  });

  it('deve espelhar no snapshot o dataExame efetivo do exame em edicao', async () => {
    inMemoryDoc.EXAMES[0].dataExame = '2026-04-28T10:00:00.000Z';

    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['19.01.029-0'],
      formulario: { conclusao: 'apto' },
      sala: 'SALA 01',
      isEditing: true,
      profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
    });

    const exame = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '19.01.029-0',
    );
    const snapshot =
      mockExamFormSnapshotsCollection.insertOne.mock.calls[0]?.[0];

    expect(exame.dataExame).toBeInstanceOf(Date);
    expect(snapshot.dataExame).toBeInstanceOf(Date);
    expect(exame.dataExame.getTime()).toBe(snapshot.dataExame.getTime());
  });

  it('deve atualizar para FINALIZADO somente após upload/callback do resultado', async () => {
    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['19.01.029-0', '28.01.097-3', '32050070'],
      formulario: { conclusao: 'apto' },
      sala: 'SALA 01',
      profissional: { codigo: '123', nome: 'Profissional Teste' } as any,
    });

    await service.applyExamResultFromWorker({
      schedulingId: inMemoryDoc._id.toHexString(),
      examCodes: ['19.01.029-0'],
      url: 'https://blob.local/espiro.pdf',
      source: 'test-upload',
    });

    const espiroAfterUpload = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '19.01.029-0',
    );
    const glicemiaBeforeUpload = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '28.01.097-3',
    );
    const raioXBeforeUpload = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '32050070',
    );

    expect(espiroAfterUpload.status).toBe(ExamStatus.FINALIZADO);
    expect(espiroAfterUpload.url).toBe('https://blob.local/espiro.pdf');
    expect(glicemiaBeforeUpload.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(raioXBeforeUpload.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);

    await service.applyExamResultFromWorker({
      schedulingId: inMemoryDoc._id.toHexString(),
      examCodes: ['28.01.097-3', '32050070'],
      url: 'https://blob.local/complementares.pdf',
      source: 'test-upload',
    });

    for (const exame of inMemoryDoc.EXAMES) {
      expect(exame.status).toBe(ExamStatus.FINALIZADO);
    }

    expect(inMemoryDoc.ATENDIMENTOSTATUS).toBe(AtendimentoStatus.FINALIZADO);
    expect(mockAzureService.filaUploadSocged).toHaveBeenCalledTimes(1);
  });

  it('deve bloquear a ida para avaliação médica e reemitir grupos válidos sem URL', async () => {
    inMemoryDoc = {
      ...createBaseSchedulingDoc(),
      EXAMES: [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
          dataExame: '2026-04-28T10:00:00.000Z',
          url: '',
          sala: 'CONSULTORIO 1',
          profissional: 'Dra. Clinica',
          codigoProfissional: '321',
          formulario: {
            conclusao: 'Apto',
            codigoMedico: '321',
            medico: 'Dra. Clinica',
          },
        },
        {
          codigoExame: '50.01.001-8',
          nomeExame: 'Acuidade Visual',
          grupo: 'Acuidade Visual',
          status: ExamStatus.PENDENTE,
          dataExame: null,
          url: '',
          formulario: {},
        },
      ],
    };

    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['50.01.001-8'],
      formulario: { conclusao: 'sem alteracoes' },
      sala: 'SALA 02',
      profissional: { codigo: '654', nome: 'Profissional Teste' } as any,
    });

    const clinico = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === 'clinico',
    );
    const acuidade = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '50.01.001-8',
    );

    expect(clinico.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(acuidade.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(inMemoryDoc.ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.EM_ATENDIMENTO,
    );
    expect(mockAzureService.filaResultadosExamesProcessar).toHaveBeenCalledTimes(
      2,
    );
    expect(
      mockAzureService.filaResultadosExamesProcessar,
    ).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        grupo: 'Acuidade Visual',
      }),
    );
    expect(
      mockAzureService.filaResultadosExamesProcessar,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        grupo: 'Exame Clínico',
      }),
    );
  });

  it('deve bloquear a avaliação médica sem reenfileirar grupo estrito quando faltar identidade profissional', async () => {
    inMemoryDoc = {
      ...createBaseSchedulingDoc(),
      EXAMES: [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'EXAME CLINICO',
          status: ExamStatus.FINALIZADO,
          dataExame: '2026-04-28T10:00:00.000Z',
          url: '',
          sala: 'CONSULTORIO 1',
          profissional: '',
          codigoProfissional: '',
          formulario: {
            conclusao: 'Apto',
          },
        },
        {
          codigoExame: '50.01.001-8',
          nomeExame: 'Acuidade Visual',
          grupo: 'Acuidade Visual',
          status: ExamStatus.PENDENTE,
          dataExame: null,
          url: '',
          formulario: {},
        },
      ],
    };

    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['50.01.001-8'],
      formulario: { conclusao: 'sem alteracoes' },
      sala: 'SALA 02',
      profissional: null as any,
    });

    const clinico = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === 'clinico',
    );
    const acuidade = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '50.01.001-8',
    );

    expect(clinico.status).toBe(ExamStatus.FINALIZADO);
    expect(acuidade.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(inMemoryDoc.ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.EM_ATENDIMENTO,
    );
    expect(mockAzureService.filaResultadosExamesProcessar).toHaveBeenCalledTimes(
      1,
    );
    expect(
      mockAzureService.filaResultadosExamesProcessar,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        grupo: 'Acuidade Visual',
      }),
    );
  });

  it('deve reenfileirar clínico legado quando a identidade existir apenas no formulário', async () => {
    inMemoryDoc = {
      ...createBaseSchedulingDoc(),
      EXAMES: [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'EXAME CLINICO',
          status: ExamStatus.FINALIZADO,
          dataExame: '2026-04-28T10:00:00.000Z',
          url: '',
          sala: 'CONSULTORIO 1',
          profissional: '',
          codigoProfissional: '',
          formulario: {
            conclusao: 'Apto',
            codigoMedico: '321',
            medico: 'Dra. Clinica',
          },
        },
        {
          codigoExame: '50.01.001-8',
          nomeExame: 'Acuidade Visual',
          grupo: 'Acuidade Visual',
          status: ExamStatus.PENDENTE,
          dataExame: null,
          url: '',
          formulario: {},
        },
      ],
    };

    await service.updateExam({
      funcionarioId: inMemoryDoc._id.toHexString(),
      codigoExame: ['50.01.001-8'],
      formulario: { conclusao: 'sem alteracoes' },
      sala: 'SALA 02',
      profissional: null as any,
    });

    const clinico = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === 'clinico',
    );
    const acuidade = inMemoryDoc.EXAMES.find(
      (ex: any) => ex.codigoExame === '50.01.001-8',
    );

    expect(clinico.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(acuidade.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(inMemoryDoc.ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.EM_ATENDIMENTO,
    );
    expect(mockAzureService.filaResultadosExamesProcessar).toHaveBeenCalledTimes(
      2,
    );
    expect(
      mockAzureService.filaResultadosExamesProcessar,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        grupo: 'Exame Clínico',
      }),
    );
  });
});
