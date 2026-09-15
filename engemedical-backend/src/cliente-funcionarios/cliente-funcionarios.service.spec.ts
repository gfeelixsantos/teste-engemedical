import 'reflect-metadata';
import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import { ClienteCompanyAccessService } from './cliente-company-access.service';
import {
  ClienteFuncionariosService,
  MongoClienteFuncionariosSchedulingReader,
} from './cliente-funcionarios.service';
import { ClienteFuncionariosStatusService } from './cliente-funcionarios-status.service';
import {
  ClienteFuncionariosSchedulingReader,
  SchedulingSummary,
} from './cliente-funcionarios.types';

function employee(
  overrides: Partial<CadastroFuncionarioPorSituacao> = {},
): CadastroFuncionarioPorSituacao {
  return {
    CODIGOEMPRESA: '123',
    NOMEEMPRESA: 'Empresa Teste',
    CODIGO: 'E-1',
    NOME: 'Álvaro Teste',
    CODIGOUNIDADE: 'U-1',
    NOMEUNIDADE: 'Matriz',
    CODIGOSETOR: 'S-1',
    NOMESETOR: 'Operação',
    CODIGOCARGO: 'C-1',
    NOMECARGO: 'Analista',
    CBOCARGO: '',
    CCUSTO: '',
    NOMECENTROCUSTO: '',
    MATRICULAFUNCIONARIO: 'M-1',
    CPF: '12345678909',
    RG: 'RG-SECRET',
    UFRG: 'SP',
    ORGAOEMISSORRG: 'SSP',
    SITUACAO: 'ATIVO',
    SEXO: 'M',
    PIS: 'PIS-SECRET',
    CTPS: '',
    SERIECTPS: '',
    ESTADOCIVIL: '',
    TIPOCONTATACAO: '',
    DATA_NASCIMENTO: '',
    DATA_ADMISSAO: '01/01/2020',
    DATA_DEMISSAO: '',
    ENDERECO: 'Rua secreta',
    NUMERO_ENDERECO: '10',
    BAIRRO: 'Centro',
    CIDADE: 'São Paulo',
    UF: 'SP',
    CEP: '00000000',
    TELEFONERESIDENCIAL: '11999999999',
    TELEFONECELULAR: '11988888888',
    EMAIL: 'secret@example.com',
    DEFICIENTE: 'NAO',
    DEFICIENCIA: '',
    NM_MAE_FUNCIONARIO: 'Mae',
    DATAULTALTERACAO: '',
    MATRICULARH: '',
    COR: '',
    ESCOLARIDADE: '',
    NATURALIDADE: '',
    RAMAL: '',
    REGIMEREVEZAMENTO: '',
    REGIMETRABALHO: '',
    TELCOMERCIAL: '',
    TURNOTRABALHO: '',
    RHUNIDADE: '',
    RHSETOR: '',
    RHCARGO: '',
    RHCCENTROCUSTOUNIDADE: '',
    ...overrides,
  };
}

function scheduling(overrides: Partial<SchedulingSummary> = {}): SchedulingSummary {
  return {
    id: 'sched-1',
    atendimentoStatus: 'FINALIZADO',
    schedulingDate: '15/09/2026',
    examDates: ['15/09/2026'],
    ...overrides,
  };
}

function readerForService(
  reader: ClienteFuncionariosSchedulingReader,
): MongoClienteFuncionariosSchedulingReader {
  return reader as unknown as MongoClienteFuncionariosSchedulingReader;
}

describe('ClienteFuncionariosService', () => {
  it('autoriza antes de consultar SOC ou Mongo e redige dados sensíveis', async () => {
    const calls: string[] = [];
    const access = {
      assertCanAccess: jest.fn(async () => {
        calls.push('access');
        return { companyCode: '123', companyName: 'Empresa Autorizada' };
      }),
    } as unknown as ClienteCompanyAccessService;
    const soc = {
      EdCadastroFuncionariosPorSituacao: jest.fn(async () => {
        calls.push('soc');
        return [employee()];
      }),
    };
    const reader: ClienteFuncionariosSchedulingReader = {
      findLatestByEmployee: jest.fn(async () => {
        calls.push('mongo');
        return scheduling();
      }),
    };
    const service = new ClienteFuncionariosService(
      access,
      soc as never,
      readerForService(reader),
      new ClienteFuncionariosStatusService(),
    );

    const response = await service.list(
      { companyCode: ' 123 ', page: 1, limit: 10 },
      'user-1',
    );

    expect(calls).toEqual(['access', 'soc', 'mongo']);
    expect(response).toEqual({
      empresa: { codigo: '123', nome: 'Empresa Autorizada' },
      items: [
        expect.objectContaining({
          codigo: 'E-1',
          cpfMasked: '***.***.***-09',
          status: 'VALIDO',
        }),
      ],
      page: 1,
      limit: 10,
      total: 1,
      hasNextPage: false,
    });
    expect(JSON.stringify(response)).not.toContain('RG-SECRET');
    expect(JSON.stringify(response)).not.toContain('PIS-SECRET');
    expect(JSON.stringify(response)).not.toContain('11999999999');
  });

  it('filtra por busca/status, ordena por nome e pagina com limites normalizados', async () => {
    const access = {
      assertCanAccess: jest.fn(async () => ({
        companyCode: '123',
        companyName: 'Empresa',
      })),
    } as unknown as ClienteCompanyAccessService;
    const employees = [
      employee({ CODIGO: '3', NOME: 'Zélia', MATRICULAFUNCIONARIO: 'M-3', DTASO: '01/01/2026' }),
      employee({ CODIGO: '2', NOME: 'Álvaro', MATRICULAFUNCIONARIO: 'M-2', DTASO: '' }),
      employee({ CODIGO: '1', NOME: 'Bruno', MATRICULAFUNCIONARIO: 'M-1', DTASO: '01/01/2026' }),
    ];
    const soc = {
      EdCadastroFuncionariosPorSituacao: jest.fn(async () => employees),
    };
    const reader: ClienteFuncionariosSchedulingReader = {
      findLatestByEmployee: jest.fn(async (_companyCode, code) =>
        code === '2' ? scheduling({ examDates: [] }) : scheduling(),
      ),
    };
    const service = new ClienteFuncionariosService(
      access,
      soc as never,
      readerForService(reader),
      new ClienteFuncionariosStatusService(),
    );

    const response = await service.list(
      { companyCode: '123', q: 'ALVARO', status: 'PENDENTE', page: 0, limit: 2 },
      'user-1',
    );

    expect(response.page).toBe(1);
    expect(response.limit).toBe(10);
    expect(response.total).toBe(1);
    expect(response.items.map((item) => item.nome)).toEqual(['Álvaro']);
  });

  it('retorna vazio sem consultar Mongo quando o SOC não possui funcionários', async () => {
    const access = {
      assertCanAccess: jest.fn(async () => ({ companyCode: '123', companyName: 'Empresa' })),
    } as unknown as ClienteCompanyAccessService;
    const soc = { EdCadastroFuncionariosPorSituacao: jest.fn(async () => []) };
    const reader: ClienteFuncionariosSchedulingReader = {
      findLatestByEmployee: jest.fn(),
    };
    const service = new ClienteFuncionariosService(
      access,
      soc as never,
      readerForService(reader),
      new ClienteFuncionariosStatusService(),
    );

    await expect(service.list({ companyCode: '123' }, 'user-1')).resolves.toMatchObject({
      items: [],
      total: 0,
      hasNextPage: false,
    });
    expect(reader.findLatestByEmployee).not.toHaveBeenCalled();
  });

  it('propaga falhas de upstream e não chama SOC quando a autorização falha', async () => {
    const access = {
      assertCanAccess: jest.fn().mockRejectedValue(new Error('sem acesso')),
    } as unknown as ClienteCompanyAccessService;
    const soc = { EdCadastroFuncionariosPorSituacao: jest.fn() };
    const reader: ClienteFuncionariosSchedulingReader = {
      findLatestByEmployee: jest.fn(),
    };
    const service = new ClienteFuncionariosService(
      access,
      soc as never,
      readerForService(reader),
      new ClienteFuncionariosStatusService(),
    );

    await expect(service.list({ companyCode: '123' }, 'user-1')).rejects.toThrow('sem acesso');
    expect(soc.EdCadastroFuncionariosPorSituacao).not.toHaveBeenCalled();
  });

  it('propaga falha do SOC', async () => {
    const access = {
      assertCanAccess: jest.fn(async () => ({ companyCode: '123', companyName: 'Empresa' })),
    } as unknown as ClienteCompanyAccessService;
    const soc = {
      EdCadastroFuncionariosPorSituacao: jest.fn().mockRejectedValue(new Error('SOC indisponível')),
    };
    const service = new ClienteFuncionariosService(
      access,
      soc as never,
      readerForService({ findLatestByEmployee: jest.fn() }),
      new ClienteFuncionariosStatusService(),
    );

    await expect(service.list({ companyCode: '123' }, 'user-1')).rejects.toThrow('SOC indisponível');
  });

  it('propaga falha do lookup Mongo', async () => {
    const access = {
      assertCanAccess: jest.fn(async () => ({ companyCode: '123', companyName: 'Empresa' })),
    } as unknown as ClienteCompanyAccessService;
    const soc = {
      EdCadastroFuncionariosPorSituacao: jest.fn(async () => [employee()]),
    };
    const service = new ClienteFuncionariosService(
      access,
      soc as never,
      readerForService({
        findLatestByEmployee: jest.fn().mockRejectedValue(new Error('Mongo indisponível')),
      }),
      new ClienteFuncionariosStatusService(),
    );

    await expect(service.list({ companyCode: '123' }, 'user-1')).rejects.toThrow('Mongo indisponível');
  });

  it('calcula hasNextPage e página além do fim sobre o total filtrado', async () => {
    const access = {
      assertCanAccess: jest.fn(async () => ({ companyCode: '123', companyName: 'Empresa' })),
    } as unknown as ClienteCompanyAccessService;
    const employees = Array.from({ length: 11 }, (_, index) =>
      employee({
        CODIGO: String(index + 1),
        NOME: `Funcionário ${String(index + 1).padStart(2, '0')}`,
        DTASO: '01/01/2026',
      }),
    );
    const service = new ClienteFuncionariosService(
      access,
      { EdCadastroFuncionariosPorSituacao: jest.fn(async () => employees) } as never,
      readerForService({ findLatestByEmployee: jest.fn(async () => null) }),
      new ClienteFuncionariosStatusService(),
    );

    const firstPage = await service.list({ companyCode: '123', page: 1, limit: 10 }, 'user-1');
    const secondPage = await service.list({ companyCode: '123', page: 2, limit: 10 }, 'user-1');
    const beyondEnd = await service.list({ companyCode: '123', page: 3, limit: 10 }, 'user-1');

    expect(firstPage.total).toBe(11);
    expect(firstPage.items).toHaveLength(10);
    expect(firstPage.hasNextPage).toBe(true);
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.hasNextPage).toBe(false);
    expect(beyondEnd.items).toEqual([]);
    expect(beyondEnd.hasNextPage).toBe(false);
  });

  it('mantém o contrato de DI com tokens concretos para reader e status', () => {
    const metadata = Reflect.getMetadata(
      'design:paramtypes',
      ClienteFuncionariosService,
    ) as unknown[];

    expect(metadata?.[2]?.name).toBe('MongoClienteFuncionariosSchedulingReader');
    expect(metadata?.[3]).toBe(ClienteFuncionariosStatusService);
  });

  it('projeta campos estreitos e extrai examDates somente de EXAMES.dataExame', async () => {
    const documents = [
      {
        _id: 'sched-1',
        ATENDIMENTOSTATUS: 'FINALIZADO',
        DATAAGENDAMENTO: '15/09/2026',
        DATAAGENDAMENTO_DATE: new Date('2026-09-15T03:00:00.000Z'),
        TIPOEXAME: '5',
        TIPOEXAMENOME: 'DEMISSIONAL',
        EXAMES: [
          {
            dataExame: '01/09/2026',
            grupo: 'Exame Clínico',
            nomeExame: 'ASO demissional',
            cpf: 'nao deve ser projetado',
          },
        ],
      },
      {
        _id: 'sched-2',
        ATENDIMENTOSTATUS: 'FINALIZADO',
        DATAAGENDAMENTO: '01/09/2026',
        DATAAGENDAMENTO_DATE: new Date('2026-09-01T03:00:00.000Z'),
        TIPOEXAME: '1',
        TIPOEXAMENOME: 'ASO',
        EXAMES: [
          {
            dataExame: '20/08/2026',
            grupo: 'Exame Complementar',
            nomeExame: 'Audiometria',
          },
        ],
      },
    ];
    const cursor = {
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue(documents),
    };
    const find = jest.fn().mockReturnValue(cursor);
    const reader = new MongoClienteFuncionariosSchedulingReader({
      schedulingsCollection: { find },
    } as never);

    const result = await reader.findLatestByEmployee('123', 'E-1');
    const projection = find.mock.calls[0][1].projection;

    expect(projection).toEqual({
      _id: 1,
      ATENDIMENTOSTATUS: 1,
      DATAAGENDAMENTO: 1,
      DATAAGENDAMENTO_DATE: 1,
      TIPOEXAME: 1,
      TIPOEXAMENOME: 1,
      'EXAMES.dataExame': 1,
      'EXAMES.grupo': 1,
      'EXAMES.nomeExame': 1,
    });
    expect(projection.EXAMES).toBeUndefined();
    expect(result).toEqual({
      id: 'sched-1',
      atendimentoStatus: 'FINALIZADO',
      schedulingDate: '15/09/2026',
      examDates: ['01/09/2026', '20/08/2026'],
      examType: 'DEMISSIONAL',
      examTypeCode: '5',
      examTypeName: 'DEMISSIONAL',
    });
  });
});
