import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import { ClienteCompanyAccessService } from './cliente-company-access.service';
import { ClienteFuncionariosService } from './cliente-funcionarios.service';
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
    const service = new ClienteFuncionariosService(access, soc as never, reader);

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
    const service = new ClienteFuncionariosService(access, soc as never, reader);

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
    const service = new ClienteFuncionariosService(access, soc as never, reader);

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
    const service = new ClienteFuncionariosService(access, soc as never, reader);

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
      { findLatestByEmployee: jest.fn() },
    );

    await expect(service.list({ companyCode: '123' }, 'user-1')).rejects.toThrow('SOC indisponível');
  });
});
