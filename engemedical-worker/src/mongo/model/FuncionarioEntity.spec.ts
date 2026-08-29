import { AtendimentoStatus, ExamStatus } from '../enum/scheduling.enum';
import { SchedulingDocument } from '../types/scheduling';
import { FuncionarioEntity } from './FuncionarioEntity';

function makeDoc(
  overrides: Partial<SchedulingDocument> = {},
): SchedulingDocument {
  return {
    _id: '507f1f77bcf86cd799439011',
    ATENDIMENTOSTATUS: AtendimentoStatus.AGENDADO,
    ASOSTATUS: '',
    SCHEDULINGCODE: '',
    CODIGOPRONTUARIO: '',
    RISCOSASO: [],
    CODIGOEMPRESA: '123456',
    SUBGRUPOEMPRESA: '',
    CODIGOINTERNOEMPRESA: '',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    NOMEEMPRESA: '',
    CODIGO: '',
    NOME: 'Paciente Teste',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: '',
    MATRICULAFUNCIONARIO: '',
    CPFFUNCIONARIO: '',
    SITUACAO: '',
    DATANASCIMENTO: '',
    DATAAGENDAMENTO: '',
    DATAAGENDAMENTO_DATE: new Date(),
    HORARIO: '',
    UNIDADEATENDIMENTO: '',
    SEQUENCIAFICHA: '',
    TIPOEXAME: '',
    TIPOEXAMENOME: '',
    OBSERVACOES: null,
    ANOTACOES: null,
    PARECERMEDICO: null,
    RECOMENDACAOMEDICA: null,
    MEDICO: null,
    ANEXOS: [],
    TERM: false,
    CLIENT: null,
    CREATED: '',
    EXAMES: [],
    TICKET: null,
    ...overrides,
  };
}

describe('FuncionarioEntity worker parity', () => {
  it('usa AVALIACAO_MEDICA quando todos os exames com clinico estao finalizados', () => {
    const doc = makeDoc({
      EXAMES: [
        {
          codigoExame: '11',
          nomeExame: 'Exame Clinico',
          grupo: 'Exame Clínico',
          status: ExamStatus.FINALIZADO,
          formulario: { conclusao: 'Apto' },
        },
        {
          codigoExame: '51.01.004-6',
          nomeExame: 'Audiometria',
          grupo: 'Audiometria',
          status: ExamStatus.FINALIZADO,
          formulario: {
            classificacaoOD: 'Normal',
            classificacaoOE: 'Normal',
          },
        },
      ],
    });

    const funcionario = new FuncionarioEntity(doc);
    funcionario.updateAtendimentoStatus();

    expect(funcionario.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.AGUARDANDO_AVALIACAO_MEDICA,
    );
  });

  it('mantem FINALIZADO para complementar sem exame clinico', () => {
    const doc = makeDoc({
      EXAMES: [
        {
          codigoExame: '32050070',
          nomeExame: 'Raio X',
          grupo: 'Raio-X',
          status: ExamStatus.FINALIZADO,
        },
      ],
    });

    const funcionario = new FuncionarioEntity(doc);
    funcionario.updateAtendimentoStatus();

    expect(funcionario.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.FINALIZADO,
    );
  });
});
