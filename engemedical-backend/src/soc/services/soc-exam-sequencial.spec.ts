/**
 * Testes: Fluxo do sequencialResultadoExame
 *
 * Rastreia a origem e preservação do campo sequencialResultadoExame
 * desde a REST API do SOC (handleExamScheduled) até o merge e
 * updateFullDocument, usando dados do caso real da
 * VALQUIRIA DOS SANTOS FERRO MOREIRA
 * (scheduling 387497-1686-5-23072026).
 */
import { ExamStatus, AtendimentoStatus } from 'src/mongo/enum/scheduling.enum';
import { ExamsScheduled, SchedulingDocument } from 'src/mongo/types/scheduling';
import { PedidoExame } from 'src/soc/types/PedidoExame';
import { PedidoExameSequencialFicha } from 'src/soc/types/PedidoExameSequencialFicha';
import { executeMergeInteligente } from 'src/utils/merge-engine';

// ============================================================
// Helpers
// ============================================================

function createExam(partial: Partial<ExamsScheduled>): ExamsScheduled {
  return {
    codigoExame: partial.codigoExame || '1931',
    nomeExame: partial.nomeExame || 'AUDIOMETRIA',
    status: partial.status || ExamStatus.PENDENTE,
    dataExame: partial.dataExame ?? null,
    sequencialResultadoExame: partial.sequencialResultadoExame ?? '',
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
    NOMEEMPRESA: 'RUY R. DA ROCHA',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    CEIEMPRESA: '',
    SUBGRUPOEMPRESA: '',
    SEQUENCIAFICHA: '365004541',
    CODIGOFUNCIONARIO: '1686',
    NOMEFUNCIONARIO: 'VALQUIRIA DOS SANTOS FERRO MOREIRA',
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
    DATAFICHA: '23/07/2026',
    CODIGOTUSSEXAME: '',
    CODIGOEXAMEAMB: '',
    CODIGOINTERNOEXAME: '1931',
    NOMEEXAME: 'AUDIOMETRIA',
    DATAEXAME: '23/07/2026',
    RISCOSFUNCIONARIO: '',
    RISCOSASO: '',
    DATANASCIMENTO: '01/01/1990',
    CODIGORH: '',
    ...overrides,
  };
}

function createSequencialFicha(
  overrides: Partial<PedidoExameSequencialFicha> = {},
): PedidoExameSequencialFicha {
  return {
    CODIGOEXAME: '1931',
    SEQUENCIALRESULTADO: '123456',
    NOMEEXAME: 'AUDIOMETRIA',
    ...overrides,
  };
}

/**
 * Simula handleExamScheduled (soc-exam.service.ts:41-134)
 *
 * Lógica central: busca codigosSequenciaisResultados via REST API SOC,
 * faz match por CODIGOEXAME === CODIGOINTERNOEXAME,
 * retorna exames com sequencialResultadoExame mapeado.
 */
function simulateHandleExamScheduled(
  pedidos: PedidoExame[],
  sequenciais: PedidoExameSequencialFicha[],
): ExamsScheduled[] {
  if (!pedidos || pedidos.length === 0) return [];

  const results: ExamsScheduled[] = [];

  for (const item of pedidos) {
    if (item.CODIGOINTERNOEXAME === 'EXM1') continue;

    const hasCode = sequenciais.find(
      (c) => c.CODIGOEXAME === item.CODIGOINTERNOEXAME,
    )?.SEQUENCIALRESULTADO;

    const exame: ExamsScheduled = {
      codigoExame: item.CODIGOINTERNOEXAME,
      nomeExame: item.NOMEEXAME,
      status: ExamStatus.PENDENTE,
      dataExame: null,
      preparacao: '',
      profissional: '',
      sala: '',
      sequencialResultadoExame: hasCode ?? '',
      url: '',
      grupo: null,
    };

    results.push(exame);
  }

  return results;
}

/**
 * Simula updateFullDocument (mongo.service.ts:5500-5571)
 *
 * Lógica central: mergeia exames do banco com exames submetidos,
 * usando spread {...dbExam, ...exameRecebido}.
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

// ============================================================
// Grupo 1: handleExamScheduled — mapeamento REST API SOC
// ============================================================

describe('Grupo 1: handleExamScheduled — mapeamento sequencial via REST API SOC', () => {
  it('popula sequencialResultadoExame quando CODIGOEXAME casa com CODIGOINTERNOEXAME', () => {
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '1931', NOMEEXAME: 'AUDIOMETRIA' }),
      createPedido({ CODIGOINTERNOEXAME: '1932', NOMEEXAME: 'EXAME CLINICO' }),
    ];
    const sequenciais = [
      createSequencialFicha({ CODIGOEXAME: '1931', SEQUENCIALRESULTADO: '100001' }),
      createSequencialFicha({ CODIGOEXAME: '1932', SEQUENCIALRESULTADO: '100002' }),
    ];

    const exames = simulateHandleExamScheduled(pedidos, sequenciais);

    expect(exames).toHaveLength(2);
    expect(exames.find((e) => e.codigoExame === '1931')?.sequencialResultadoExame).toBe('100001');
    expect(exames.find((e) => e.codigoExame === '1932')?.sequencialResultadoExame).toBe('100002');
  });

  it('deixa sequencialResultadoExame vazio quando a REST API retorna array vazio', () => {
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '1931' })];
    const sequenciais: PedidoExameSequencialFicha[] = [];

    const exames = simulateHandleExamScheduled(pedidos, sequenciais);

    expect(exames).toHaveLength(1);
    expect(exames[0].sequencialResultadoExame).toBe('');
  });

  it('deixa sequencialResultadoExame vazio quando CODIGOEXAME nao casa com CODIGOINTERNOEXAME', () => {
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '1931' })];
    const sequenciais = [
      createSequencialFicha({ CODIGOEXAME: '9999', SEQUENCIALRESULTADO: '100001' }),
      createSequencialFicha({ CODIGOEXAME: '8888', SEQUENCIALRESULTADO: '100002' }),
    ];

    const exames = simulateHandleExamScheduled(pedidos, sequenciais);

    expect(exames).toHaveLength(1);
    expect(exames[0].sequencialResultadoExame).toBe('');
  });

  it('popula apenas exames que casam, deixa vazio os que nao casam', () => {
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '1931', NOMEEXAME: 'AUDIOMETRIA' }),
      createPedido({ CODIGOINTERNOEXAME: '8888', NOMEEXAME: 'EXAME CLINICO' }),
    ];
    const sequenciais = [
      createSequencialFicha({ CODIGOEXAME: '1931', SEQUENCIALRESULTADO: '100001' }),
    ];

    const exames = simulateHandleExamScheduled(pedidos, sequenciais);

    expect(exames).toHaveLength(2);
    expect(exames.find((e) => e.codigoExame === '1931')?.sequencialResultadoExame).toBe('100001');
    expect(exames.find((e) => e.codigoExame === '8888')?.sequencialResultadoExame).toBe('');
  });

  it('popula com SEQUENCIALRESULTADO undefined se o campo nao existe no retorno da API', () => {
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: '1931' })];
    const sequenciais = [
      { CODIGOEXAME: '1931' } as PedidoExameSequencialFicha, // sem SEQUENCIALRESULTADO
    ];

    const exames = simulateHandleExamScheduled(pedidos, sequenciais);

    expect(exames).toHaveLength(1);
    expect(exames[0].sequencialResultadoExame).toBe('');
  });

  it('ignora CODIGOINTERNOEXAME = EXM1 (exame mestre)', () => {
    const pedidos = [createPedido({ CODIGOINTERNOEXAME: 'EXM1' })];

    const exames = simulateHandleExamScheduled(pedidos, []);

    expect(exames).toHaveLength(0);
  });

  it('retorna array vazio para pedidos vazios', () => {
    const exames = simulateHandleExamScheduled([], []);
    expect(exames).toEqual([]);
  });

  it('simula dados reais da VALQUIRIA: 3 exames com codigos que podem ou nao casar', () => {
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '1931', NOMEEXAME: 'AUDIOMETRIA' }),
      createPedido({ CODIGOINTERNOEXAME: '2110', NOMEEXAME: 'EXAME CLINICO' }),
      createPedido({ CODIGOINTERNOEXAME: '1645', NOMEEXAME: 'TRIAGEM AUDITIVA' }),
    ];
    // Simula REST API que retorna apenas 2 dos 3 codigos
    const sequenciais = [
      createSequencialFicha({ CODIGOEXAME: '1931', SEQUENCIALRESULTADO: '500001' }),
      createSequencialFicha({ CODIGOEXAME: '1645', SEQUENCIALRESULTADO: '500003' }),
    ];

    const exames = simulateHandleExamScheduled(pedidos, sequenciais);

    expect(exames).toHaveLength(3);
    expect(exames.find((e) => e.codigoExame === '1931')?.sequencialResultadoExame).toBe('500001');
    expect(exames.find((e) => e.codigoExame === '2110')?.sequencialResultadoExame).toBe('');
    expect(exames.find((e) => e.codigoExame === '1645')?.sequencialResultadoExame).toBe('500003');
  });
});

// ============================================================
// Grupo 2: executeMergeInteligente — preservação do campo
// ============================================================

describe('Grupo 2: executeMergeInteligente — preservação de sequencialResultadoExame', () => {
  it('preserva sequencialResultadoExame do DB quando exame ja existe e SOC retorna o mesmo valor', () => {
    const dbExam = createExam({
      codigoExame: '1931',
      status: ExamStatus.FINALIZADO,
      sequencialResultadoExame: '100001',
      url: 'https://resultados/exame.pdf',
    });
    const socExam = createExam({
      codigoExame: '1931',
      status: ExamStatus.PENDENTE,
      sequencialResultadoExame: '100001',
    });

    const { finais } = executeMergeInteligente([dbExam], [socExam], []);

    expect(finais).toHaveLength(1);
    expect(finais[0].sequencialResultadoExame).toBe('100001');
    expect(finais[0].status).toBe(ExamStatus.FINALIZADO);
  });

  it('preserva sequencialResultadoExame do DB quando SOC retorna vazio (caso critico)', () => {
    const dbExam = createExam({
      codigoExame: '1931',
      status: ExamStatus.FINALIZADO,
      sequencialResultadoExame: '100001',
      url: 'https://resultados/exame.pdf',
    });
    const socExam = createExam({
      codigoExame: '1931',
      status: ExamStatus.PENDENTE,
      sequencialResultadoExame: '',
    });

    const { finais } = executeMergeInteligente([dbExam], [socExam], []);

    // Merge preserva dbExam com spread, entao sequencialResultadoExame = '100001'
    expect(finais).toHaveLength(1);
    expect(finais[0].sequencialResultadoExame).toBe('100001');
    expect(finais[0].status).toBe(ExamStatus.FINALIZADO);
  });

  it('preserva sequencialResultadoExame do DB quando SOC retorna sequencial diferente', () => {
    const dbExam = createExam({
      codigoExame: '1931',
      status: ExamStatus.FINALIZADO,
      sequencialResultadoExame: '100001',
    });
    const socExam = createExam({
      codigoExame: '1931',
      status: ExamStatus.PENDENTE,
      sequencialResultadoExame: '999999',
    });

    const { finais } = executeMergeInteligente([dbExam], [socExam], []);

    // Merge preserva dbExam, entao sequencialResultadoExame = '100001' (do banco)
    expect(finais[0].sequencialResultadoExame).toBe('100001');
  });

  it('usa sequencialResultadoExame do SOC para exame NOVO (não existente no DB)', () => {
    const dbExam = createExam({
      codigoExame: '1931',
      status: ExamStatus.FINALIZADO,
      sequencialResultadoExame: '100001',
    });
    const socExam = createExam({
      codigoExame: '2110',
      nomeExame: 'EXAME CLINICO',
      status: ExamStatus.PENDENTE,
      sequencialResultadoExame: '200002',
    });

    const { finais } = executeMergeInteligente([dbExam], [socExam], []);

    expect(finais).toHaveLength(2);
    const novoExame = finais.find((e) => e.codigoExame === '2110');
    expect(novoExame?.sequencialResultadoExame).toBe('200002');
    expect(novoExame?.status).toBe(ExamStatus.PENDENTE);
  });

  it('novo exame SEM sequencial (vindo da REST API sem match) fica com string vazia', () => {
    const dbExam = createExam({
      codigoExame: '1931',
      status: ExamStatus.FINALIZADO,
      sequencialResultadoExame: '100001',
    });
    const socExam = createExam({
      codigoExame: '2110',
      nomeExame: 'EXAME CLINICO',
      status: ExamStatus.PENDENTE,
      sequencialResultadoExame: '',
    });

    const { finais } = executeMergeInteligente([dbExam], [socExam], []);

    const novoExame = finais.find((e) => e.codigoExame === '2110');
    expect(novoExame?.sequencialResultadoExame).toBe('');
  });

  it('preserva sequencialResultadoExame em exames herdados (copiados de ficha anterior)', () => {
    const herdado = createExam({
      codigoExame: '1931',
      status: ExamStatus.FINALIZADO,
      sequencialResultadoExame: '100001',
    });
    const socExam = createExam({
      codigoExame: '2110',
      nomeExame: 'EXAME CLINICO',
      status: ExamStatus.PENDENTE,
      sequencialResultadoExame: '200002',
    });

    // Herdados entram no baseMap primeiro, depois DB (vazio)
    const { finais } = executeMergeInteligente([], [socExam], [herdado]);

    expect(finais.find((e) => e.codigoExame === '1931')?.sequencialResultadoExame).toBe('100001');
    expect(finais.find((e) => e.codigoExame === '2110')?.sequencialResultadoExame).toBe('200002');
  });
});

// ============================================================
// Grupo 3: updateFullDocument — spread NÃO perde o campo
// ============================================================

describe('Grupo 3: updateFullDocument — spread { ...dbExam, ...exameRecebido }', () => {
  it('preserva sequencialResultadoExame do DB quando frontend nao envia o campo (undefined)', () => {
    const dbExams = [
      createExam({
        codigoExame: '1931',
        status: ExamStatus.FINALIZADO,
        sequencialResultadoExame: '100001',
      }),
    ];
    // Frontend nao envia sequencialResultadoExame (projection: 0)
    const submitted = [
      createExam({ codigoExame: '1931', status: ExamStatus.FINALIZADO }),
    ];
    // Remove explicitamente para simular que o campo nao existe no payload
    delete (submitted[0] as any).sequencialResultadoExame;

    const result = simulateUpdateFullDocument(dbExams, submitted);

    expect(result).toHaveLength(1);
    expect((result[0] as any).sequencialResultadoExame).toBe('100001');
  });

  it('SOBRESCREVE sequencialResultadoExame do DB quando objeto JS tem a key explicitamente como undefined (spread behavior)', () => {
    const dbExams = [
      createExam({
        codigoExame: '1931',
        status: ExamStatus.FINALIZADO,
        sequencialResultadoExame: '100001',
      }),
    ];
    const submitted = [
      createExam({ codigoExame: '1931', status: ExamStatus.FINALIZADO }),
    ];
    submitted[0].sequencialResultadoExame = undefined;

    const result = simulateUpdateFullDocument(dbExams, submitted);

    // Spread {...dbExam, ...exameRecebido} com key = undefined SOBRESCREVE
    // Nota: no mundo real, JSON parse nao produz undefined explícito —
    // a key simplesmente nao existe no objeto parseado.
    expect(result).toHaveLength(1);
    expect(result[0].sequencialResultadoExame).toBeUndefined();
  });

  it('SOBRESCREVE sequencialResultadoExame do DB quando frontend envia string vazia', () => {
    const dbExams = [
      createExam({
        codigoExame: '1931',
        status: ExamStatus.FINALIZADO,
        sequencialResultadoExame: '100001',
      }),
    ];
    const submitted = [
      createExam({
        codigoExame: '1931',
        status: ExamStatus.FINALIZADO,
        sequencialResultadoExame: '',
      }),
    ];

    const result = simulateUpdateFullDocument(dbExams, submitted);

    // Spread {...dbExam, ...exameRecebido} sobrescreve com ""
    expect(result).toHaveLength(1);
    expect(result[0].sequencialResultadoExame).toBe('');
  });

  it('remove exame FINALIZADO junto com seu sequencial se nao veio no submit', () => {
    const dbExams = [
      createExam({
        codigoExame: '1931',
        status: ExamStatus.FINALIZADO,
        sequencialResultadoExame: '100001',
      }),
      createExam({
        codigoExame: '2110',
        status: ExamStatus.PENDENTE,
        sequencialResultadoExame: '',
      }),
    ];
    const submitted = [
      createExam({ codigoExame: '2110', status: ExamStatus.PENDENTE }),
    ];
    delete (submitted[0] as any).sequencialResultadoExame;

    const result = simulateUpdateFullDocument(dbExams, submitted);

    expect(result).toHaveLength(1);
    expect(result[0].codigoExame).toBe('2110');
    // Exame FINALIZADO com sequencial 100001 foi removido
  });

  it('preserva sequencial quando submit contem todos os exames com campos minimos', () => {
    const dbExams = [
      createExam({
        codigoExame: '1931',
        status: ExamStatus.FINALIZADO,
        sequencialResultadoExame: '100001',
      }),
      createExam({
        codigoExame: '2110',
        status: ExamStatus.PENDENTE,
        sequencialResultadoExame: '',
      }),
    ];
    // Submit tem apenas campos que o frontend envia (sem sequencial)
    const submitted = [
      { codigoExame: '1931', status: ExamStatus.PENDENTE, grupo: 'Audiometria' },
      { codigoExame: '2110', status: ExamStatus.PENDENTE, grupo: 'Clinico' },
    ] as ExamsScheduled[];

    const result = simulateUpdateFullDocument(dbExams, submitted);

    expect(result).toHaveLength(2);
    expect(result.find((e) => e.codigoExame === '1931')?.sequencialResultadoExame).toBe('100001');
    expect(result.find((e) => e.codigoExame === '2110')?.sequencialResultadoExame).toBe('');
  });
});

// ============================================================
// Grupo 4: Fluxo completo — handleExamScheduled → merge → updateFullDocument
// ============================================================

describe('Grupo 4: Fluxo completo — REST API → merge → submit', () => {
  /**
   * Cenário A: REST API retorna TODOS os sequenciais
   * Fluxo normal: handleExamScheduled popula, merge preserva,
   * updateFullDocument mantém.
   */
  it('Cenario A: REST API retorna todos sequenciais — campo preservado ate o final', () => {
    // 1. SOC retorna pedidos com 3 exames
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '1931', NOMEEXAME: 'AUDIOMETRIA' }),
      createPedido({ CODIGOINTERNOEXAME: '2110', NOMEEXAME: 'EXAME CLINICO' }),
    ];

    // 2. REST API retorna match para todos
    const sequenciais = [
      createSequencialFicha({ CODIGOEXAME: '1931', SEQUENCIALRESULTADO: '500001' }),
      createSequencialFicha({ CODIGOEXAME: '2110', SEQUENCIALRESULTADO: '500002' }),
    ];

    // 3. handleExamScheduled mapeia
    const examesNovos = simulateHandleExamScheduled(pedidos, sequenciais);
    expect(examesNovos.every((e) => e.sequencialResultadoExame !== '')).toBe(true);

    // 4. merge em documento vazio
    const { finais: resultadoMerge } = executeMergeInteligente([], examesNovos, []);
    expect(resultadoMerge.every((e) => e.sequencialResultadoExame !== '')).toBe(true);

    // 5. updateFullDocument com submit completo (frontend sem o campo)
    const submitted = resultadoMerge.map((e) => {
      const s = { ...e };
      delete (s as any).sequencialResultadoExame;
      return s;
    });
    const resultadoFinal = simulateUpdateFullDocument(resultadoMerge, submitted);
    expect(resultadoFinal.every((e) => e.sequencialResultadoExame !== '')).toBe(true);
  });

  /**
   * Cenário B: REST API retorna APENAS alguns sequenciais
   * Simula o caso real onde a API do SOC não retornou
   * o CODIGOEXAME esperado. Exames sem match ficam com "".
   */
  it('Cenario B: REST API retorna apenas alguns exames — outros ficam vazios', () => {
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '1931', NOMEEXAME: 'AUDIOMETRIA' }),
      createPedido({ CODIGOINTERNOEXAME: '2110', NOMEEXAME: 'EXAME CLINICO' }),
      createPedido({ CODIGOINTERNOEXAME: '1645', NOMEEXAME: 'TRIAGEM AUDITIVA' }),
    ];

    // REST API retorna apenas 2 de 3
    const sequenciais = [
      createSequencialFicha({ CODIGOEXAME: '1931', SEQUENCIALRESULTADO: '500001' }),
      createSequencialFicha({ CODIGOEXAME: '1645', SEQUENCIALRESULTADO: '500003' }),
    ];

    const examesNovos = simulateHandleExamScheduled(pedidos, sequenciais);

    expect(examesNovos.find((e) => e.codigoExame === '1931')?.sequencialResultadoExame).toBe('500001');
    expect(examesNovos.find((e) => e.codigoExame === '2110')?.sequencialResultadoExame).toBe('');
    expect(examesNovos.find((e) => e.codigoExame === '1645')?.sequencialResultadoExame).toBe('500003');
  });

  /**
   * Cenário C: REST API retorna vazio — NENHUM sequencial encontrado
   * Todos os exames ficam com sequencialResultadoExame: "".
   * Este é o cenário que ocorreu com a VALQUIRIA.
   */
  it('Cenario C: REST API retorna vazio — todos exames sem sequencial (caso VALQUIRIA)', () => {
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '1931', NOMEEXAME: 'AUDIOMETRIA' }),
      createPedido({ CODIGOINTERNOEXAME: '2110', NOMEEXAME: 'EXAME CLINICO' }),
      createPedido({ CODIGOINTERNOEXAME: '1645', NOMEEXAME: 'TRIAGEM AUDITIVA' }),
    ];

    // REST API retorna vazio — sem matches
    const sequenciais: PedidoExameSequencialFicha[] = [];

    const examesNovos = simulateHandleExamScheduled(pedidos, sequenciais);

    // Todos os exames ficam com sequencialResultadoExame vazio
    expect(examesNovos.every((e) => e.sequencialResultadoExame === '')).toBe(true);
    expect(examesNovos).toHaveLength(3);

    // Merge confirma o estado
    const { finais } = executeMergeInteligente([], examesNovos, []);
    expect(finais.every((e) => e.sequencialResultadoExame === '')).toBe(true);
  });

  /**
   * Cenário D: Exame já FINALIZADO no DB com sequencial, SOC tenta atualizar
   * mas REST API retorna vazio. Merge preserva o valor do DB.
   * Depois EdPedidoExame filtra (ANTIGO) e frontend perde o exame FINALIZADO.
   * COM O FIX: merge preserva, submit nao perde.
   */
  it('Cenario D: exame FINALIZADO com sequencial no DB — merge preserva, submit mantem', () => {
    // DB tem exame FINALIZADO com sequencial
    const dbExams = [
      createExam({
        codigoExame: '1931',
        status: ExamStatus.FINALIZADO,
        sequencialResultadoExame: '500001',
        url: 'https://resultados/audiometria.pdf',
      }),
    ];

    // SOC retorna pedido atualizacao sem sequencial (REST API falhou)
    const socExams = [
      createExam({
        codigoExame: '1931',
        status: ExamStatus.PENDENTE,
        sequencialResultadoExame: '',
      }),
    ];

    // Merge preserva o exame do DB (com sequencial)
    const { finais: resultadoMerge } = executeMergeInteligente(dbExams, socExams, []);
    expect(resultadoMerge[0].sequencialResultadoExame).toBe('500001');
    expect(resultadoMerge[0].status).toBe(ExamStatus.FINALIZADO);

    // Frontend submete o merge (EdPedidoExame SEM filtro — fix aplicado)
    const submitted = resultadoMerge.map((e) => {
      const s = { ...e };
      delete (s as any).sequencialResultadoExame; // frontend nao tem o campo
      return s;
    });
    const resultadoFinal = simulateUpdateFullDocument(dbExams, submitted);
    expect(resultadoFinal[0].sequencialResultadoExame).toBe('500001');
    expect(resultadoFinal[0].status).toBe(ExamStatus.FINALIZADO);
  });

  /**
   * Cenário E: Fluxo completo com dados reais da VALQUIRIA
   * Documento novo (sem DB previo), REST API retorna vazio,
   * exames criados sem sequencial, enfileirados para SOC.
   */
  it('Cenario E: fluxo completo VALQUIRIA — documento novo, REST API vazia, todos sem sequencial', () => {
    // 1. SOC envia 3 pedidos
    const pedidos = [
      createPedido({ CODIGOINTERNOEXAME: '1931', NOMEEXAME: 'AUDIOMETRIA' }),
      createPedido({ CODIGOINTERNOEXAME: '2110', NOMEEXAME: 'EXAME CLINICO' }),
      createPedido({ CODIGOINTERNOEXAME: '1645', NOMEEXAME: 'TRIAGEM AUDITIVA' }),
    ];

    // 2. REST API retorna vazio (como ocorreu com a VALQUIRIA)
    const sequenciais: PedidoExameSequencialFicha[] = [];

    // 3. handleExamScheduled cria exames sem sequencial
    const examesNovos = simulateHandleExamScheduled(pedidos, sequenciais);
    expect(examesNovos.every((e) => e.sequencialResultadoExame === '')).toBe(true);

    // 4. Documento é criado (sem DB previo)
    const { finais: documentoSalvo } = executeMergeInteligente([], examesNovos, []);
    expect(documentoSalvo.every((e) => e.sequencialResultadoExame === '')).toBe(true);

    // 5. Quando cada exame é finalizado, o sequencial está vazio
    // (simula o que ocorre no mongo.controller.ts:1386)
    for (const exame of documentoSalvo) {
      expect(exame.sequencialResultadoExame).toBe('');
    }
  });
});

// ============================================================
// Grupo 5: ProcessResultadoExameSocQueueMessage — validação do campo
// ============================================================

describe('Grupo 5: Validação no processResultadoExameSocQueueMessage', () => {
  it('sequencial vazio causa return deleteMessage=true sem chamar SOAP (confirmacao do bug)', () => {
    const scheduling = {
      _id: 'valquiria-scheduling-id',
      SEQUENCIAFICHA: '365004541',
      EXAMES: [
        createExam({
          codigoExame: '1931',
          grupo: 'Audiometria',
          status: ExamStatus.FINALIZADO,
          sequencialResultadoExame: '', // vazio!
        }),
      ],
    };

    // Simula a validacao em processResultadoExameSocQueueMessage (soc.service.ts:1130-1134)
    const examIndex = 0;
    const exam = scheduling.EXAMES[examIndex];
    const sequencialResultadoExame = String(
      exam?.sequencialResultadoExame || '',
    ).trim();

    const hasSequencial = sequencialResultadoExame !== '';
    const isSkipped = !hasSequencial; // if (!sequencialResultadoExame) → skip

    expect(isSkipped).toBe(true);
    // Se isSkipped for true, a mensagem é deletada sem chamar SOAP
    // Foi exatamente o que ocorreu com a VALQUIRIA
  });

  it('sequencial preenchido permite prosseguir com o envio SOAP', () => {
    const scheduling = {
      _id: 'normal-scheduling-id',
      SEQUENCIAFICHA: '365004542',
      EXAMES: [
        createExam({
          codigoExame: '1931',
          grupo: 'Audiometria',
          status: ExamStatus.FINALIZADO,
          sequencialResultadoExame: '500001',
        }),
      ],
    };

    const examIndex = 0;
    const exam = scheduling.EXAMES[examIndex];

    const hasSequencial = exam.sequencialResultadoExame && exam.sequencialResultadoExame !== '';

    expect(hasSequencial).toBe(true);
    // Se hasSequencial for true, o fluxo continua para WsResultadoExame
  });

  /**
   * NOVO: Simula o fallback REST API SOC sendo bem-sucedido.
   * Quando o processResultadoExameSocQueueMessage encontra
   * sequencial vazio, ele tenta buscar da REST API SOC.
   * Se encontrar, atualiza e prossegue.
   */
  it('NOVO: fallback REST API recupera sequencial vazio — prossegue com SOAP', () => {
    const scheduling = {
      _id: 'fallback-scheduling-id',
      SEQUENCIAFICHA: '365004541',
      CODIGOEMPRESA: '387497',
      EXAMES: [
        createExam({
          codigoExame: '1931',
          grupo: 'Audiometria',
          status: ExamStatus.FINALIZADO,
          sequencialResultadoExame: '',
        }),
      ],
    };

    const examIndex = 0;
    const exam = scheduling.EXAMES[examIndex];
    const codigoExame = String(exam?.codigoExame || '').trim();

    // Simula a LOGICA do fallback:
    // 1. Verifica que sequencial está vazio
    let sequencialResultadoExame = String(
      exam?.sequencialResultadoExame || '',
    ).trim();
    expect(sequencialResultadoExame).toBe('');

    // 2. Fallback: REST API SOC retorna o sequencial agora
    const mockApiResponse = [
      { CODIGOEXAME: '1931', SEQUENCIALRESULTADO: '500123' },
    ];
    const match = mockApiResponse.find(
      (c: any) => String(c.CODIGOEXAME).trim() === codigoExame,
    );

    expect(match?.SEQUENCIALRESULTADO).toBe('500123');

    // 3. Após fallback bem-sucedido, atualiza a variável
    if (match?.SEQUENCIALRESULTADO) {
      sequencialResultadoExame = String(match.SEQUENCIALRESULTADO).trim();
      if (exam) exam.sequencialResultadoExame = sequencialResultadoExame;
    }

    // 4. Verifica que agora o sequencial está preenchido (não faz skip)
    expect(sequencialResultadoExame).toBe('500123');
    expect(exam?.sequencialResultadoExame).toBe('500123');
  });
});