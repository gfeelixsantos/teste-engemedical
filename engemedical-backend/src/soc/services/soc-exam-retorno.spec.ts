/**
 * Testes: Retorno do paciente em nova data (20/07 -> 27/07 -> perdia exames)
 *
 * Cenário real: Paciente atende 20/07/2026 (exames FINALIZADO),
 * retorna 27/07/2026 para Hemoglobina glicada (mesmo SEQUENCIAFICHA).
 * Os exames de 20/07 estavam sendo perdidos.
 *
 * Cadeia do bug (ANTES DA CORREÇÃO):
 * 1. EdPedidoExame filtra DATAEXAME === dataFim -> só retorna pedidos de hoje
 * 2. handleUpdates CENÁRIO 1 (merge) funciona -> preserva FINALIZADO
 * 3. Frontend preencherFormulario -> processa todos os exames (inclui FINALIZADO)
 * 4. Frontend handleSubmit envia payload -> updateFullDocument remove não submetidos
 * 5. updateFullDocument remove FINALIZADO/AGUARDANDO_RESULTADO do banco
 */
import { ExamStatus, AtendimentoStatus } from 'src/mongo/enum/scheduling.enum';
import { ExamsScheduled, SchedulingDocument } from 'src/mongo/types/scheduling';
import { PedidoExame } from 'src/soc/types/PedidoExame';
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
    DATAFICHA: '27/07/2026',
    CODIGOTUSSEXAME: '',
    CODIGOEXAMEAMB: '',
    CODIGOINTERNOEXAME: '0999',
    NOMEEXAME: 'HEMOGLOBINA GLICADA',
    DATAEXAME: '27/07/2026',
    RISCOSFUNCIONARIO: '',
    RISCOSASO: '',
    DATANASCIMENTO: '01/01/1990',
    CODIGORH: '',
    ...overrides,
  };
}

// ============================================================
// Simulated functions
// ============================================================

/**
 * Simula updateFullDocument (mongo.service.ts:5526-5531) - versão BUG
 * Remove qualquer exame ausente do submit, inclusive FINALIZADO.
 */
function simulateUpdateFullDocument_BUG(
  dbExams: ExamsScheduled[],
  submittedExams: ExamsScheduled[],
): ExamsScheduled[] {
  const examesAtuaisMap = new Map(
    dbExams.map((ex) => [ex.codigoExame, { ...ex }]),
  );
  const codigosParaManter = new Set(
    submittedExams.map((ex) => ex.codigoExame),
  );

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
 * Simula updateFullDocument com a CORREÇÃO
 * NÃO remove exames FINALIZADO ou AGUARDANDO_RESULTADO.
 */
function simulateUpdateFullDocument_FIX(
  dbExams: ExamsScheduled[],
  submittedExams: ExamsScheduled[],
): ExamsScheduled[] {
  const examesAtuaisMap = new Map(
    dbExams.map((ex) => [ex.codigoExame, { ...ex }]),
  );
  const codigosSubmetidos = new Set(
    submittedExams.map((ex) => ex.codigoExame),
  );

  for (const [codigo, exame] of examesAtuaisMap.entries()) {
    if (!codigosSubmetidos.has(codigo)) {
      const isProtegido =
        exame.status === ExamStatus.FINALIZADO ||
        exame.status === ExamStatus.AGUARDANDO_RESULTADO;
      if (!isProtegido) {
        examesAtuaisMap.delete(codigo);
      }
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
 * Simula selecionarExamesParaCopiar (soc-exam.service.ts:282-395)
 */
function simulateSelecionarExamesParaCopiar(
  examesAnteriores: ExamsScheduled[],
  examesNovos: ExamsScheduled[],
  dataFichaAtual: string,
  pedidosFuncionario: PedidoExame[],
): { copiados: ExamsScheduled[]; novos: ExamsScheduled[] } {
  const copiados: ExamsScheduled[] = [];
  const novos: ExamsScheduled[] = [];

  const [dia, mes, ano] = dataFichaAtual.split('/').map(Number);
  const dataFichaDate = new Date(ano, mes - 1, dia);
  dataFichaDate.setHours(0, 0, 0, 0);

  const mapaExamesAnteriores = new Map(
    examesAnteriores.map((ex) => [ex.codigoExame, ex]),
  );
  const mapaPedidos = new Map(
    pedidosFuncionario.map((p) => [p.CODIGOINTERNOEXAME, p]),
  );

  for (const exameNovo of examesNovos) {
    const exameAnterior = mapaExamesAnteriores.get(exameNovo.codigoExame);
    const pedido = mapaPedidos.get(exameNovo.codigoExame);

    if (!exameAnterior || !pedido) {
      novos.push(exameNovo);
      continue;
    }

    const isFinalizado =
      exameAnterior.status === ExamStatus.FINALIZADO ||
      exameAnterior.status === ExamStatus.AGUARDANDO_RESULTADO;

    if (!isFinalizado) {
      novos.push(exameNovo);
      continue;
    }

    if (!pedido.DATAEXAME) {
      novos.push(exameNovo);
      continue;
    }

    const [dE, mE, aE] = pedido.DATAEXAME.split('/').map(Number);
    const dataExame = new Date(aE, mE - 1, dE);
    dataExame.setHours(0, 0, 0, 0);

    if (dataExame < dataFichaDate) {
      copiados.push({ ...exameAnterior });
    } else {
      novos.push(exameNovo);
    }
  }

  return { copiados, novos };
}

/** Simula frontend submit: só envia exames PENDENTE */
function simulateFrontendSubmit(allExams: ExamsScheduled[]): ExamsScheduled[] {
  return allExams.filter((ex) => ex.status === ExamStatus.PENDENTE);
}

/** Fluxo completo: merge -> frontend -> updateFullDocument */
function simulateFullFlow(
  dbExams: ExamsScheduled[],
  socExams: ExamsScheduled[],
  pedidosFuncionario: PedidoExame[],
  dataFichaAtual: string,
  examesFichaAnterior: ExamsScheduled[],
  usarUpdateProtegido: boolean = false,
): ExamsScheduled[] {
  const { copiados, novos } = simulateSelecionarExamesParaCopiar(
    examesFichaAnterior, socExams, dataFichaAtual, pedidosFuncionario,
  );
  const { finais: resultadoMerge } = executeMergeInteligente(dbExams, novos, copiados);
  const submittedExams = simulateFrontendSubmit(resultadoMerge);
  if (usarUpdateProtegido) {
    return simulateUpdateFullDocument_FIX(dbExams, submittedExams);
  } else {
    return simulateUpdateFullDocument_BUG(dbExams, submittedExams);
  }
}

// ============================================================
// Grupo 1: executeMergeInteligente
// ============================================================

describe('Grupo 1: executeMergeInteligente — preservação exames de 20/07 quando SOC retorna 27/07', () => {
  it('preserva exame FINALIZADO de 20/07 quando SOC retorna só 27/07', () => {
    const dbExams = [createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO, url: 'https://resultados/audiometria.pdf' })];
    const socExams = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const { finais, resumo } = executeMergeInteligente(dbExams, socExams, []);
    expect(finais).toHaveLength(2);
    expect(finais.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(finais.find((e) => e.codigoExame === '0999')?.status).toBe(ExamStatus.PENDENTE);
    expect(resumo.preservados).toBe(1);
    expect(resumo.adicionados).toBe(1);
    expect(resumo.removidos).toBe(0);
  });

  it('preserva multiplos FINALIZADO + AGUARDANDO_RESULTADO de 20/07', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
      createExam({ codigoExame: '0283', status: ExamStatus.PENDENTE }),
    ];
    const socExams = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const { finais, resumo } = executeMergeInteligente(dbExams, socExams, []);
    expect(finais).toHaveLength(3);
    expect(finais.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(finais.find((e) => e.codigoExame === '0282')?.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
    expect(finais.find((e) => e.codigoExame === '0999')?.status).toBe(ExamStatus.PENDENTE);
    expect(finais.find((e) => e.codigoExame === '0283')).toBeUndefined();
    expect(resumo.preservados).toBe(2);
    expect(resumo.adicionados).toBe(1);
    expect(resumo.removidos).toBe(1);
  });

  it('preserva exames herdados (copiados de ficha anterior)', () => {
    const dbExams = [createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO })];
    const socExams = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const herdados = [createExam({ codigoExame: '0282', status: ExamStatus.FINALIZADO })];
    const { finais } = executeMergeInteligente(dbExams, socExams, herdados);
    expect(finais).toHaveLength(3);
    expect(finais.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(finais.find((e) => e.codigoExame === '0282')?.status).toBe(ExamStatus.FINALIZADO);
    expect(finais.find((e) => e.codigoExame === '0999')?.status).toBe(ExamStatus.PENDENTE);
  });
});

// ============================================================
// Grupo 2: selecionarExamesParaCopiar
// ============================================================

describe('Grupo 2: selecionarExamesParaCopiar — lógica de cópia', () => {
  it('COPIA quando DATAEXAME(20/07) < dataFicha(27/07) e FINALIZADO', () => {
    const anteriores = [createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO })];
    const novos = [createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '20/07/2026' })];
    const { copiados, novos: pendentes } = simulateSelecionarExamesParaCopiar(anteriores, novos, '27/07/2026', pedidos);
    expect(copiados).toHaveLength(1);
    expect(copiados[0].status).toBe(ExamStatus.FINALIZADO);
    expect(pendentes).toHaveLength(0);
  });

  it('NÃO copia quando DATAEXAME(27/07) >= dataFicha(27/07)', () => {
    const anteriores = [createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO })];
    const novos = [createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '27/07/2026' })];
    const { copiados, novos: pendentes } = simulateSelecionarExamesParaCopiar(anteriores, novos, '27/07/2026', pedidos);
    expect(copiados).toHaveLength(0);
    expect(pendentes).toHaveLength(1);
  });

  it('NÃO copia quando status não é finalizado', () => {
    const anteriores = [createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE })];
    const novos = [createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '20/07/2026' })];
    const { copiados } = simulateSelecionarExamesParaCopiar(anteriores, novos, '27/07/2026', pedidos);
    expect(copiados).toHaveLength(0);
  });

  it('PENDENTE quando exame não existe na ficha anterior', () => {
    const anteriores: ExamsScheduled[] = [];
    const novos = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0999', DATAEXAME: '27/07/2026' })];
    const { copiados, novos: pendentes } = simulateSelecionarExamesParaCopiar(anteriores, novos, '27/07/2026', pedidos);
    expect(copiados).toHaveLength(0);
    expect(pendentes).toHaveLength(1);
  });

  it('PENDENTE quando pedido não tem DATAEXAME', () => {
    const anteriores = [createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO })];
    const novos = [createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '' })];
    const { copiados } = simulateSelecionarExamesParaCopiar(anteriores, novos, '27/07/2026', pedidos);
    expect(copiados).toHaveLength(0);
  });

  it('COPIA AGUARDANDO_RESULTADO quando DATAEXAME < dataFicha', () => {
    const anteriores = [createExam({ codigoExame: '0281', status: ExamStatus.AGUARDANDO_RESULTADO })];
    const novos = [createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '20/07/2026' })];
    const { copiados } = simulateSelecionarExamesParaCopiar(anteriores, novos, '27/07/2026', pedidos);
    expect(copiados[0].status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
  });

  it('Cenario misto: um copiado, um pendente', () => {
    const anteriores = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.FINALIZADO }),
    ];
    const novos = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '20/07/2026' }),
      createPedido({ CODIGOINTERNOEXAME: '0282', DATAEXAME: '27/07/2026' }),
    ];
    const { copiados, novos: pendentes } = simulateSelecionarExamesParaCopiar(anteriores, novos, '27/07/2026', pedidos);
    expect(copiados).toHaveLength(1);
    expect(copiados[0].codigoExame).toBe('0281');
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].codigoExame).toBe('0282');
  });
});

// ============================================================
// Grupo 3: updateFullDocument — proteção
// ============================================================

describe('Grupo 3: updateFullDocument — proteção FINALIZADO', () => {
  it('BUG: remove FINALIZADO não submetido', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const submitted = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const result = simulateUpdateFullDocument_BUG(dbExams, submitted);
    expect(result).toHaveLength(1);
    expect(result[0].codigoExame).toBe('0999');
  });

  it('FIX: NÃO remove FINALIZADO não submetido', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const submitted = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const result = simulateUpdateFullDocument_FIX(dbExams, submitted);
    expect(result).toHaveLength(2);
    expect(result.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
  });

  it('FIX: NÃO remove AGUARDANDO_RESULTADO não submetido', () => {
    const dbExams = [
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const submitted = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const result = simulateUpdateFullDocument_FIX(dbExams, submitted);
    expect(result).toHaveLength(2);
    expect(result.find((e) => e.codigoExame === '0282')?.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
  });

  it('FIX: AINDA remove PENDENTE não submetido', () => {
    const dbExams = [
      createExam({ codigoExame: '0283', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const submitted = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const result = simulateUpdateFullDocument_FIX(dbExams, submitted);
    expect(result).toHaveLength(1);
    expect(result[0].codigoExame).toBe('0999');
  });

  it('FIX: FINALIZADO + PENDENTE misto', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0283', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const submitted = [
      createExam({ codigoExame: '0283', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const result = simulateUpdateFullDocument_FIX(dbExams, submitted);
    expect(result).toHaveLength(3);
    expect(result.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
  });

  it('FIX: adiciona novo exame', () => {
    const dbExams = [createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO })];
    const submitted = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const result = simulateUpdateFullDocument_FIX(dbExams, submitted);
    expect(result.find((e) => e.codigoExame === '0999')).toBeDefined();
  });
});

// ============================================================
// Grupo 4: Fluxo completo — BUG vs FIX
// ============================================================

describe('Grupo 4: Fluxo completo — merge + frontend + update', () => {
  it('BUG: merge preserva mas updateFullDocument remove FINALIZADO', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '20/07/2026' }),
      createPedido({ CODIGOINTERNOEXAME: '0282', DATAEXAME: '27/07/2026' }),
      createPedido({ CODIGOINTERNOEXAME: '0999', DATAEXAME: '27/07/2026' }),
    ];
    const resultado = simulateFullFlow(dbExams, socExams, pedidos, '27/07/2026', dbExams, false);
    expect(resultado.find((e) => e.codigoExame === '0281')).toBeUndefined();
  });

  it('FIX: merge preserva + updateFullDocument protege FINALIZADO', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '20/07/2026' }),
      createPedido({ CODIGOINTERNOEXAME: '0282', DATAEXAME: '27/07/2026' }),
      createPedido({ CODIGOINTERNOEXAME: '0999', DATAEXAME: '27/07/2026' }),
    ];
    const resultado = simulateFullFlow(dbExams, socExams, pedidos, '27/07/2026', dbExams, true);
    expect(resultado.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(resultado).toHaveLength(3);
  });

  it('FIX: AGUARDANDO_RESULTADO + FINALIZADO ambos preservados', () => {
    const dbExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '0282', status: ExamStatus.AGUARDANDO_RESULTADO }),
    ];
    const socExams = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0999', DATAEXAME: '27/07/2026' })];
    const resultado = simulateFullFlow(dbExams, socExams, pedidos, '27/07/2026', dbExams, true);
    expect(resultado).toHaveLength(3);
    expect(resultado.find((e) => e.codigoExame === '0281')?.status).toBe(ExamStatus.FINALIZADO);
    expect(resultado.find((e) => e.codigoExame === '0282')?.status).toBe(ExamStatus.AGUARDANDO_RESULTADO);
  });

  it('primeira vez do paciente: fluxo normal', () => {
    const socExams = [
      createExam({ codigoExame: '0281', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0282', status: ExamStatus.PENDENTE }),
    ];
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '0281', DATAEXAME: '27/07/2026' }),
      createPedido({ CODIGOINTERNOEXAME: '0282', DATAEXAME: '27/07/2026' }),
    ];
    const resultado = simulateFullFlow([], socExams, pedidos, '27/07/2026', [], true);
    expect(resultado).toHaveLength(2);
    expect(resultado.every((e) => e.status === ExamStatus.PENDENTE)).toBe(true);
  });
});

// ============================================================
// Grupo 5: Cenário real completo
// ============================================================

describe('Grupo 5: Cenário real — 20/07 parcial → 27/07 retorno', () => {
  it('BUG: exames FINALIZADO de 20/07 sao perdidos no retorno 27/07', () => {
    const dbExams = [
      createExam({ codigoExame: '1931', nomeExame: 'AUDIOMETRIA', status: ExamStatus.FINALIZADO, url: 'https://resultados/audiometria.pdf' }),
      createExam({ codigoExame: '2110', nomeExame: 'EXAME CLINICO', status: ExamStatus.FINALIZADO }),
    ];
    const socExams = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0999', DATAEXAME: '27/07/2026' })];
    const resultado = simulateFullFlow(dbExams, socExams, pedidos, '27/07/2026', dbExams, false);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].codigoExame).toBe('0999');
    expect(resultado.find((e) => e.codigoExame === '1931')).toBeUndefined();
    expect(resultado.find((e) => e.codigoExame === '2110')).toBeUndefined();
  });

  it('FIX: exames FINALIZADO de 20/07 preservados no retorno 27/07', () => {
    const dbExams = [
      createExam({ codigoExame: '1931', nomeExame: 'AUDIOMETRIA', status: ExamStatus.FINALIZADO, url: 'https://resultados/audiometria.pdf' }),
      createExam({ codigoExame: '2110', nomeExame: 'EXAME CLINICO', status: ExamStatus.FINALIZADO }),
    ];
    const socExams = [createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE })];
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '0999', DATAEXAME: '27/07/2026' })];
    const resultado = simulateFullFlow(dbExams, socExams, pedidos, '27/07/2026', dbExams, true);
    expect(resultado).toHaveLength(3);
    expect(resultado.find((e) => e.codigoExame === '1931')?.status).toBe(ExamStatus.FINALIZADO);
    expect(resultado.find((e) => e.codigoExame === '2110')?.status).toBe(ExamStatus.FINALIZADO);
    expect(resultado.find((e) => e.codigoExame === '0999')?.status).toBe(ExamStatus.PENDENTE);
  });

it('FIX: cenário integrado completo', () => {
    const dbExams = [
      createExam({ codigoExame: '1931', nomeExame: 'AUDIOMETRIA', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '2110', nomeExame: 'EXAME CLINICO', status: ExamStatus.FINALIZADO }),
      createExam({ codigoExame: '1645', nomeExame: 'TRIAGEM AUDITIVA', status: ExamStatus.PENDENTE }),
    ];
    const socExams = [
      createExam({ codigoExame: '1931', nomeExame: 'AUDIOMETRIA', status: ExamStatus.PENDENTE }),
      createExam({ codigoExame: '0999', nomeExame: 'HEMOGLOBINA GLICADA', status: ExamStatus.PENDENTE }),
    ];
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '1931', DATAEXAME: '20/07/2026' }),
      createPedido({ CODIGOINTERNOEXAME: '0999', DATAEXAME: '27/07/2026' }),
    ];
    const resultado = simulateFullFlow(dbExams, socExams, pedidos, '27/07/2026', dbExams, true);
    expect(resultado).toHaveLength(3);
    expect(resultado.find((e) => e.codigoExame === '1931')?.status).toBe(ExamStatus.FINALIZADO);
    expect(resultado.find((e) => e.codigoExame === '2110')?.status).toBe(ExamStatus.FINALIZADO);
    expect(resultado.find((e) => e.codigoExame === '0999')?.status).toBe(ExamStatus.PENDENTE);
    expect(resultado.find((e) => e.codigoExame === '1645')).toBeUndefined();
  });
});

// ============================================================
// Grupo 6: Retorno em outra data → NOVO documento + ANEXOS
// (Nova estratégia da recepção via handleUpdates)
// ============================================================

type RetornoAnexos = {
  isRetorno: boolean;
  anexos: { name: string; storagePath: string }[];
};

/**
 * Simula a detecção de retorno em outra data + conversão de laudos para ANEXOS
 * (soc-exam.service.ts handleUpdates CENÁRIO 2 - retorno).
 * - agendamentoDestaData: true quando existe CODIGOPRONTUARIO (mesma data)
 * - retornoOutraData: documento com a MESMA SEQUENCIAFICHA porém CODIGOPRONTUARIO diferente
 */
function simulateRetornoEmOutraDataEConverterAnexos(
  agendamentoDestaData: boolean,
  retornoOutraData: boolean,
  examesFichaAnterior: ExamsScheduled[],
): RetornoAnexos {
  // Reproduz a prioridade da lógica real: retorno só é considerado
  // quando NÃO há documento desta data E a SEQUENCIAFICHA casa com outra data.
  const isRetorno = !agendamentoDestaData && retornoOutraData;

  if (!isRetorno) {
    return { isRetorno, anexos: [] };
  }

  // converterExamesFinalizadosEmAnexos: só exames com url + FINALIZADO/AGUARDANDO
  const anexos = examesFichaAnterior
    .filter((ex) => {
      const url = String(ex.url || '').trim();
      if (!url) return false;
      return (
        ex.status === ExamStatus.FINALIZADO ||
        ex.status === ExamStatus.AGUARDANDO_RESULTADO
      );
    })
    .map((ex) => ({
      name: ex.nomeExame || ex.codigoExame,
      storagePath: ex.url!,
    }));

  return { isRetorno, anexos };
}

describe('Grupo 6: Retorno em outra data -> NOVO documento + ANEXOS', () => {
  it('cria documento novo (EXAMES só do dia) e move laudos para ANEXOS', () => {
    const examesFicha20 = [
      createExam({ codigoExame: '1931', nomeExame: 'AUDIOMETRIA', status: ExamStatus.FINALIZADO, url: 'https://resultados/audiometria.pdf' }),
      createExam({ codigoExame: '2110', nomeExame: 'EXAME CLINICO', status: ExamStatus.FINALIZADO, url: 'https://resultados/exameclinico.pdf' }),
    ];
    // datas diferentes: NÃO há doc desta data, mas SEQUENCIAFICHA casou com data 20/07
    const { isRetorno, anexos } = simulateRetornoEmOutraDataEConverterAnexos(
      false, // agendamentoDestaData
      true, // retornoOutraData
      examesFicha20,
    );
    expect(isRetorno).toBe(true);
    expect(anexos).toHaveLength(2);
    expect(anexos[0].storagePath).toBe('https://resultados/audiometria.pdf');
    expect(anexos[0].name).toBe('AUDIOMETRIA');
  });

  it('NÃO converte pendente sem url em anexo', () => {
    const examesFicha = [
      createExam({ codigoExame: '1645', nomeExame: 'TRIAGEM AUDITIVA', status: ExamStatus.PENDENTE, url: '' }),
      createExam({ codigoExame: '1931', nomeExame: 'AUDIOMETRIA', status: ExamStatus.FINALIZADO, url: 'https://resultados/audiometria.pdf' }),
    ];
    const { isRetorno, anexos } = simulateRetornoEmOutraDataEConverterAnexos(false, true, examesFicha);
    expect(isRetorno).toBe(true);
    expect(anexos).toHaveLength(1);
    expect(anexos[0].name).toBe('AUDIOMETRIA');
  });

  it('NÃO ativa retorno quando existe documento da mesma data (mantém merge)', () => {
    const examesFicha = [
      createExam({ codigoExame: '1931', nomeExame: 'AUDIOMETRIA', status: ExamStatus.FINALIZADO, url: 'https://resultados/audiometria.pdf' }),
    ];
    const { isRetorno, anexos } = simulateRetornoEmOutraDataEConverterAnexos(true, true, examesFicha);
    expect(isRetorno).toBe(false);
    expect(anexos).toHaveLength(0);
  });

  it('NÃO ativa retorno quando a SEQUENCIAFICHA não casa com outra data', () => {
    const examesFicha = [
      createExam({ codigoExame: '1931', nomeExame: 'AUDIOMETRIA', status: ExamStatus.FINALIZADO, url: 'https://resultados/audiometria.pdf' }),
    ];
    const { isRetorno, anexos } = simulateRetornoEmOutraDataEConverterAnexos(false, false, examesFicha);
    expect(isRetorno).toBe(false);
    expect(anexos).toHaveLength(0);
  });

  it('AGUARDANDO_RESULTADO com url também vira anexo', () => {
    const examesFicha = [
      createExam({ codigoExame: '0543', nomeExame: 'HEMOGRAMA', status: ExamStatus.AGUARDANDO_RESULTADO, url: 'https://resultados/hemograma.pdf' }),
    ];
    const { isRetorno, anexos } = simulateRetornoEmOutraDataEConverterAnexos(false, true, examesFicha);
    expect(isRetorno).toBe(true);
    expect(anexos).toHaveLength(1);
    expect(anexos[0].storagePath).toBe('https://resultados/hemograma.pdf');
  });
});
