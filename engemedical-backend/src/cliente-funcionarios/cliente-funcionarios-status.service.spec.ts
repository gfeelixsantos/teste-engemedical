import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import {
  ClienteFuncionariosStatusService,
  SchedulingSummary,
} from './cliente-funcionarios-status.service';

const today = new Date('2026-09-15T12:00:00-03:00');

function employee(overrides: Partial<CadastroFuncionarioPorSituacao> = {}) {
  return {
    CODIGOEMPRESA: '123',
    NOMEEMPRESA: 'Empresa Teste',
    CODIGO: 'E-1',
    NOME: 'Funcionário Teste',
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
    RG: 'secret',
    UFRG: 'SP',
    ORGAOEMISSORRG: 'SSP',
    SITUACAO: 'ATIVO',
    SEXO: 'F',
    PIS: 'secret',
    CTPS: '',
    SERIECTPS: '',
    ESTADOCIVIL: '',
    TIPOCONTATACAO: '',
    DATA_NASCIMENTO: '',
    DATA_ADMISSAO: '01/01/2020',
    DATA_DEMISSAO: '',
    ENDERECO: 'secret',
    NUMERO_ENDERECO: '1',
    BAIRRO: 'secret',
    CIDADE: 'São Paulo',
    UF: 'SP',
    CEP: '00000000',
    TELEFONERESIDENCIAL: 'secret',
    TELEFONECELULAR: 'secret',
    EMAIL: 'secret@example.com',
    DEFICIENTE: 'NAO',
    DEFICIENCIA: '',
    NM_MAE_FUNCIONARIO: 'secret',
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
  } as CadastroFuncionarioPorSituacao;
}

function scheduling(
  overrides: Partial<SchedulingSummary> = {},
): SchedulingSummary {
  return {
    id: 'sched-1',
    atendimentoStatus: 'FINALIZADO',
    schedulingDate: '15/09/2026',
    examDates: [],
    ...overrides,
  };
}

describe('ClienteFuncionariosStatusService', () => {
  const service = new ClienteFuncionariosStatusService();

  it.each([
    ['ATENDIMENTO', 'ATENDIMENTO'],
    ['AGUARDANDO_RESULTADOS', 'AGUARDANDO_RESULTADOS'],
    ['AVALIACAO_MEDICA', 'AVALIACAO_MEDICA'],
    ['AGENDADO', 'AGENDADO'],
  ] as const)('prioriza o status de agendamento %s', (atendimentoStatus, status) => {
    const result = service.resolve(
      employee({ DTASO: '01/01/2020', TPASO: 'VIDA' }),
      scheduling({ atendimentoStatus }),
      today,
    );

    expect(result.status).toBe(status);
  });

  it('retorna PENDENTE quando não há histórico de exame', () => {
    expect(service.resolve(employee(), scheduling(), today).status).toBe('PENDENTE');
  });

  it('retorna EXPIRADO quando o último exame é anterior a um ano', () => {
    expect(
      service.resolve(employee({ DTASO: '14/09/2025' }), scheduling(), today).status,
    ).toBe('EXPIRADO');
  });

  it('classifica exame clínico de 2025 como expirado em 2026, não pendente', () => {
    expect(
      service.resolve(employee(), scheduling(), today, ['15/09/2025']).status,
    ).toBe('EXPIRANDO');
  });

  it('retorna EXPIRANDO no limite de onze meses e permanece válido no dia anterior', () => {
    expect(
      service.resolve(employee({ DTASO: '15/10/2025' }), scheduling(), today).status,
    ).toBe('EXPIRANDO');
    expect(
      service.resolve(employee({ DTASO: '16/10/2025' }), scheduling(), today).status,
    ).toBe('VALIDO');
  });

  it('trata exatamente um ano como EXPIRANDO, não como EXPIRADO', () => {
    expect(
      service.resolve(employee({ DTASO: '15/09/2025' }), scheduling(), today).status,
    ).toBe('EXPIRANDO');
  });

  it('retorna VALIDO para exame recente e usa a data mais recente disponível', () => {
    const result = service.resolve(
      employee({ DTASO: '01/01/2020' }),
      scheduling({ examDates: ['15/11/2025'] }),
      today,
    );

    expect(result.status).toBe('VALIDO');
    expect(result.schedulingId).toBe('sched-1');
    expect(result.schedulingDate).toBe('15/09/2026');
  });
});
