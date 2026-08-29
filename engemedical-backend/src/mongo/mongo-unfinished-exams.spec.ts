import { Test } from '@nestjs/testing';
import { MongoService } from './mongo.service';
import { AzureService } from 'src/azure/azure.service';
import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { SocService } from 'src/soc/soc.service';
import { StructuredLogger } from 'src/utils/logger';
import { SchedulingDocument } from './types/scheduling';
import { UnitsService } from 'src/units/units.service';
import { SignatureService } from 'src/signature/signature.service';
import { EmpresaCacheService } from './empresa-cache.service';
import { OrientacoesConfigService } from 'src/orientacoes-config/orientacoes-config.service';
import { ObjectId } from 'mongodb';
import { ExamStatus } from './enum/scheduling.enum';

function makeSchedulingWithUnfinishedExams(
  overrides?: Partial<SchedulingDocument>,
): SchedulingDocument {
  return {
    _id: new ObjectId().toHexString(),
    ATENDIMENTOSTATUS: 'FINALIZADO',
    ASOSTATUS: 'NAO_GERADO',
    SCHEDULINGCODE: 'S-1',
    CODIGOPRONTUARIO: '123',
    RISCOSASO: [],
    CODIGOEMPRESA: '101010',
    SUBGRUPOEMPRESA: '',
    CODIGOINTERNOEMPRESA: '',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    NOMEEMPRESA: 'EMPRESA TESTE',
    CODIGO: '1',
    NOME: 'JOAO SILVA',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: 'OPERADOR',
    MATRICULAFUNCIONARIO: '12345',
    CPFFUNCIONARIO: '12345678900',
    SITUACAO: 'Ativo',
    DATANASCIMENTO: '01/01/1990',
    DATAAGENDAMENTO: '22/08/2026',
    DATAAGENDAMENTO_DATE: new Date('2026-08-22T03:00:00.000Z'),
    HORARIO: '08:00',
    UNIDADEATENDIMENTO: 'UNIDADE 1',
    SEQUENCIAFICHA: 'SEQ-001',
    TIPOEXAME: '2',
    TIPOEXAMENOME: 'PERIODICO',
    OBSERVACOES: null,
    ANOTACOES: null,
    PARECERMEDICO: 'APTO',
    RECOMENDACAOMEDICA: null,
    ALTURA_PARECER: null,
    CONFINADO_PARECER: null,
    MEDICO: null,
    ANEXOS: [],
    TERM: true,
    CLIENT: null,
    CREATED: '22/08/2026',
    EXAMES: [
      {
        codigoExame: 'EXM1',
        nomeExame: 'Exame Clinico',
        status: ExamStatus.FINALIZADO,
        grupo: 'CLINICO',
      },
      {
        codigoExame: 'EXM2',
        nomeExame: 'Audiometria',
        status: ExamStatus.NAO_REALIZADO,
        grupo: 'AUDIOMETRIA',
      },
    ],
    TICKET: null,
    ...overrides,
  };
}

describe('MongoService - Unfinished Exams Report', () => {
  let mongoService: MongoService;
  let azureService: AzureService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MongoService,
        {
          provide: AzureService,
          useValue: {
            filaEnvioDeEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PARECER_MEDICO_EMAIL_TO') {
                return 'test@example.com';
              }
              if (key === 'PARECER_MEDICO_EMAIL_CC') {
                return 'cc@example.com';
              }
              return null;
            }),
          },
        },
        {
          provide: WebsocketGateway,
          useValue: {
            server: null,
          },
        },
        {
          provide: SocService,
          useValue: {},
        },
        {
          provide: StructuredLogger,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: UnitsService,
          useValue: {},
        },
        {
          provide: SignatureService,
          useValue: {},
        },
        {
          provide: EmpresaCacheService,
          useValue: {},
        },
        {
          provide: OrientacoesConfigService,
          useValue: {},
        },
      ],
    }).compile();

    mongoService = module.get<MongoService>(MongoService);
    azureService = module.get<AzureService>(AzureService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock MongoDB collection
    mongoService['schedulingsCollection'] = {
      find: jest.fn(),
      toArray: jest.fn(),
    } as any;
    mongoService['logger'] = module.get<StructuredLogger>(StructuredLogger);
  });

  describe('findSchedulingsWithUnfinishedExams', () => {
    it('deve buscar atendimentos com exames NAO_REALIZADO na data especificada', async () => {
      const targetDate = new Date('2026-08-22T03:00:00.000Z');
      const mockSchedulings = [
        makeSchedulingWithUnfinishedExams(),
        makeSchedulingWithUnfinishedExams({
          _id: new ObjectId().toHexString(),
          NOME: 'MARIA SOUZA',
        }),
      ];

      mongoService['schedulingsCollection'].find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockSchedulings),
      });

      const result = await mongoService.findSchedulingsWithUnfinishedExams(targetDate);

      expect(mongoService['schedulingsCollection'].find).toHaveBeenCalledWith({
        DATAAGENDAMENTO: '22/08/2026',
        'EXAMES.status': ExamStatus.NAO_REALIZADO,
      });
      expect(result).toHaveLength(2);
      expect(result[0].NOME).toBe('JOAO SILVA');
      expect(result[1].NOME).toBe('MARIA SOUZA');
    });

    it('deve retornar array vazio quando não houver atendimentos', async () => {
      const targetDate = new Date('2026-08-22T03:00:00.000Z');

      mongoService['schedulingsCollection'].find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await mongoService.findSchedulingsWithUnfinishedExams(targetDate);

      expect(result).toHaveLength(0);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      const targetDate = new Date('2026-08-22T03:00:00.000Z');

      mongoService['schedulingsCollection'].find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockRejectedValue(new Error('MongoDB error')),
      });

      const result = await mongoService.findSchedulingsWithUnfinishedExams(targetDate);

      expect(result).toHaveLength(0);
      expect(mongoService['logger'].error).toHaveBeenCalled();
    });
  });

  describe('sendUnfinishedExamsReport', () => {
    it('deve enfileirar email com dados dos atendimentos', async () => {
      const schedulings = [
        makeSchedulingWithUnfinishedExams(),
        makeSchedulingWithUnfinishedExams({
          _id: new ObjectId().toHexString(),
          NOME: 'MARIA SOUZA',
          EXAMES: [
            {
              codigoExame: 'EXM1',
              nomeExame: 'Exame Clinico',
              status: ExamStatus.FINALIZADO,
              grupo: 'CLINICO',
            },
            {
              codigoExame: 'EXM3',
              nomeExame: 'Espirometria',
              status: ExamStatus.NAO_REALIZADO,
              grupo: 'ESPIROMETRIA',
            },
          ],
        }),
      ];

      await mongoService.sendUnfinishedExamsReport(schedulings);

      expect(azureService.filaEnvioDeEmail).toHaveBeenCalledWith({
        attachment: [],
        cc: 'cc@example.com',
        subject: expect.stringContaining('RELATÓRIO: Exames Não Realizados'),
        template: '',
        templatename: 'EXAMES_NAO_REALIZADOS',
        to: 'test@example.com',
        data: {
          unfinishedExamsInfo: {
            reportDate: expect.any(String),
            totalAttendances: 2,
            attendances: expect.arrayContaining([
              expect.objectContaining({
                nomeFuncionario: 'JOAO SILVA',
                nomeEmpresa: 'EMPRESA TESTE',
                unfinishedExams: expect.arrayContaining([
                  expect.objectContaining({
                    nomeExame: 'Audiometria',
                    status: ExamStatus.NAO_REALIZADO,
                  }),
                ]),
              }),
              expect.objectContaining({
                nomeFuncionario: 'MARIA SOUZA',
                unfinishedExams: expect.arrayContaining([
                  expect.objectContaining({
                    nomeExame: 'Espirometria',
                    status: ExamStatus.NAO_REALIZADO,
                  }),
                ]),
              }),
            ]),
          },
        },
      });
    });

    it('não deve enfileirar email quando array está vazio', async () => {
      await mongoService.sendUnfinishedExamsReport([]);

      expect(azureService.filaEnvioDeEmail).not.toHaveBeenCalled();
      expect(mongoService['logger'].log).toHaveBeenCalledWith(
        '[UNFINISHED_EXAMS] Nenhum atendimento para reportar.',
      );
    });

    it('deve lançar erro em caso de falha ao enfileirar', async () => {
      const schedulings = [makeSchedulingWithUnfinishedExams()];

      (azureService.filaEnvioDeEmail as jest.Mock).mockRejectedValue(
        new Error('Azure queue error'),
      );

      await expect(
        mongoService.sendUnfinishedExamsReport(schedulings),
      ).rejects.toThrow('Azure queue error');

      expect(mongoService['logger'].error).toHaveBeenCalled();
    });

    it('deve filtrar apenas exames com status NAO_REALIZADO', async () => {
      // Reset mock para comportamento padrão (resolvido)
      (azureService.filaEnvioDeEmail as jest.Mock).mockResolvedValue(undefined);

      const schedulings = [
        makeSchedulingWithUnfinishedExams({
          EXAMES: [
            {
              codigoExame: 'EXM1',
              nomeExame: 'Exame Clinico',
              status: ExamStatus.FINALIZADO,
              grupo: 'CLINICO',
            },
            {
              codigoExame: 'EXM2',
              nomeExame: 'Audiometria',
              status: ExamStatus.NAO_REALIZADO,
              grupo: 'AUDIOMETRIA',
            },
            {
              codigoExame: 'EXM3',
              nomeExame: 'Espirometria',
              status: ExamStatus.PENDENTE,
              grupo: 'ESPIROMETRIA',
            },
          ],
        }),
      ];

      await mongoService.sendUnfinishedExamsReport(schedulings);

      const callArgs = (azureService.filaEnvioDeEmail as jest.Mock).mock.calls[0][0];
      const unfinishedExams = callArgs.data.unfinishedExamsInfo.attendances[0].unfinishedExams;

      expect(unfinishedExams).toHaveLength(1);
      expect(unfinishedExams[0].nomeExame).toBe('Audiometria');
      expect(unfinishedExams[0].status).toBe(ExamStatus.NAO_REALIZADO);
    });
  });
});
