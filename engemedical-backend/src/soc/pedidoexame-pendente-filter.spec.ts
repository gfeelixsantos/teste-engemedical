/**
 * Testes: Impacto do filtro PENDENTE no fluxo de recepção
 *
 * Cenário: Funcionário com exames de 01/07 (FINALIZADO/AGUARDANDO_RESULTADO)
 * retorna em 05/07. O filtro em EdPedidoExame (soc.service.ts:326-328)
 * remove exames não-PENDENTE antes de retornar ao frontend.
 *
 * Quando o frontend submete via updateFullDocument, os exames FINALIZADO
 * que não vieram no payload são removidos do banco.
 */
import { ExamStatus, AtendimentoStatus } from 'src/mongo/enum/scheduling.enum';
import { ExamsScheduled, SchedulingDocument } from 'src/mongo/types/scheduling';
import { PedidoExame } from './types/PedidoExame';
import { executeMergeInteligente } from 'src/utils/merge-engine';

// ============================================================
// Helpers
// ============================================================

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

function createPedido(overrides: Partial<PedidoExame> = {}): PedidoExame {
  return {
    CODIGOEMPRESA: '100',
    NOMEEMPRESA: 'Empresa Teste',
    CNPJEMPRESA: '12345678000190',
    CPFEMPRESA: '',
    CEIEMPRESA: '',
    SUBGRUPOEMPRESA: '',
    SEQUENCIAFICHA: 'SEQ-001',
    CODIGOFUNCIONARIO: '200',
    NOMEFUNCIONARIO: 'João Silva',
    CPFFUNCIONARIO: '12345678900',
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
    CODIGOTIPOEXAME: '2',
    DATAFICHA: '05/07/2026',
    CODIGOTUSSEXAME: '',
    CODIGOEXAMEAMB: '',
    CODIGOINTERNOEXAME: '0281',
    NOMEEXAME: 'Audiometria',
    DATAEXAME: '05/07/2026',
    RISCOSFUNCIONARIO: '',
    RISCOSASO: '',
    DATANASCIMENTO: '01/01/1990',
    CODIGORH: '',
    ...overrides,
  };
}

function createSchedulingDoc(overrides: Partial<SchedulingDocument> = {}): SchedulingDocument {
  return {
    _id: '507f1f77bcf86cd799439011' as any,
    CODIGOPRONTUARIO: '100-200-2-01072026',
    CODIGOEMPRESA: '100',
    CODIGO: '200',
    NOME: 'João Silva',
    NOMEEMPRESA: 'Empresa Teste',
    DATAAGENDAMENTO: '01/07/2026',
    DATAAGENDAMENTO_DATE: new Date('2026-07-01'),
    ATENDIMENTOSTATUS: AtendimentoStatus.AGENDADO,
    SEQUENCIAFICHA: 'SEQ-001',
    TIPOEXAME: '2',
    TIPOEXAMENOME: 'PERIODICO',
    EXAMES: [],
    ANEXOS: [],
    ...overrides,
  } as any;
}

// ============================================================
// Grupo 1: executeMergeInteligente — preservação de exames
// ============================================================

describe('Grupo 1: executeMergeInteligente — preservação de exames com histórico', () => {
  it('preserva exame FINALIZADO quando SOC retorna o mesmo código', () => {
    const dbExam = createExam({
      codigoExame: '0281',
      status: ExamStatus.FINALIZADO,
      url: 'https://resultados/audiometria.pdf',
    });
    const socExam = createExam({
      codigoExame: '0281',
      status: ExamStatus.PENDENTE,
    });

    const { finais, resumo } = executeMergeInteligente([dbExam], [socExam], []);

    expect(finais).toHaveLength(1);
    expect(finais[0].status).toBe(ExamStatus.FINALIZADO);
    expect(finais[0].url).toBe('https://resultados/audiometria.pdf');
    expect(resumo.preservados).toBe(1);
    expect(resumo.removidos).toBe(0);
  });

  it('preserva exame AGUARDANDO_RESULTADO quando SOC retorna o mesmo código', () => {
    const dbExam = createExam({
      codigoExame: '0281',
      status: ExamStatus.AGUARDANDO_RESULTADO,
    });
    const socExam = createExam({
      codigoExame: '0281',
      status: ExamStatus.PENDENTE,
    });

    const { finais } = executeMergeInteligente([dbExam], [socExam], []);

    expect(finais).toHaveLength(1);
    expect(finais[0].status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
  });

  it('remove exame PENDENTE do banco quando não está mais no SOC', () => {
    const dbExam = createExam({
      codigoExame: '0281',
      status: ExamStatus.PENDENTE,
    });
    const socExam = createExam({
      codigoExame: '0999',
      status: ExamStatus.PENDENTE,
    });

    const { finais, resumo } = executeMergeInteligente([dbExam], [socExam], []);

    // 0281 (PENDENTE do banco, ausente no SOC) → removido
    // 0999 (novo do SOC) → adicionado
    expect(finais).toHaveLength(1);
    expect(finais[0].codigoExame).toBe('0999');
    expect(resumo.removidos).toBe(1);
    expect(resumo.adicionados).toBe(1);
  });

  it('preserva FINALIZADO do banco e adiciona novo PENDENTE do SOC', () => {
    const dbExamFinalizado = createExam({
      codigoExame: '0281',
      status: ExamStatus.FINALIZADO,
      url: 'https://resultados/old.pdf',
    });
    const socExamNovo = createExam({
      codigoExame: '0999',
      nomeExame: 'Exame Novo',
      status: ExamStatus.PENDENTE,
    });

    const { finais, resumo } = executeMergeInteligente(
      [dbExamFinalizado],
      [socExamNovo],
      [],
    );

    expect(finais).toHaveLength(2);
    expect(finais.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(finais.find((e) => e.codigoExame === '0999')?.status).toBe(ExamStatus.PENDENTE);
    expect(resumo.preservados).toBe(1);
    expect(resumo.adicionados).toBe(1);
    expect(resumo.removidos).toBe(0);
  });

  it('preserva múltiplos exames FINALIZADO + AGUARDANDO_RESULTADO', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
      createExam({ codigoExame: '0283', status: ExamStatus.PENDENTE }),
    ];
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0284', nomeExame: 'Exame D', status: ExamStatus.PENDENTE }),
    ];

    const { finais, resumo } = executeMergeInteligente(dbExams, socExams, []);

    // 0281: FINALIZADO preservado
    // 0282: AGUARDANDO_RESULTADO preservado
    // 0283: PENDENTE do banco ausente no SOC → removido
    // 0284: novo do SOC → adicionado
    expect(finais).toHaveLength(3);
    expect(finais.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(finais.find((e) => e.codigoExame === '0282')?.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(finais.find((e) => e.codigoExame === '0284')?.status).toBe(ExamStatus.PENDENTE);
    expect(resumo.preservados).toBe(2);
    expect(resumo.adicionados).toBe(1);
    expect(resumo.removidos).toBe(1);
  });

  it('preserva exames herdados (copiados de ficha anterior)', () => {
    const herdado = createExam({
      codigoExame: '0281',
      status: ExamStatus.FINALIZADO,
    });
    const socExam = createExam({
      codigoExame: '0282',
      nomeExame: 'Exame Novo',
      status: ExamStatus.PENDENTE,
    });

    const { finais } = executeMergeInteligente([], [socExam], [herdado]);

    expect(finais).toHaveLength(2);
    expect(finais.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(finais.find((e) => e.codigoExame === '0282')?.status).toBe(ExamStatus.PENDENTE);
  });
});

// ============================================================
// Grupo 2: updateFullDocument — remoção de exames no submit
// ============================================================

describe('Grupo 2: updateFullDocument — remoção de exames na submissão', () => {
  /**
   * Simula o comportamento de updateFullDocument (mongo.service.ts:5531-5576):
   * 1. Lê o documento atual do banco
   * 2. Cria Set com códigos dos exames submetidos
   * 3. Remove do banco qualquer exame não presente no submit
   * 4. Adiciona/atualiza exames do submit
   */
  function simulateUpdateFullDocument(
    dbExams: ExamsScheduled[],
    submittedExams: ExamsScheduled[],
  ): ExamsScheduled[] {
    const examesAtuaisMap = new Map(
      dbExams.map((ex) => [ex.codigoExame, { ...ex }]),
    );

    const codigosParaManter = new Set(
      submittedExams.map((ex) => ex.codigoExame),
    );

    // Remove exames não submetidos
    for (const codigo of examesAtuaisMap.keys()) {
      if (!codigosParaManter.has(codigo)) {
        examesAtuaisMap.delete(codigo);
      }
    }

    // Adiciona/atualiza exames submetidos
    for (const exameRecebido of submittedExams) {
      const codigo = exameRecebido.codigoExame;
      if (examesAtuaisMap.has(codigo)) {
        examesAtuaisMap.set(codigo, {
          ...examesAtuaisMap.get(codigo),
          ...exameRecebido,
        });
      } else {
        examesAtuaisMap.set(codigo, exameRecebido);
      }
    }

    return Array.from(examesAtuaisMap.values());
  }

  it('preserva todos os exames quando o submit contém todos', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    const submitted = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];

    const result = simulateUpdateFullDocument(dbExams, submitted);

    expect(result).toHaveLength(2);
    expect(result.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(result.find((e) => e.codigoExame === '0282')?.status).toBe(ExamStatus.PENDENTE);
  });

  it('REMOVE exame FINALIZADO do banco quando não vem no submit', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    // Submit contém APENAS o PENDENTE (cenário quando EdPedidoExame filtra para PENDENTE)
    const submitted = [
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];

    const result = simulateUpdateFullDocument(dbExams, submitted);

    // 0281 (FINALIZADO) foi removido porque não veio no submit
    expect(result).toHaveLength(1);
    expect(result[0].codigoExame).toBe('0282');
  });

  it('REMOVE exame AGUARDANDO_RESULTADO do banco quando não vem no submit', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.AGUARDANDO_RESULTADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    const submitted = [
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];

    const result = simulateUpdateFullDocument(dbExams, submitted);

    expect(result).toHaveLength(1);
    expect(result[0].codigoExame).toBe('0282');
  });

  it('REMOVE múltiplos exames FINALIZADO quando submit tem apenas PENDENTE', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
      createExam({ codigoExame: '0283', status: ExamStatus.PENDENTE }),
    ];
    const submitted = [
      createExam({ codigoExame: '0283', status: ExamStatus.PENDENTE }),
    ];

    const result = simulateUpdateFullDocument(dbExams, submitted);

    // 0281 e 0282 removidos, apenas 0283 mantido
    expect(result).toHaveLength(1);
    expect(result[0].codigoExame).toBe('0283');
  });

  it('adiciona novo exame que não existia no banco', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
    ];
    const submitted = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0999', nomeExame: 'Novo', status: ExamStatus.PENDENTE }),
    ];

    const result = simulateUpdateFullDocument(dbExams, submitted);

    expect(result).toHaveLength(2);
    expect(result.find((e) => e.codigoExame === '0999')).toBeDefined();
  });

  it('atualiza dados do exame quando ele já existe no banco', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE, sala: '' }),
    ];
    const submitted = [
      createExam({ codigoExame: '0281', status: ExamStatus.EM_ATENDIMENTO as any, sala: 'Sala 1' }),
    ];

    const result = simulateUpdateFullDocument(dbExams, submitted);

    expect(result).toHaveLength(1);
    expect(result[0].sala).toBe('Sala 1');
  });
});

// ============================================================
// Grupo 3: Filtro PENDENTE em EdPedidoExame — cenário completo
// ============================================================

describe('Grupo 3: Filtro PENDENTE em EdPedidoExame — cenário completo', () => {
  function simulateUpdateFullDocument(
    dbExams: ExamsScheduled[],
    submittedExams: ExamsScheduled[],
  ): ExamsScheduled[] {
    const examesAtuaisMap = new Map(
      dbExams.map((ex) => [ex.codigoExame, { ...ex }]),
    );
    const codigosParaManter = new Set(submittedExams.map((ex) => ex.codigoExame));
    for (const codigo of examesAtuaisMap.keys()) {
      if (!codigosParaManter.has(codigo)) {
        examesAtuaisMap.delete(codigo);
      }
    }
    for (const exameRecebido of submittedExams) {
      const codigo = exameRecebido.codigoExame;
      if (examesAtuaisMap.has(codigo)) {
        examesAtuaisMap.set(codigo, {
          ...examesAtuaisMap.get(codigo),
          ...exameRecebido,
        });
      } else {
        examesAtuaisMap.set(codigo, exameRecebido);
      }
    }
    return Array.from(examesAtuaisMap.values());
  }

  /**
   * Simula o comportamento de EdPedidoExame (soc.service.ts:322-331):
   * O resultado do handleUpdates é filtrado para retornar APENAS
   * exames com status PENDENTE ao frontend.
   */
  function simularFiltroEdPedidoExame(
    resultadoMerge: ExamsScheduled[],
  ): ExamsScheduled[] {
    return resultadoMerge.filter((ex) => ex.status === ExamStatus.PENDENTE);
  }

  it('Remove FINALIZADO e AGUARDANDO_RESULTADO do retorno ao frontend', () => {
    // Resultado do merge (correto): preserva FINALIZADO e AGUARDANDO
    const resultadoMerge: ExamsScheduled[] = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
      createExam({ codigoExame: '0283', status: ExamStatus.PENDENTE }),
    ];

    const resultadoFiltrado = simularFiltroEdPedidoExame(resultadoMerge);

    // Apenas o PENDENTE é retornado ao frontend
    expect(resultadoFiltrado).toHaveLength(1);
    expect(resultadoFiltrado[0].codigoExame).toBe('0283');
    expect(resultadoFiltrado[0].status).toBe(ExamStatus.PENDENTE);
  });

  it('Mantém todos quando todos são PENDENTE (fluxo normal)', () => {
    const resultadoMerge: ExamsScheduled[] = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];

    const resultadoFiltrado = simularFiltroEdPedidoExame(resultadoMerge);

    expect(resultadoFiltrado).toHaveLength(2);
  });

  it('Retorna vazio quando todos são FINALIZADO/AGUARDANDO', () => {
    const resultadoMerge: ExamsScheduled[] = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
    ];

    const resultadoFiltrado = simularFiltroEdPedidoExame(resultadoMerge);

    expect(resultadoFiltrado).toHaveLength(0);
  });

  it('Cenário completo: merge preserva → filtro remove → submit deleta', () => {
    // 1. Documento no banco tem exames de 01/07
    const dbExams01Jul = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
    ];

    // 2. SOC retorna pedidos de 05/07 com os mesmos códigos
    const socExams05Jul = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];

    // 3. Merge preserva os FINALIZADO/AGUARDANDO
    const resultadoMerge = executeMergeInteligente(dbExams01Jul, socExams05Jul, []);
    expect(resultadoMerge.finais).toHaveLength(2);
    expect(resultadoMerge.finais[0].status).toBe(ExamStatus.FINALIZADO);
    expect(resultadoMerge.finais[1].status).toBe(ExamStatus.AGUARDANDO_RESULTADO);

    // 4. Filtro PENDENTE remove os finalizados do retorno ao frontend
    const resultadoFiltrado = simularFiltroEdPedidoExame(resultadoMerge.finais);
    expect(resultadoFiltrado).toHaveLength(0); // ← BUG: frontend recebe nada

    // 5. Frontend submete o que recebeu (vazio ou apenas PENDENTE)
    // 6. updateFullDocument remove do banco o que não veio no submit
    const resultadoFinal = simulateUpdateFullDocument(dbExams01Jul, resultadoFiltrado);
    expect(resultadoFinal).toHaveLength(0); // ← Todos os exames foram DELETADOS
  });

  it('Cenário com mix: 1 FINALIZADO + 1 PENDENTE no SOC', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0283', nomeExame: 'Novo', status: ExamStatus.PENDENTE }),
    ];

    const resultadoMerge = executeMergeInteligente(dbExams, socExams, []);

    // Merge: 0281 FINALIZADO preservado, 0282 PENDENTE preservado, 0283 novo
    expect(resultadoMerge.finais).toHaveLength(3);

    const resultadoFiltrado = simularFiltroEdPedidoExame(resultadoMerge.finais);
    // Filtro: apenas PENDENTE → 0282 e 0283 (0281 FINALIZADO removido)
    expect(resultadoFiltrado).toHaveLength(2);
    expect(resultadoFiltrado.find((e) => e.codigoExame === '0281')).toBeUndefined();

    // updateFullDocument: 0281 não veio no submit → removido do banco
    const resultadoFinal = simulateUpdateFullDocument(dbExams, resultadoFiltrado);
    expect(resultadoFinal).toHaveLength(2);
    expect(resultadoFinal.find((e) => e.codigoExame === '0281')).toBeUndefined();
  });
});

// ============================================================
// Grupo 4: Regressão — fluxo normal sem histórico
// ============================================================

describe('Grupo 4: Regressão — fluxo normal sem histórico', () => {
  function simularFiltroEdPedidoExame(
    resultadoMerge: ExamsScheduled[],
  ): ExamsScheduled[] {
    return resultadoMerge.filter((ex) => ex.status === ExamStatus.PENDENTE);
  }

  function simulateUpdateFullDocument(
    dbExams: ExamsScheduled[],
    submittedExams: ExamsScheduled[],
  ): ExamsScheduled[] {
    const examesAtuaisMap = new Map(
      dbExams.map((ex) => [ex.codigoExame, { ...ex }]),
    );
    const codigosParaManter = new Set(submittedExams.map((ex) => ex.codigoExame));
    for (const codigo of examesAtuaisMap.keys()) {
      if (!codigosParaManter.has(codigo)) {
        examesAtuaisMap.delete(codigo);
      }
    }
    for (const exameRecebido of submittedExams) {
      const codigo = exameRecebido.codigoExame;
      if (examesAtuaisMap.has(codigo)) {
        examesAtuaisMap.set(codigo, {
          ...examesAtuaisMap.get(codigo),
          ...exameRecebido,
        });
      } else {
        examesAtuaisMap.set(codigo, exameRecebido);
      }
    }
    return Array.from(examesAtuaisMap.values());
  }

  it('Novo funcionário: apenas PENDENTE, tudo funciona normalmente', () => {
    // Sem exames no banco (novo funcionário)
    const dbExams: ExamsScheduled[] = [];
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];

    const resultadoMerge = executeMergeInteligente(dbExams, socExams, []);
    expect(resultadoMerge.finais).toHaveLength(2);

    const resultadoFiltrado = simularFiltroEdPedidoExame(resultadoMerge.finais);
    expect(resultadoFiltrado).toHaveLength(2); // Todos PENDENTE, nada filtrado

    const resultadoFinal = simulateUpdateFullDocument(dbExams, resultadoFiltrado);
    expect(resultadoFinal).toHaveLength(2);
  });

  it('Funcionário retorna no mesmo dia: PENDENTE preservados', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
    ];
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
    ];

    const resultadoMerge = executeMergeInteligente(dbExams, socExams, []);
    const resultadoFiltrado = simularFiltroEdPedidoExame(resultadoMerge.finais);

    expect(resultadoFiltrado).toHaveLength(1);
    expect(resultadoFiltrado[0].status).toBe(ExamStatus.PENDENTE);

    const resultadoFinal = simulateUpdateFullDocument(dbExams, resultadoFiltrado);
    expect(resultadoFinal).toHaveLength(1);
  });

  it('Exame foi para EM_ATENDIMENTO (não é PENDENTE nem FINALIZADO)', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
    ];
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
    ];

    // Merge preserva o PENDENTE
    const resultadoMerge = executeMergeInteligente(dbExams, socExams, []);

    // Simula que entre o merge e o submit, o exame foi para EM_ATENDIMENTO
    // (ex: recepção lançou, mas o atendente ainda não finalizou)
    const resultadoComStatus = resultadoMerge.finais.map((e) =>
      e.codigoExame === '0281'
        ? { ...e, status: 'EM_ATENDIMENTO' as any }
        : e,
    );

    // Filtro PENDENTE remove EM_ATENDIMENTO
    const resultadoFiltrado = simularFiltroEdPedidoExame(resultadoComStatus);
    expect(resultadoFiltrado).toHaveLength(0); // ← EM_ATENDIMENTO também é removido!

    // updateFullDocument remove do banco
    const resultadoFinal = simulateUpdateFullDocument(dbExams, resultadoFiltrado);
    expect(resultadoFinal).toHaveLength(0); // ← Exame EM_ATENDIMENTO deletado!
  });

  it('Submit contém todos os exames: nenhum removido', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    // Frontend envia TODOS (cenário理想理想理想 ideal ideal ideal ideal)
    const submitted = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];

    const resultadoFinal = simulateUpdateFullDocument(dbExams, submitted);
    expect(resultadoFinal).toHaveLength(2);
    expect(resultadoFinal.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
  });
});

// ============================================================
// Grupo 5: Sincronizar SOC (referência — fluxo correto)
// ============================================================

describe('Grupo 5: Sincronizar SOC — fluxo de referência (sem filtro)', () => {
  function simulateUpdateFullDocument(
    dbExams: ExamsScheduled[],
    submittedExams: ExamsScheduled[],
  ): ExamsScheduled[] {
    const examesAtuaisMap = new Map(
      dbExams.map((ex) => [ex.codigoExame, { ...ex }]),
    );
    const codigosParaManter = new Set(submittedExams.map((ex) => ex.codigoExame));
    for (const codigo of examesAtuaisMap.keys()) {
      if (!codigosParaManter.has(codigo)) {
        examesAtuaisMap.delete(codigo);
      }
    }
    for (const exameRecebido of submittedExams) {
      const codigo = exameRecebido.codigoExame;
      if (examesAtuaisMap.has(codigo)) {
        examesAtuaisMap.set(codigo, {
          ...examesAtuaisMap.get(codigo),
          ...exameRecebido,
        });
      } else {
        examesAtuaisMap.set(codigo, exameRecebido);
      }
    }
    return Array.from(examesAtuaisMap.values());
  }

  it('Sincronizar SOC: merge preserva FINALIZADO, todos enviados no submit', () => {
    // Documento no banco com exames de 01/07
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
    ];

    // SOC retorna os mesmos exames
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];

    // Merge preserva
    const resultadoMerge = executeMergeInteligente(dbExams, socExams, []);
    expect(resultadoMerge.finais).toHaveLength(2);
    expect(resultadoMerge.finais[0].status).toBe(ExamStatus.FINALIZADO);
    expect(resultadoMerge.finais[1].status).toBe(ExamStatus.AGUARDANDO_RESULTADO);

    // NO Sincronizar SOC: NÃO tem filtro PENDENTE
    // O resultado do merge é enviado diretamente ao updateFullDocument
    const resultadoFinal = simulateUpdateFullDocument(dbExams, resultadoMerge.finais);
    expect(resultadoFinal).toHaveLength(2);
    expect(resultadoFinal[0].status).toBe(ExamStatus.FINALIZADO);
    expect(resultadoFinal[1].status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
  });
});
