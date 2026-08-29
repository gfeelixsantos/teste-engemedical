/**
 * Testes: Cenários de retorno com documento base mockado no Mongo.
 *
 * Situação 1 - Recepção (handleUpdates / AtendimentoModal):
 *   Funcionário com exame 01/08/2026 e retorna 05/08/2026 com a MESMA
 *   SEQUENCIAFICHA. Resultado esperado: NOVO documento para 05/08 com
 *   os laudos (FINALIZADO com url) de 01/08 como ANEXOS e EXAMES só do dia.
 *
 * Situação 2 - Sincronização SOC manual (LazyModalContent):
 *   POST /soc/sincronizar-prontuario -> SocService.sincronizarProntuario.
 *   Resultado esperado: atualiza o MESMO documento (01/08) via merge
 *   inteligente, NÃO cria documento novo, NÃO move exames para ANEXOS.
 */
import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { ExamsScheduled, SchedulingDocument } from 'src/mongo/types/scheduling';
import { PedidoExame } from 'src/soc/types/PedidoExame';
import { ObjectId } from 'mongodb';
import { SocExamService } from './soc-exam.service';
import { SocService } from '../soc.service';

// ============================================================
// Helpers
// ============================================================

function createExam(partial: Partial<ExamsScheduled>): ExamsScheduled {
  return {
    codigoExame: partial.codigoExame || '1931',
    nomeExame: partial.nomeExame || 'AUDIOMETRIA',
    status: partial.status || ExamStatus.PENDENTE,
    dataExame: partial.dataExame ?? null,
    sequencialResultadoExame: partial.sequencialResultadoExame || '',
    preparacao: partial.preparacao || '',
    profissional: partial.profissional || '',
    sala: partial.sala || '',
    url: partial.url || '',
    grupo: partial.grupo !== undefined ? partial.grupo : 'Audiometria',
    formulario: partial.formulario,
    signature: partial.signature,
  };
}

function createPedido(overrides: Partial<PedidoExame> = {}): PedidoExame {
  return {
    CODIGOEMPRESA: '387497',
    NOMEEMPRESA: 'EMPRESA TESTE',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    CEIEMPRESA: '',
    SUBGRUPOEMPRESA: '',
    SEQUENCIAFICHA: 'SEQ-001',
    CODIGOFUNCIONARIO: '1686',
    NOMEFUNCIONARIO: 'PACIENTE TESTE',
    CPFFUNCIONARIO: '',
    MATRICULAFUNCIONARIO: '',
    RGFUNCIONARIO: '',
    CODIGOCENTROCUSTO: '',
    CODIGOUNIDADE: '',
    CNPJUNIDADE: '',
    CPFUNIDADE: '',
    CEIUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: '',
    DATACRIACAOPEDIDOEXAMES: '',
    CODIGOPRESTADOR: '',
    NOMEPRESTADOR: '',
    CODIGOTIPOEXAME: '5',
    DATAFICHA: '05/08/2026',
    CODIGOTUSSEXAME: '',
    CODIGOEXAMEAMB: '',
    CODIGOINTERNOEXAME: '0999',
    NOMEEXAME: 'HEMOGLOBINA GLICADA',
    DATAEXAME: '05/08/2026',
    RISCOSFUNCIONARIO: '',
    RISCOSASO: '',
    DATANASCIMENTO: '01/01/1990',
    CODIGORH: '',
    ...overrides,
  };
}

/** Documento base: ficha de 01/08/2026 com laudos FINALIZADO + url */
function createDocumento01(): SchedulingDocument {
  return {
    _id: new ObjectId('65f0a5d9f0c2f63f84f00001'),
    CODIGOPRONTUARIO: '387497-1686-5-01082026',
    SEQUENCIAFICHA: 'SEQ-001',
    CODIGOEMPRESA: '387497',
    NOMEEMPRESA: 'EMPRESA TESTE',
    CODIGO: '1686',
    NOME: 'PACIENTE TESTE',
    CODIGOFUNCIONARIO: '1686',
    NOMEFUNCIONARIO: 'PACIENTE TESTE',
    CODIGOTIPOEXAME: '5',
    TIPOEXAME: '5',
    DATAAGENDAMENTO: '01/08/2026',
    DATAAGENDAMENTO_DATE: new Date('2026-08-01T03:00:00Z'),
    ATENDIMENTOSTATUS: 'FINALIZADO',
    EXAMES: [
      createExam({
        codigoExame: '1931',
        nomeExame: 'AUDIOMETRIA',
        status: ExamStatus.FINALIZADO,
        url: 'https://resultados/audiometria.pdf',
      }),
      createExam({
        codigoExame: '2110',
        nomeExame: 'EXAME CLINICO',
        status: ExamStatus.FINALIZADO,
        url: 'https://resultados/exameclinico.pdf',
      }),
    ],
    ANEXOS: [],
  } as SchedulingDocument;
}

// ============================================================
// Situação 1: Recepção — retorno em outra data via handleUpdates
// ============================================================

describe('Situação 1 — Recepção: retorno 01/08 -> 05/08 (mesma SEQUENCIAFICHA)', () => {
  let service: SocExamService;
  let mongoService: any;
  let insertCalls: any[];
  let documento01: SchedulingDocument;

  beforeEach(() => {
    insertCalls = [];
    documento01 = createDocumento01();

    const schedulingsCollection = {
      findOne: jest.fn((filter: any) => {
        if (filter?.CODIGOPRONTUARIO) {
          // Documento DESTA data (05/08) não existe
          return Promise.resolve(null);
        }
        if (filter?.SEQUENCIAFICHA) {
          // Retorno: mesma SEQUENCIAFICHA, CODIGOPRONTUARIO diferente (01/08)
          return Promise.resolve(documento01);
        }
        if (filter?._id) {
          // Busca pós-insert
          const inserted = insertCalls[insertCalls.length - 1];
          return Promise.resolve(inserted || null);
        }
        return Promise.resolve(null);
      }),
      insertOne: jest.fn((doc: any) => {
        insertCalls.push(doc);
        return Promise.resolve({
          insertedId: new ObjectId('65f0a5d9f0c2f63f84f00002'),
          acknowledged: true,
        });
      }),
    };

    mongoService = {
      schedulingsCollection,
    };

    const socCompanyService = {
      getCompanyByCode: jest.fn().mockReturnValue({
        'CÓD. CLIENTE (INT.)': 'INT-001',
      }),
    };

    service = new SocExamService(mongoService, socCompanyService as any);

    // Evita chamada real ao SOC: exames do dia vêm do pedido direto
    jest.spyOn(service, 'handleExamScheduled').mockResolvedValue([
      createExam({
        codigoExame: '0999',
        nomeExame: 'HEMOGLOBINA GLICADA',
        status: ExamStatus.PENDENTE,
        dataExame: new Date('2026-08-05T03:00:00Z'),
      }),
    ]);
  });

  it('cria NOVO documento para 05/08 com ANEXOS dos laudos de 01/08 e EXAMES só do dia', async () => {
    const pedidos05 = [
      createPedido({ CODIGOINTERNOEXAME: '0999', DATAEXAME: '05/08/2026' }),
    ];

    const resultado = await service.handleUpdates(
      '387497',
      pedidos05,
      async () => [],
      true,
    );

    // Novamente um documento com CODIGOPRONTUARIO de 05/08 foi criado
    expect(mongoService.schedulingsCollection.insertOne).toHaveBeenCalledTimes(
      1,
    );
    const inserted = insertCalls[0];
    expect(inserted.CODIGOPRONTUARIO).toBe('387497-1686-5-05082026');

    // ANEXOS: os 2 laudos FINALIZADO com url de 01/08
    expect(inserted.ANEXOS).toHaveLength(2);
    expect(inserted.ANEXOS[0]).toMatchObject({
      Name: 'AUDIOMETRIA',
      StoragePath: 'https://resultados/audiometria.pdf',
      Origin: 'historico',
      Type: 'application/pdf',
    });
    expect(inserted.ANEXOS[1]).toMatchObject({
      Name: 'EXAME CLINICO',
      StoragePath: 'https://resultados/exameclinico.pdf',
    });

    // EXAMES: apenas o exame do dia (HEMOGLOBINA GLICADA PENDENTE)
    expect(inserted.EXAMES).toHaveLength(1);
    expect(inserted.EXAMES[0].codigoExame).toBe('0999');
    expect(inserted.EXAMES[0].status).toBe(ExamStatus.PENDENTE);

    // Não houve merge no documento antigo (CODIGOPRONTUARIO permanece o de 01/08)
    expect(documento01.CODIGOPRONTUARIO).toBe('387497-1686-5-01082026');
    expect(resultado).toBeTruthy();
  });

  it('não cria ANEXOS quando a ficha anterior não tem laudo com url', async () => {
    const documento01SemUrl = createDocumento01();
    documento01SemUrl.EXAMES = [
      createExam({
        codigoExame: '1931',
        nomeExame: 'AUDIOMETRIA',
        status: ExamStatus.FINALIZADO,
        url: '',
      }),
      createExam({
        codigoExame: '1645',
        nomeExame: 'TRIAGEM AUDITIVA',
        status: ExamStatus.PENDENTE,
        url: '',
      }),
    ];

    const schedulingsCollection = {
      findOne: jest.fn((filter: any) => {
        if (filter?.CODIGOPRONTUARIO) return Promise.resolve(null);
        if (filter?.SEQUENCIAFICHA) return Promise.resolve(documento01SemUrl);
        if (filter?._id) {
          const inserted = insertCalls[insertCalls.length - 1];
          return Promise.resolve(inserted || null);
        }
        return Promise.resolve(null);
      }),
      insertOne: jest.fn((doc: any) => {
        insertCalls.push(doc);
        return Promise.resolve({
          insertedId: new ObjectId('65f0a5d9f0c2f63f84f00003'),
          acknowledged: true,
        });
      }),
    };

    const serviceSemUrl = new SocExamService({ schedulingsCollection }, {
      getCompanyByCode: jest.fn().mockReturnValue({}),
    } as any);
    jest.spyOn(serviceSemUrl, 'handleExamScheduled').mockResolvedValue([
      createExam({
        codigoExame: '0999',
        nomeExame: 'HEMOGLOBINA GLICADA',
        status: ExamStatus.PENDENTE,
      }),
    ]);

    await serviceSemUrl.handleUpdates(
      '387497',
      [createPedido({ CODIGOINTERNOEXAME: '0999' })],
      async () => [],
      true,
    );

    const inserted = insertCalls[insertCalls.length - 1];
    expect(inserted.ANEXOS).toHaveLength(0);
    expect(inserted.EXAMES).toHaveLength(1);
  });
});

// ============================================================
// Situação 2: Sincronização SOC manual via LazyModalContent
// ============================================================

describe('Situação 2 — LazyModalContent: sincronizar-prontuario do documento 01/08', () => {
  let service: SocService;
  let mongoService: any;
  let socExamService: any;
  let socExportService: any;
  let socRiskService: any;
  let documento01: SchedulingDocument;

  beforeEach(() => {
    documento01 = createDocumento01();

    mongoService = {
      schedulingsCollection: {
        findOne: jest.fn((filter: any) => {
          if (filter?._id) return Promise.resolve(documento01);
          return Promise.resolve(null);
        }),
        findOneAndUpdate: jest.fn((_filter: any, _update: any) => {
          return Promise.resolve({ value: documento01 });
        }),
        replaceOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
    };

    socExamService = {
      handleExamScheduledSyncProntuario: jest.fn().mockResolvedValue([
        createExam({
          codigoExame: '0999',
          nomeExame: 'HEMOGLOBINA GLICADA',
          status: ExamStatus.PENDENTE,
        }),
      ]),
    };

    socExportService = {
      EdPedidoExameSyncProntuario: jest.fn().mockResolvedValue([
        createPedido({
          CODIGOINTERNOEXAME: '0999',
          DATAFICHA: '01/08/2026',
          DATAEXAME: '01/08/2026',
        }),
      ]),
    };

    socRiskService = {
      riscosFuncionario: jest.fn().mockResolvedValue([]),
    };

    service = new SocService(
      mongoService,
      {} as any, // azure
      { getCompanyByCode: jest.fn().mockReturnValue({}) } as any, // socCompany
      socExportService,
      socExamService,
      socRiskService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        setContext: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      } as any,
    );
  });

  it('atualiza o MESMO documento via merge e NÃO cria novo nem move para ANEXOS', async () => {
    const resultado = await service.sincronizarProntuario(
      String(createDocumento01()._id),
      '387497',
      '1686',
    );

    expect(resultado.success).toBe(true);

    // Mesmo documento, atualizado por findOneAndUpdate (não insertOne)
    expect(
      mongoService.schedulingsCollection.findOneAndUpdate,
    ).toHaveBeenCalledTimes(1);
    expect(mongoService.schedulingsCollection.insertOne).toBeUndefined();

    const updateFilter =
      mongoService.schedulingsCollection.findOneAndUpdate.mock.calls[0][0];
    expect(updateFilter).toEqual({ _id: createDocumento01()._id });

    // Nenhum anexo foi criado
    expect(documento01.ANEXOS).toHaveLength(0);
  });

  it('mantém o exame FINALIZADO de 01/08 (merge preserva status iniciado)', async () => {
    // Simula SOC retornando exame que JÁ EXISTE no db (AUDIOMETRIA FINALIZADO)
    socExamService.handleExamScheduledSyncProntuario.mockResolvedValue([
      createExam({
        codigoExame: '1931',
        nomeExame: 'AUDIOMETRIA',
        status: ExamStatus.PENDENTE,
      }),
      createExam({
        codigoExame: '0999',
        nomeExame: 'HEMOGLOBINA GLICADA',
        status: ExamStatus.PENDENTE,
      }),
    ]);

    // findOneAndUpdate captura o $set aplicado
    let aplicado: any = null;
    mongoService.schedulingsCollection.findOneAndUpdate.mockImplementation(
      (_f: any, update: any) => {
        aplicado = update;
        return Promise.resolve({ value: documento01 });
      },
    );

    await service.sincronizarProntuario(
      String(createDocumento01()._id),
      '387497',
      '1686',
    );

    const examesFinais: ExamsScheduled[] = aplicado.$set.EXAMES;
    const audiometria = examesFinais.find((e) => e.codigoExame === '1931');
    expect(audiometria?.status).toBe(ExamStatus.FINALIZADO);
    expect(examesFinais.find((e) => e.codigoExame === '0999')).toBeDefined();
  });
});
