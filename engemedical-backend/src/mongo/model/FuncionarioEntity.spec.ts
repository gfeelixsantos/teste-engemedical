import { AtendimentoStatus, ExamStatus } from '../enum/scheduling.enum';
import { FuncionarioEntity } from './FuncionarioEntity';
import { ExamsScheduled, SchedulingDocument } from '../types/scheduling';

function createBaseScheduling(exames: ExamsScheduled[]): SchedulingDocument {
  return {
    _id: 'dummy-id',
    ATENDIMENTOSTATUS: AtendimentoStatus.AGENDADO,
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

describe('FuncionarioEntity - fluxos complementares sem Exame Clínico', () => {
  it('deve finalizar atendimento com Acuidade Visual + Audiometria todos finalizados', () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: '50.01.001-8',
        nomeExame: 'Acuidade Visual',
        grupo: 'Acuidade Visual',
        status: ExamStatus.FINALIZADO,
      },
      {
        codigoExame: '51.01.004-6',
        nomeExame: 'Audiometria',
        grupo: 'Audiometria',
        status: ExamStatus.FINALIZADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus();

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(AtendimentoStatus.FINALIZADO);
  });

  it('deve ir para AGUARDANDO_RESULTADOS com Audiometria finalizada e Raio-X aguardando', () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: '51.01.004-6',
        nomeExame: 'Audiometria',
        grupo: 'Audiometria',
        status: ExamStatus.FINALIZADO,
      },
      {
        codigoExame: '32050070',
        nomeExame: 'Radiografia de tórax',
        grupo: 'Raio-X',
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus();

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.AGUARDANDO_RESULTADOS,
    );
  });

  it('deve ir para AGUARDANDO_RESULTADOS quando exame volta para AGUARDANDO_RESULTADO (reemissão)', () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: '51.01.004-6',
        nomeExame: 'Audiometria',
        grupo: 'Audiometria',
        status: ExamStatus.FINALIZADO,
      },
      {
        codigoExame: '32050070',
        nomeExame: 'Radiografia de tórax',
        grupo: 'Raio-X',
        status: ExamStatus.FINALIZADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
    const func = new FuncionarioEntity(doc);

    func.updateExameAtIndex(1, { status: ExamStatus.AGUARDANDO_RESULTADO });
    func.updateAtendimentoStatus();

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.AGUARDANDO_RESULTADOS,
    );
  });

  it('deve finalizar atendimento quando Audiometria e Raio-X estiverem finalizados', () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: '51.01.004-6',
        nomeExame: 'Audiometria',
        grupo: 'Audiometria',
        status: ExamStatus.FINALIZADO,
      },
      {
        codigoExame: '32050070',
        nomeExame: 'Radiografia de tórax',
        grupo: 'Raio-X',
        status: ExamStatus.FINALIZADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus();

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(AtendimentoStatus.FINALIZADO);
  });

  it('deve ir para AGUARDANDO_RESULTADOS quando Laboratorio em AGUARDANDO_RESULTADO (não é Clínico)', () => {
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
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus(AtendimentoStatus.EM_ATENDIMENTO);

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.AGUARDANDO_RESULTADOS,
    );
  });

  it('deve manter EM_ATENDIMENTO quando Exame Clínico está em AGUARDANDO_RESULTADO (aguarda assinatura PSC)', () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: 'clinico',
        nomeExame: 'Exame Clínico',
        grupo: 'Exame Clínico',
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus(AtendimentoStatus.EM_ATENDIMENTO);

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.EM_ATENDIMENTO,
    );
  });

  it('deve manter EM_ATENDIMENTO quando Triagem está em AGUARDANDO_RESULTADO', () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: 'triagem',
        nomeExame: 'Triagem',
        grupo: 'Triagem',
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus(AtendimentoStatus.EM_ATENDIMENTO);

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.EM_ATENDIMENTO,
    );
  });

  it('deve ir para AGUARDANDO_RESULTADOS quando Audiometria está em AGUARDANDO_RESULTADO (reemissão)', () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: '51.01.004-6',
        nomeExame: 'Audiometria',
        grupo: 'Audiometria',
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus(AtendimentoStatus.EM_ATENDIMENTO);

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.AGUARDANDO_RESULTADOS,
    );
  });

  it('deve manter EM_ATENDIMENTO enquanto ainda houver exame pendente', () => {
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

    const doc = createBaseScheduling(exames);
    doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus(AtendimentoStatus.EM_ATENDIMENTO);

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.EM_ATENDIMENTO,
    );
  });

  it('deve ir para AGUARDANDO_RESULTADOS quando Espirometria está em AGUARDANDO_RESULTADO', () => {
    const exames: ExamsScheduled[] = [
      {
        codigoExame: '19.01.029-0',
        nomeExame: 'Espirometria',
        grupo: 'Espirometria',
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
    ];

    const doc = createBaseScheduling(exames);
    doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
    const func = new FuncionarioEntity(doc);

    func.updateAtendimentoStatus(AtendimentoStatus.EM_ATENDIMENTO);

    expect(func.getRaw().ATENDIMENTOSTATUS).toBe(
      AtendimentoStatus.AGUARDANDO_RESULTADOS,
    );
  });
});
