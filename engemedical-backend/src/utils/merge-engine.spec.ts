import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { ExamsScheduled } from 'src/mongo/types/scheduling';

import { executeMergeInteligente } from './merge-engine';

function createExam(partial: Partial<ExamsScheduled>): ExamsScheduled {
  return {
    codigoExame: partial.codigoExame || '0281',
    nomeExame: partial.nomeExame || 'Audiometria',
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

describe('executeMergeInteligente', () => {
  it('preserva exame existente quando SOC retorna o mesmo codigo sem data', () => {
    const exameFinalizado = createExam({
      codigoExame: '0281',
      status: ExamStatus.FINALIZADO,
      dataExame: '2026-02-06T11:18:56.000Z',
      sequencialResultadoExame: '123',
      url: 'https://resultados/exame.pdf',
    });

    const exameSocSemData = createExam({
      codigoExame: '0281',
      status: ExamStatus.PENDENTE,
      dataExame: null,
      sequencialResultadoExame: '123',
    });

    const { finais, resumo } = executeMergeInteligente(
      [exameFinalizado],
      [exameSocSemData],
      [],
    );

    expect(finais).toHaveLength(1);
    expect(finais[0].status).toBe(ExamStatus.FINALIZADO);
    expect(finais[0].url).toBe('https://resultados/exame.pdf');
    expect(resumo).toEqual({
      preservados: 1,
      adicionados: 0,
      removidos: 0,
    });
  });

  it('preserva exame existente mesmo quando o sequencial diverge (match por codigoExame)', () => {
    const exameFinalizado = createExam({
      codigoExame: '0281',
      status: ExamStatus.FINALIZADO,
      dataExame: '2026-02-06T11:18:56.000Z',
      sequencialResultadoExame: '123',
      url: 'https://resultados/exame.pdf',
    });

    const exameSocSemDataOutroSequencial = createExam({
      codigoExame: '0281',
      status: ExamStatus.PENDENTE,
      dataExame: null,
      sequencialResultadoExame: '456',
    });

    const { finais, resumo } = executeMergeInteligente(
      [exameFinalizado],
      [exameSocSemDataOutroSequencial],
      [],
    );

    expect(finais).toHaveLength(1);
    expect(finais[0].status).toBe(ExamStatus.FINALIZADO);
    expect(finais[0].url).toBe('https://resultados/exame.pdf');
    expect(resumo).toEqual({
      preservados: 1,
      adicionados: 0,
      removidos: 0,
    });
  });

  it('normaliza codigo para casar formatos distintos', () => {
    const exameBanco = createExam({
      codigoExame: '50.01.001-8',
      nomeExame: 'Acuidade Visual',
      status: ExamStatus.PENDENTE,
      dataExame: null,
      sequencialResultadoExame: '',
    });

    const exameSoc = createExam({
      codigoExame: '50010018',
      nomeExame: 'Acuidade Visual',
      status: ExamStatus.PENDENTE,
      dataExame: null,
      sequencialResultadoExame: '',
    });

    const { finais, resumo } = executeMergeInteligente(
      [exameBanco],
      [exameSoc],
      [],
    );

    expect(finais).toHaveLength(1);
    expect(resumo).toEqual({
      preservados: 1,
      adicionados: 0,
      removidos: 0,
    });
  });

  it('faz o backfill do grupo vindo do SOC quando o banco esta com grupo em branco (grupo: "")', () => {
    const exameBancoSemGrupo = createExam({
      codigoExame: '225588',
      nomeExame: 'Avaliação Psicossocial',
      grupo: '', // Banco gravou vazio por bug anterior
      status: ExamStatus.PENDENTE,
    });

    const exameSocComGrupo = createExam({
      codigoExame: '225588',
      nomeExame: 'Avaliação Psicossocial',
      grupo: 'Psicossocial',
      status: ExamStatus.PENDENTE,
    });

    const { finais } = executeMergeInteligente(
      [exameBancoSemGrupo],
      [exameSocComGrupo],
      [],
    );

    expect(finais).toHaveLength(1);
    expect(finais[0].grupo).toBe('Psicossocial');
  });

  it('preserva o grupo existente no banco durante a transicao recepcao -> atendimento -> finalizado', () => {
    const exameEmAtendimento = createExam({
      codigoExame: '50.01.001-8',
      nomeExame: 'Acuidade Visual',
      grupo: 'Acuidade Visual',
      status: ExamStatus.PENDENTE,
    });

    const exameSocAtualizacao = createExam({
      codigoExame: '50.01.001-8',
      nomeExame: 'Acuidade Visual',
      grupo: 'Acuidade Visual',
      status: ExamStatus.PENDENTE,
    });

    const { finais } = executeMergeInteligente(
      [exameEmAtendimento],
      [exameSocAtualizacao],
      [],
    );

    expect(finais[0].grupo).toBe('Acuidade Visual');
  });
});
