import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';

import { AzureService } from 'src/azure/azure.service';
import { MongoService } from 'src/mongo/mongo.service';

import { InternalController } from './internal.controller';

const asAsyncCursor = (items: any[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const item of items) {
      yield item;
    }
  },
});

describe('InternalController - ASO requeue', () => {
  let controller: InternalController;

  const token = 'test-internal-token';

  const mockMongoService = {
    schedulingsCollection: {
      find: jest.fn(),
    },
  };

  const mockAzureService = {
    filaAsoProcessing: jest.fn(),
    filaAsoEnriquecimento: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.INTERNAL_WORKER_TOKEN = token;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalController],
      providers: [
        { provide: MongoService, useValue: mockMongoService },
        { provide: AzureService, useValue: mockAzureService },
      ],
    }).compile();

    controller = module.get<InternalController>(InternalController);
  });

  it('deve reenfileirar ASO em aso-processing com snapshot profissional completo', async () => {
    const schedulingId = new ObjectId();
    mockMongoService.schedulingsCollection.find.mockReturnValue(
      asAsyncCursor([
        {
          _id: schedulingId,
          NOME: 'Senhorinha Pedroso Ortiz',
          NOMEEMPRESA: 'Empresa Exemplo',
          TIPOEXAME: '1',
          TIPOEXAMENOME: 'ADMISSIONAL',
          DATAAGENDAMENTO: '29/04/2026',
          CODIGOEMPRESA: '991254',
          CODIGO: '143',
          CPFFUNCIONARIO: '12345678900',
          PARECERMEDICO: 'APTO',
          CODIGOPRONTUARIO: '991254-143-1-28042026',
          SEQUENCIAFICHA: '77',
          MEDICO: '1698',
          ASOINFO: {
            status: 'DIGITALIZADA',
            observacoesParecer: ['Obs 1'],
            credentials: { pin: 'abc' },
            professional: {
              codigo: '1698',
              nome: 'Amanda de Souza Zanetti',
              cpf: '38958323833',
              conselho: '226402',
              ufconselho: 'SP',
            },
          },
          EXAMES: [
            {
              grupo: 'Exame Clínico',
              codigoProfissional: '1698',
              formulario: {
                codigoMedico: '1698',
                medico: 'Amanda de Souza Zanetti',
              },
            },
          ],
        },
      ]),
    );

    const result = await controller.requeueAso(token, {});

    expect(mockAzureService.filaAsoProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        schedulingId: schedulingId.toString(),
        nomeFuncionario: 'Senhorinha Pedroso Ortiz',
        nomeEmpresa: 'Empresa Exemplo',
        tipoExame: '1',
        tipoExameNome: 'ADMISSIONAL',
        codEmpresa: '991254',
        codFuncionario: '143',
        cpfFuncionario: '12345678900',
        parecer: 'APTO',
        action: 'REPROCESSAR',
        medico: '1698',
        prontuario: '991254-143-1-28042026',
        observacoesParecer: ['Obs 1'],
        credentials: { pin: 'abc' },
        profissional: expect.objectContaining({
          codigo: '1698',
          nome: 'Amanda de Souza Zanetti',
          cpf: '38958323833',
          conselho: '226402',
          ufconselho: 'SP',
        }),
      }),
    );
    expect(mockAzureService.filaAsoEnriquecimento).not.toHaveBeenCalled();
    expect(result.payload).toEqual({ enqueued: 1, errors: [] });
  });

  it('deve filtrar por status de ASO reprocessavel ao reenfileirar sem ids explicitos', async () => {
    mockMongoService.schedulingsCollection.find.mockReturnValue(
      asAsyncCursor([]),
    );

    await controller.requeueAso(token, {});

    expect(mockMongoService.schedulingsCollection.find).toHaveBeenCalledWith({
      'ASOINFO.status': { $in: ['GERADO', 'PENDENTE', 'DIGITALIZADA'] },
    });
  });

  it('deve reconstruir medico a partir do exame clinico quando snapshot do ASO estiver vazio', async () => {
    const schedulingId = new ObjectId();
    mockMongoService.schedulingsCollection.find.mockReturnValue(
      asAsyncCursor([
        {
          _id: schedulingId,
          NOME: 'Everton Leonardo Aguos',
          NOMEEMPRESA: 'Empresa Exemplo',
          TIPOEXAME: '2',
          TIPOEXAMENOME: 'PERIODICO',
          DATAAGENDAMENTO: '23/04/2026',
          CODIGOEMPRESA: '310538',
          CODIGO: '1819',
          CPFFUNCIONARIO: '12345678900',
          PARECERMEDICO: 'APTO',
          CODIGOPRONTUARIO: '310538-1819-2-23042026',
          SEQUENCIAFICHA: '351449840',
          MEDICO: null,
          ASOINFO: {
            status: 'FALHA',
          },
          EXAMES: [
            {
              grupo: 'Exame Clínico',
              codigoProfissional: '1006',
              profissional: 'Dra Exemplo',
              formulario: {
                codigoMedico: '1006',
                medico: 'Dra Exemplo',
              },
            },
          ],
        },
      ]),
    );

    const result = await controller.requeueAso(token, {
      schedulingIds: [schedulingId.toString()],
    });

    expect(mockAzureService.filaAsoProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        schedulingId: schedulingId.toString(),
        medico: '1006',
      }),
    );
    expect(result.payload).toEqual({ enqueued: 1, errors: [] });
  });

  it('deve rejeitar reenfileiramento quando payload minimo do ASO estiver incompleto', async () => {
    const schedulingId = new ObjectId();
    mockMongoService.schedulingsCollection.find.mockReturnValue(
      asAsyncCursor([
        {
          _id: schedulingId,
          NOME: 'Everton Leonardo Aguos',
          NOMEEMPRESA: 'Empresa Exemplo',
          TIPOEXAME: '2',
          TIPOEXAMENOME: 'PERIODICO',
          DATAAGENDAMENTO: '23/04/2026',
          CODIGOEMPRESA: '',
          CODIGO: '1819',
          CPFFUNCIONARIO: '12345678900',
          PARECERMEDICO: 'APTO',
          CODIGOPRONTUARIO: '310538-1819-2-23042026',
          SEQUENCIAFICHA: '351449840',
          MEDICO: null,
          ASOINFO: {
            status: 'FALHA',
          },
          EXAMES: [
            {
              grupo: 'Exame Clínico',
              codigoProfissional: '',
            },
          ],
        },
      ]),
    );

    const result = await controller.requeueAso(token, {
      schedulingIds: [schedulingId.toString()],
    });

    expect(mockAzureService.filaAsoProcessing).not.toHaveBeenCalled();
    expect(result.payload.enqueued).toBe(0);
    expect(result.payload.errors).toEqual([
      expect.stringContaining(
        `schedulingId=${schedulingId.toString()}: Payload de requeue ASO incompleto; campos ausentes: codEmpresa, medico`,
      ),
    ]);
  });

  it('deve ignorar reenfileiramento de ASO quando o parecer nao for APTO puro', async () => {
    const schedulingId = new ObjectId();
    mockMongoService.schedulingsCollection.find.mockReturnValue(
      asAsyncCursor([
        {
          _id: schedulingId,
          NOME: 'Luiz Lima da Silva Filho',
          NOMEEMPRESA: 'Empresa Exemplo',
          TIPOEXAME: '6',
          TIPOEXAMENOME: 'MONITORACAO PONTUAL',
          DATAAGENDAMENTO: '31/03/2026',
          CODIGOEMPRESA: '769695',
          CODIGO: '93',
          CPFFUNCIONARIO: '12345678900',
          PARECERMEDICO: 'INAPTO_TEMPORARIAMENTE',
          CODIGOPRONTUARIO: '769695-93-6-31032026',
          SEQUENCIAFICHA: '348295771',
          MEDICO: '1006',
          RECOMENDACAOMEDICA: '',
          ASOINFO: {
            status: 'FALHA',
          },
          EXAMES: [
            {
              grupo: 'Exame Clínico',
              codigoProfissional: '1006',
            },
          ],
        },
      ]),
    );

    const result = await controller.requeueAso(token, {
      schedulingIds: [schedulingId.toString()],
    });

    expect(mockAzureService.filaAsoProcessing).not.toHaveBeenCalled();
    expect(result.payload).toEqual({
      enqueued: 0,
      errors: [
        `schedulingId=${schedulingId.toString()}: ASO nao elegivel para reprocessamento: parecer medico diferente de APTO`,
      ],
    });
  });

  it('deve ignorar reenfileiramento de ASO sem Exame Clinico, mesmo com parecer APTO puro', async () => {
    const schedulingId = new ObjectId();
    mockMongoService.schedulingsCollection.find.mockReturnValue(
      asAsyncCursor([
        {
          _id: schedulingId,
          NOME: 'Complementar Sem Clinico',
          NOMEEMPRESA: 'Empresa Exemplo',
          TIPOEXAME: '2',
          TIPOEXAMENOME: 'PERIODICO',
          DATAAGENDAMENTO: '31/03/2026',
          CODIGOEMPRESA: '769695',
          CODIGO: '93',
          CPFFUNCIONARIO: '12345678900',
          PARECERMEDICO: 'APTO',
          CODIGOPRONTUARIO: '769695-93-2-31032026',
          SEQUENCIAFICHA: '348295771',
          MEDICO: '1006',
          RECOMENDACAOMEDICA: '',
          ASOINFO: {
            status: 'FALHA',
          },
          EXAMES: [
            {
              grupo: 'Audiometria',
              codigoProfissional: '1006',
            },
          ],
        },
      ]),
    );

    const result = await controller.requeueAso(token, {
      schedulingIds: [schedulingId.toString()],
    });

    expect(mockAzureService.filaAsoProcessing).not.toHaveBeenCalled();
    expect(result.payload).toEqual({
      enqueued: 0,
      errors: [
        `schedulingId=${schedulingId.toString()}: ASO nao elegivel para reprocessamento: atendimento sem Exame Clinico`,
      ],
    });
  });
});
