import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { MongoService } from './mongo.service';
import { AzureService } from 'src/azure/azure.service';
import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { SignatureService } from 'src/signature/signature.service';
import { SocService } from 'src/soc/soc.service';
import { StructuredLogger } from 'src/utils/logger';
import { AtendimentoStatus, ExamStatus } from './enum/scheduling.enum';
import { ExamsScheduled, SchedulingDocument } from './types/scheduling';
import { IUserInfo } from 'src/user/interfaces/user.interface';
import { FuncionarioEntity } from './model/FuncionarioEntity';
import { MedicalOpinionRules } from 'src/core/MedicalOptionsRules';
import { OrientacoesConfigService } from 'src/orientacoes-config/orientacoes-config.service';
import { EmpresaCacheService } from './empresa-cache.service';
import { UnitsService } from 'src/units/units.service';

function createBaseScheduling(exames: ExamsScheduled[]): SchedulingDocument {
  return {
    _id: new ObjectId().toHexString(),
    ATENDIMENTOSTATUS: AtendimentoStatus.AVALIACAO_MEDICA,
    ASOSTATUS: '',
    SCHEDULINGCODE: '',
    CODIGOPRONTUARIO: '123',
    RISCOSASO: null,
    CODIGOEMPRESA: '000000',
    SUBGRUPOEMPRESA: '',
    CODIGOINTERNOEMPRESA: '',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    NOMEEMPRESA: 'EMPRESA TESTE',
    CODIGO: '1',
    NOME: 'FUNCIONARIO TESTE',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: '',
    MATRICULAFUNCIONARIO: '',
    CPFFUNCIONARIO: '',
    SITUACAO: '',
    DATANASCIMENTO: '01/01/1990',
    DATAAGENDAMENTO: '01/01/2025',
    DATAAGENDAMENTO_DATE: new Date(),
    HORARIO: '00:00',
    UNIDADEATENDIMENTO: '',
    SEQUENCIAFICHA: '1',
    TIPOEXAME: '1',
    TIPOEXAMENOME: 'ADMISSIONAL',
    OBSERVACOES: null,
    ANOTACOES: null,
    PARECERMEDICO: null,
    RECOMENDACAOMEDICA: null,
    MEDICO: null,
    ANEXOS: [],
    TERM: false,
    CLIENT: null,
    CREATED: new Date().toISOString(),
    EXAMES: exames,
    TICKET: null,
    TELEFONE: '',
  } as SchedulingDocument;
}

describe('MongoService - finishScheduling validation', () => {
  let service: MongoService;
  let mockSchedulingsCollection: any;
  let mockAzureService: any;
  let mockLogger: any;

  const mockUser: IUserInfo = {
    nome: 'Dr. Test',
    cpf: '12345678900',
    perfil: 'MEDICO',
    codigo: '123',
    conselho: 'CRM',
    ufconselho: 'SP',
  };

  const mockOptions = {
    opinionType: 'APTO' as any,
  };

  beforeEach(async () => {
    mockSchedulingsCollection = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    };

    mockAzureService = {
      filaAsoProcessing: jest.fn().mockResolvedValue(undefined),
      filaAsoEnriquecimento: jest.fn().mockResolvedValue(undefined),
      filaResultadosExamesProcessar: jest.fn().mockResolvedValue(undefined),
      filaEnvioDeEmail: jest.fn().mockResolvedValue(undefined),
      filaUploadSocged: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock') },
        },
        { provide: AzureService, useValue: mockAzureService },
        {
          provide: WebsocketGateway,
          useValue: {
            server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
          },
        },
        {
          provide: SignatureService,
          useValue: {
            hasValidSignatureSession: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: SocService,
          useValue: {
            generateDigitalAso: jest.fn(),
          },
        },
        {
          provide: OrientacoesConfigService,
          useValue: {
            findByIdSafe: jest.fn().mockResolvedValue(null),
          },
        },
        { provide: EmpresaCacheService, useValue: {} },
        { provide: UnitsService, useValue: {} },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<MongoService>(MongoService);
    (service as any).schedulingsCollection = mockSchedulingsCollection;
  });

  describe('Validação de exames PENDENTE', () => {
    it('deve lançar erro ao tentar finalizar com exames PENDENTE', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
        },
        {
          codigoExame: 'lab',
          nomeExame: 'Laboratório',
          grupo: 'Laboratório',
          status: ExamStatus.PENDENTE,
        },
      ];
      exames[0].nomeExame = 'Exame ClÃ­nico';
      exames[0].grupo = 'Exame ClÃ­nico';

      const doc = createBaseScheduling(exames);
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);

      await expect(
        service.finishScheduling(doc._id, mockUser, mockOptions, {}),
      ).rejects.toThrow(HttpException);

      await expect(
        service.finishScheduling(doc._id, mockUser, mockOptions, {}),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        message: expect.stringContaining('PENDENTE'),
      });
    });

    it('deve permitir finalizar quando todos os exames estão FINALIZADOS', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
        },
        {
          codigoExame: 'lab',
          nomeExame: 'Laboratório',
          grupo: 'Laboratório',
          status: ExamStatus.FINALIZADO,
        },
      ];
      exames[0].nomeExame = 'Exame Cl\u00ednico';
      exames[0].grupo = 'Exame Cl\u00ednico';

      const doc = createBaseScheduling(exames);
      doc.ATENDIMENTOSTATUS = AtendimentoStatus.AVALIACAO_MEDICA;
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      await expect(
        service.finishScheduling(doc._id, mockUser, mockOptions, {}),
      ).resolves.not.toThrow();
    });

    it('deve permitir finalizar quando exames estão AGUARDANDO_RESULTADO', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
        },
        {
          codigoExame: 'raiox',
          nomeExame: 'Raio-X',
          grupo: 'Raio-X',
          status: ExamStatus.AGUARDANDO_RESULTADO,
        },
      ];
      exames[0].nomeExame = 'Exame Cl\u00ednico';
      exames[0].grupo = 'Exame Cl\u00ednico';

      const doc = createBaseScheduling(exames);
      doc.ATENDIMENTOSTATUS = AtendimentoStatus.AVALIACAO_MEDICA;
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      await expect(
        service.finishScheduling(doc._id, mockUser, mockOptions, {}),
      ).resolves.not.toThrow();
    });
  });

  describe('Validação de status do atendimento', () => {
    it('deve lançar erro ao tentar finalizar com status diferente de AVALIACAO_MEDICA', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
        },
      ];
      exames[0].nomeExame = 'Exame Cl\u00ednico';
      exames[0].grupo = 'Exame Cl\u00ednico';

      const doc = createBaseScheduling(exames);
      doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);

      await expect(
        service.finishScheduling(doc._id, mockUser, mockOptions, {}),
      ).rejects.toThrow(HttpException);

      await expect(
        service.finishScheduling(doc._id, mockUser, mockOptions, {}),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        message: expect.stringContaining('aguardando'),
      });
    });

    it('deve permitir finalizar com status AVALIACAO_MEDICA', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
        },
      ];
      exames[0].nomeExame = 'Exame Cl\u00ednico';
      exames[0].grupo = 'Exame Cl\u00ednico';

      const doc = createBaseScheduling(exames);
      doc.ATENDIMENTOSTATUS = AtendimentoStatus.AVALIACAO_MEDICA;
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      await expect(
        service.finishScheduling(doc._id, mockUser, mockOptions, {}),
      ).resolves.not.toThrow();
    });
  });

  describe('Casos especiais', () => {
    it('deve lançar erro quando não encontra agendamento', async () => {
      const missingId = new ObjectId().toHexString();
      mockSchedulingsCollection.findOne.mockResolvedValue(null);

      await expect(
        service.finishScheduling(missingId, mockUser, mockOptions, {}),
      ).rejects.toThrow();
    });

    it('deve lançar erro quando usuário não informado', async () => {
      const doc = createBaseScheduling([]);
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);

      await expect(
        service.finishScheduling(doc._id, null as any, mockOptions, {}),
      ).rejects.toThrow();
    });

    it('não deve enfileirar ASO para fluxo complementar sem Exame Clínico', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'audio',
          nomeExame: 'Audiometria',
          grupo: 'Audiometria',
          status: ExamStatus.FINALIZADO,
        },
      ];

      const doc = createBaseScheduling(exames);
      doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
      doc.PARECERMEDICO = 'APTO';
      doc.ASOINFO = {
        status: 'PENDENTE',
        updatedAt: new Date(),
        signature: {
          documentType: 'ASO',
          documentId: 'ASO',
          documentName: 'ASO',
          requiresSignature: true,
          status: 'PENDENTE',
          retry: {
            pending: false,
            count: 0,
          },
        },
      } as any;

      await (service as any).enqueuePendingAsoProcessingForOperationalRelease(
        new FuncionarioEntity(doc),
      );

      expect(mockAzureService.filaAsoProcessing).not.toHaveBeenCalled();
    });
  });

  it('posterga o email de parecer para o callback do ASO e persiste o avaliador', async () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: 'clinico',
        nomeExame: 'Exame Cl\u00ednico',
        grupo: 'Exame Cl\u00ednico',
        status: ExamStatus.FINALIZADO,
        codigoProfissional: '1698',
        profissional: 'Beatriz Clinica',
        formulario: {
          codigoMedico: '1698',
          medico: 'Beatriz Clinica',
        } as any,
      },
    ];

    const doc = createBaseScheduling(exames);
    mockSchedulingsCollection.findOne.mockResolvedValue(doc);
    mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
      value: doc,
    });

    const authUser = {
      ...mockUser,
      codigo: '2001',
      nome: 'Dra. Avaliadora',
    };

    await service.finishScheduling(
      doc._id,
      mockUser,
      {
        opinionType: 'APTO_COM_ORIENTACAO' as any,
        details: 'Liberado com orientacoes ergonomicas.',
      },
      {},
      authUser,
    );

    // Não envia o email sem link no finish — aguarda o ASO gerado
    expect(mockAzureService.filaEnvioDeEmail).not.toHaveBeenCalledWith(
      expect.objectContaining({
        templatename: 'PARECER_MEDICO',
      }),
    );
    // Persiste a pendência e o avaliador para o callback enviar com o link
    expect(mockSchedulingsCollection.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          'ASOINFO.parecerEquipePending': true,
          'ASOINFO.parecerEquipeIssuer': expect.objectContaining({
            codigo: '2001',
            nome: 'Dra. Avaliadora',
          }),
        }),
      }),
    );
  });

  it('envia o email de parecer no finish quando nao ha ASO a gerar (sem exame clinico)', async () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: 'audio',
        nomeExame: 'Audiometria',
        grupo: 'Audiometria',
        status: ExamStatus.FINALIZADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    mockSchedulingsCollection.findOne.mockResolvedValue(doc);
    mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
      value: doc,
    });

    const authUser = {
      ...mockUser,
      codigo: '2001',
      nome: 'Dra. Avaliadora',
    };

    await service.finishScheduling(
      doc._id,
      mockUser,
      {
        opinionType: 'APTO_COM_ORIENTACAO' as any,
        details: 'Liberado com orientacoes ergonomicas.',
      },
      {},
      authUser,
    );

    expect(mockAzureService.filaEnvioDeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templatename: 'PARECER_MEDICO',
        data: expect.objectContaining({
          issuedBy: expect.objectContaining({
            codigo: '2001',
            nome: 'Dra. Avaliadora',
          }),
        }),
      }),
    );
    expect(mockSchedulingsCollection.updateOne).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          'ASOINFO.parecerEquipePending': true,
        }),
      }),
    );
  });

  it('deve bloquear parecer APTO com texto medico e exigir APTO_COM_ORIENTACAO', async () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: 'clinico',
        nomeExame: 'Exame ClÃ­nico',
        grupo: 'Exame ClÃ­nico',
        status: ExamStatus.FINALIZADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    mockSchedulingsCollection.findOne.mockResolvedValue(doc);

    await expect(
      service.finishScheduling(
        doc._id,
        mockUser,
        {
          opinionType: 'APTO' as any,
          details: 'Paciente orientado a retornar em 30 dias.',
        } as any,
        {},
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message: expect.stringContaining('APTO_COM_ORIENTACAO'),
    });

    expect(mockAzureService.filaAsoProcessing).not.toHaveBeenCalled();
  });

  describe('Resolucao de texto_email do catalogo (orientacaoId)', () => {
    const clinicoFinalizado = (): ExamsScheduled[] => [
      {
        codigoExame: 'clinico',
        nomeExame: 'Exame ClÃ­nico',
        grupo: 'Exame ClÃ­nico',
        status: ExamStatus.FINALIZADO,
        codigoProfissional: '1698',
        profissional: 'Beatriz Clinica',
      },
    ];

    it('congela o texto profissional do catalogo em observacoesParecer', async () => {
      const doc = createBaseScheduling(clinicoFinalizado());
      doc.EXAMES[0].nomeExame = 'Exame Cl\u00ednico';
      doc.EXAMES[0].grupo = 'Exame Cl\u00ednico';
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      (service as any).orientacoesConfigService.findByIdSafe = jest
        .fn()
        .mockResolvedValue({
          id: 'ori-1',
          texto_tela: 'Orientar acompanhamento com oftalmologista',
          texto_email:
            'Recomendamos acompanhamento periódico com oftalmologista para preservação da saúde visual do colaborador.',
          libera_cliente: true,
          ativo: true,
        });

      await service.finishScheduling(
        doc._id,
        mockUser,
        {
          opinionType: 'APTO_COM_ORIENTACAO' as any,
          details: 'Orientar acompanhamento com oftalmologista',
          isProgrammed: true,
          orientacaoId: 'ori-1',
        } as any,
        {},
      );

      expect(mockAzureService.filaAsoProcessing).toHaveBeenCalledWith(
        expect.objectContaining({
          observacoesParecer: expect.arrayContaining([
            'Recomendamos acompanhamento periódico com oftalmologista para preservação da saúde visual do colaborador.',
          ]),
        }),
      );
    });

    it('usa details como fallback quando o catalogo nao resolve a orientacao', async () => {
      const doc = createBaseScheduling(clinicoFinalizado());
      doc.EXAMES[0].nomeExame = 'Exame Cl\u00ednico';
      doc.EXAMES[0].grupo = 'Exame Cl\u00ednico';
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      (service as any).orientacoesConfigService.findByIdSafe = jest
        .fn()
        .mockResolvedValue(null);

      await service.finishScheduling(
        doc._id,
        mockUser,
        {
          opinionType: 'APTO_COM_ORIENTACAO' as any,
          details: 'Orientar acompanhamento com cardiologista',
          isProgrammed: true,
          orientacaoId: 'ori-inexistente',
        } as any,
        {},
      );

      expect(mockAzureService.filaAsoProcessing).toHaveBeenCalledWith(
        expect.objectContaining({
          observacoesParecer: expect.arrayContaining([
            'Orientar acompanhamento com cardiologista',
          ]),
        }),
      );
    });
  });

  describe('Resolucao de profissional do ASO', () => {
    it('deve enfileirar o snapshot completo do profissional no aso-processing', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame ClÃ­nico',
          grupo: 'Exame ClÃ­nico',
          status: ExamStatus.FINALIZADO,
          codigoProfissional: '1698',
          profissional: 'Amanda de Souza Zanetti',
          formulario: {
            codigoMedico: '1698',
            medico: 'Amanda de Souza Zanetti',
          } as any,
        },
      ];

      const doc = createBaseScheduling(exames);
      doc.EXAMES[0].nomeExame = 'Exame Cl\u00ednico';
      doc.EXAMES[0].grupo = 'Exame Cl\u00ednico';
      doc.NOME = 'THIAGO HENRIQUE MASSOLINI DA COSTA';
      doc.NOMEEMPRESA = 'INOPLAST FIBRAS INDUSTRIAIS LTDA';
      doc.CODIGOEMPRESA = '58023342000107';
      doc.DATAAGENDAMENTO = '29/04/2026';
      doc.TIPOEXAME = '3';
      doc.TIPOEXAMENOME = 'RETORNO AO TRABALHO';
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      const bodyProfessional = {
        ...mockUser,
        codigo: '1698',
        nome: 'Amanda de Souza Zanetti',
        cpf: '389.583.238-33',
        conselho: '226402',
        ufconselho: 'SP',
      };

      expect(MedicalOpinionRules.shouldCreateAso(mockOptions as any, doc)).toBe(
        true,
      );

      await service.finishScheduling(
        doc._id,
        bodyProfessional,
        mockOptions,
        {},
      );

      expect(mockAzureService.filaAsoProcessing).toHaveBeenCalledWith(
        expect.objectContaining({
          commandId: expect.any(String),
          nomeFuncionario: 'THIAGO HENRIQUE MASSOLINI DA COSTA',
          nomeEmpresa: 'INOPLAST FIBRAS INDUSTRIAIS LTDA',
          tipoExameNome: 'RETORNO AO TRABALHO',
          medico: '1698',
          profissional: expect.objectContaining({
            codigo: '1698',
            nome: 'Amanda de Souza Zanetti',
            cpf: '389.583.238-33',
            conselho: '226402',
            ufconselho: 'SP',
          }),
        }),
      );
    });

    it('deve priorizar o medico do exame clinico sobre o profissional do payload quando nao houver authUser', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
          codigoProfissional: '1698',
          profissional: 'Beatriz Clinica',
          formulario: {
            codigoMedico: '1698',
            medico: 'Beatriz Clinica',
          } as any,
        },
        {
          codigoExame: '50.01.001-8',
          nomeExame: 'Acuidade Visual',
          grupo: 'Acuidade Visual',
          status: ExamStatus.FINALIZADO,
          codigoProfissional: '1727',
          profissional: 'Ana Acuidade',
        },
      ];

      const doc = createBaseScheduling(exames);
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      const bodyProfessional = {
        ...mockUser,
        codigo: '1727',
        nome: 'Ana Acuidade',
      };

      await service.finishScheduling(
        doc._id,
        bodyProfessional,
        mockOptions,
        {},
      );

      expect(mockAzureService.filaAsoProcessing).toHaveBeenCalledWith(
        expect.objectContaining({
          commandId: expect.any(String),
          medico: '1698',
        }),
      );
    });

    it('deve priorizar o medico do exame clinico mesmo quando authUser estiver diferente', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
          codigoProfissional: '1698',
          profissional: 'Beatriz Clinica',
          formulario: {
            codigoMedico: '1698',
            medico: 'Beatriz Clinica',
          } as any,
        },
      ];

      const doc = createBaseScheduling(exames);
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      const authUser = {
        ...mockUser,
        codigo: '2001',
        nome: 'Dr. Prontuario',
      };

      await service.finishScheduling(
        doc._id,
        mockUser,
        mockOptions,
        {},
        authUser,
      );

      expect(mockAzureService.filaAsoProcessing).toHaveBeenCalledWith(
        expect.objectContaining({
          commandId: expect.any(String),
          medico: '1698',
        }),
      );
    });

    it('deve bloquear enqueue duplicado quando outra requisicao finalizar primeiro', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
          codigoProfissional: '1698',
          profissional: 'Beatriz Clinica',
        },
      ];

      const doc = createBaseScheduling(exames);
      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.finishScheduling(doc._id, mockUser, mockOptions, {}),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
      });

      expect(mockAzureService.filaAsoProcessing).not.toHaveBeenCalled();
    });
  });



  describe('Geração de ASO Digital (Worker)', () => {
    it('deve chamar generateDigitalAso quando a origem for BIOMETRIA, persistir ASO pendente e enfileirar assinatura', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
        },
      ];

      const doc = createBaseScheduling(exames);
      doc.AUTENTICACAOATENDIMENTO = { metodo: 'BIOMETRIA' } as any;

      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      const mockWorkerResult = {
        url: 'https://blob.core.windows.net/aso/123.pdf',
        documentHash: 'abc123hash',
      };
      (service as any).socService.generateDigitalAso.mockResolvedValue(
        mockWorkerResult,
      );

      await service.finishScheduling(doc._id, mockUser, mockOptions, {});

      expect((service as any).socService.generateDigitalAso).toHaveBeenCalled();
      expect(mockSchedulingsCollection.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            ASOSTATUS: 'GERADO',
            'ASOINFO.status': 'PENDENTE',
            'ASOINFO.url': mockWorkerResult.url,
            'ASOINFO.signature.status': 'PENDENTE',
          }),
        }),
      );
      expect(mockAzureService.filaAsoEnriquecimento).toHaveBeenCalledWith(
        expect.objectContaining({
          schedulingId: doc._id,
          url: mockWorkerResult.url,
          medico: mockUser.nome,
        }),
      );
    });

    it('NÃO deve chamar generateDigitalAso quando a origem for SOC', async () => {
      const exames: ExamsScheduled[] = [
        {
          codigoExame: 'clinico',
          nomeExame: 'Exame Clínico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
        },
      ];

      const doc = createBaseScheduling(exames);
      doc.AUTENTICACAOATENDIMENTO = { metodo: 'SOC' } as any;

      mockSchedulingsCollection.findOne.mockResolvedValue(doc);
      mockSchedulingsCollection.findOneAndUpdate.mockResolvedValue({
        value: doc,
      });

      await service.finishScheduling(doc._id, mockUser, mockOptions, {});

      expect(
        (service as any).socService.generateDigitalAso,
      ).not.toHaveBeenCalled();
      expect(mockAzureService.filaAsoEnriquecimento).not.toHaveBeenCalled();
    });
  });
});
