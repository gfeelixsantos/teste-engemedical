import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from './mongo.service';
import { calcularRangePipeline } from 'src/utils/util';
import { AtendimentoStatus } from './enum/scheduling.enum';

// ===============================
// 📊 DTOs
// ===============================
export type StatisticsResponseDto = {
  porUnidade: UnidadeStatisticsDto[];
  totaisGerais: TotaisGeraisDto;
  dataReferencia: Date;
  generatedAt: Date;
  source: 'cache' | 'database';
  processingTimeMs?: number;
};

export type UnidadeStatisticsDto = {
  unidade: string;
  totalAgendamentos: number;
  atendimentosPrevistos: number;
  aguardandoResultados: number;
  aguardandoAvaliacaoMedica: number;
  atendimentosPorStatus: Record<string, number>;
  atendimentosPorTipoExame: Record<string, number>;
  exames: ExameStatisticsDto[];
  tickets: TicketStatisticsDto[];
  temposAtendimento?: {
    primeiroExame: TempoPrimeiroExameDto | null;
    permanencia: TempoPermanenciaDto[];
  };
};

export type TotaisGeraisDto = {
  totalAgendamentos: number;
  atendimentosPrevistos: number;
  aguardandoResultados: number;
  aguardandoAvaliacaoMedica: number;
  totalProntuarios: number;
  atendimentosPorStatus: Record<string, number>;
  atendimentosPorTipoExame: Record<string, number>;
  totalExamesRealizados: number;
  totalTicketsEmitidos: number;
};

export type ExameStatisticsDto = {
  nomeExame: string;
  total: number;
  porStatus: Record<string, number>;
  tempoMedioEspera?: number | null;
  tempoContexto?: 'primeiro' | 'subsequente' | null;
};

export type TicketStatisticsDto = {
  status: string;
  total: number;
  preferencial: number;
  comPrefixo: number;
  comPrefixoC: number;
};

export type TempoPrimeiroExameDto = {
  mediaMinutos: number | null;
  faixas: Record<string, number>;
};

export type TempoPermanenciaDto = {
  exames: number;
  quantidade: number;
  tempoMedioMinutos: number | null;
};

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);
  private cache = new Map<
    string,
    { data: StatisticsResponseDto; expires: number }
  >();
  private CACHE_TTL_MS = 300_000; // 5 minutos

  constructor(private readonly mongoService: MongoService) {}

  async getAtendimentosPorUnidade(
    unidade?: string,
    data?: string,
  ): Promise<StatisticsResponseDto> {
    const cacheKey = `${unidade || 'ALL'}_${data || 'TODAY'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return { ...cached.data, source: 'cache', processingTimeMs: 0 };
    }

    const startTime = Date.now();
    const { diaBrStr } = calcularRangePipeline();

    const result = await this.fetchAtendimentosFromDB(unidade, diaBrStr);
    const processingTime = Date.now() - startTime;

    const finalResult: StatisticsResponseDto = {
      ...result,
      processingTimeMs: processingTime,
      source: 'database',
    } as any;
    this.cache.set(cacheKey, {
      data: finalResult,
      expires: Date.now() + this.CACHE_TTL_MS,
    });

    return finalResult;
  }

  private async fetchAtendimentosFromDB(
    unidade: string | undefined,
    diaBrStr: string,
  ): Promise<Omit<StatisticsResponseDto, 'processingTimeMs'>> {
    const collection = this.mongoService.schedulingsCollection;
    if (!collection) {
      this.logger.error('MongoService nao inicializado (schedulingsCollection indefinida).');
      return {
        porUnidade: [],
        totaisGerais: {
          totalAgendamentos: 0,
          atendimentosPrevistos: 0,
          aguardandoResultados: 0,
          aguardandoAvaliacaoMedica: 0,
          totalProntuarios: 0,
          atendimentosPorStatus: {},
          atendimentosPorTipoExame: {},
          totalExamesRealizados: 0,
          totalTicketsEmitidos: 0,
        },
        dataReferencia: new Date(),
        generatedAt: new Date(),
        source: 'database' as any,
      };
    }
    const dataCorteHistorico = new Date('2025-08-01T00:00:00.000Z');

    this.logger.log(
      `🔍 Estatísticas: ${diaBrStr} | Unidade: ${unidade || 'TODAS'}`,
    );

    // 1️⃣ METRICAS GERAIS (HISTÓRICO)
    const [
      totalProntuarios,
      aguardandoResultadosGeral,
      aguardandoAvaliacaoGeral,
    ] = await Promise.all([
      collection.estimatedDocumentCount(),
      collection.countDocuments({
        ATENDIMENTOSTATUS: AtendimentoStatus.AGUARDANDO_RESULTADOS,
        DATAAGENDAMENTO_DATE: { $gte: dataCorteHistorico },
      }),
      collection.countDocuments({
        ATENDIMENTOSTATUS: AtendimentoStatus.AVALIACAO_MEDICA,
        DATAAGENDAMENTO_DATE: { $gte: dataCorteHistorico },
      }),
    ]);

    // 2️⃣ PREVISTOS DO DIA
    const filtroPrevistos: any = { DATAAGENDAMENTO: diaBrStr };
    if (unidade) filtroPrevistos.UNIDADEATENDIMENTO = unidade;
    const totalPrevistosDia = await collection.countDocuments(filtroPrevistos);

    // 3️⃣ MATCH BASE PRODUÇÃO
    const matchStage: any = {
      DATAAGENDAMENTO: diaBrStr,
      ATENDIMENTOSTATUS: { $ne: AtendimentoStatus.AGENDADO },
    };
    if (unidade) matchStage.UNIDADEATENDIMENTO = unidade;

    try {
      const pipeline = [
        { $match: matchStage },
        {
          $facet: {
            porUnidade: [
              {
                $group: {
                  _id: '$UNIDADEATENDIMENTO',
                  totalAgendamentos: { $sum: 1 },
                  aguardandoResultadosDia: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            '$ATENDIMENTOSTATUS',
                            AtendimentoStatus.AGUARDANDO_RESULTADOS,
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  aguardandoAvaliacaoDia: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            '$ATENDIMENTOSTATUS',
                            AtendimentoStatus.AVALIACAO_MEDICA,
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  statusList: {
                    $push: { $ifNull: ['$ATENDIMENTOSTATUS', 'SEM_STATUS'] },
                  },
                  tipoExameList: {
                    $push: { $ifNull: ['$TIPOEXAMENOME', 'SEM_TIPO'] },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  unidade: '$_id',
                  totalAgendamentos: 1,
                  aguardandoResultados: '$aguardandoResultadosDia',
                  aguardandoAvaliacaoMedica: '$aguardandoAvaliacaoDia',
                  atendimentosPorStatus: {
                    $arrayToObject: {
                      $map: {
                        input: { $setUnion: ['$statusList'] },
                        as: 'status',
                        in: {
                          k: '$$status',
                          v: {
                            $size: {
                              $filter: {
                                input: '$statusList',
                                cond: { $eq: ['$$this', '$$status'] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  atendimentosPorTipoExame: {
                    $arrayToObject: {
                      $map: {
                        input: { $setUnion: ['$tipoExameList'] },
                        as: 'tipo',
                        in: {
                          k: '$$tipo',
                          v: {
                            $size: {
                              $filter: {
                                input: '$tipoExameList',
                                cond: { $eq: ['$$this', '$$tipo'] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
            totaisGerais: [
              {
                $group: {
                  _id: null,
                  totalAgendamentos: { $sum: 1 },
                  totalExames: {
                    $sum: {
                      $cond: [{ $isArray: '$EXAMES' }, { $size: '$EXAMES' }, 0],
                    },
                  },
                  totalTickets: {
                    $sum: { $cond: [{ $ne: ['$TICKET.emissao', null] }, 1, 0] },
                  },
                  statusList: {
                    $push: { $ifNull: ['$ATENDIMENTOSTATUS', 'SEM_STATUS'] },
                  },
                  tipoExameList: {
                    $push: { $ifNull: ['$TIPOEXAMENOME', 'SEM_TIPO'] },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  totalAgendamentos: 1,
                  totalExames: 1,
                  totalTickets: 1,
                  atendimentosPorStatus: {
                    $arrayToObject: {
                      $map: {
                        input: { $setUnion: ['$statusList'] },
                        as: 'status',
                        in: {
                          k: '$$status',
                          v: {
                            $size: {
                              $filter: {
                                input: '$statusList',
                                cond: { $eq: ['$$this', '$$status'] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  atendimentosPorTipoExame: {
                    $arrayToObject: {
                      $map: {
                        input: { $setUnion: ['$tipoExameList'] },
                        as: 'tipo',
                        in: {
                          k: '$$tipo',
                          v: {
                            $size: {
                              $filter: {
                                input: '$tipoExameList',
                                cond: { $eq: ['$$this', '$$tipo'] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      ];

      const resultado = await collection.aggregate(pipeline).toArray();
      const dados = resultado[0];

      // Execução SEQUENCIAL por unidade para evitar query storm concorrente
      // (antes: Promise.all disparava N*4 agregações pesadas simultâneas → HTTP 503)
      const porUnidadeCompleto: any[] = [];
      for (const unidadeData of (dados.porUnidade || [])) {
        const exames = await this.processarExamesPorUnidade(collection, matchStage, unidadeData.unidade);
        const tickets = await this.processarTicketsPorUnidade(collection, matchStage, unidadeData.unidade);
        const temposAtendimento = await this.processarTemposAtendimento(collection, matchStage, unidadeData.unidade);
        const previstosUnidade = await collection.countDocuments({
          DATAAGENDAMENTO: diaBrStr,
          UNIDADEATENDIMENTO: unidadeData.unidade,
        });
        porUnidadeCompleto.push({
          ...unidadeData,
          atendimentosPrevistos: previstosUnidade,
          exames,
          tickets,
          temposAtendimento,
        });
      }

      const totaisGeraisBase = dados.totaisGerais?.[0] || {};

      const totaisGerais: TotaisGeraisDto = {
        totalAgendamentos: totaisGeraisBase.totalAgendamentos || 0,
        atendimentosPorStatus: totaisGeraisBase.atendimentosPorStatus || {},
        atendimentosPorTipoExame:
          totaisGeraisBase.atendimentosPorTipoExame || {},
        totalExamesRealizados: totaisGeraisBase.totalExames || 0,
        totalTicketsEmitidos: totaisGeraisBase.totalTickets || 0,
        totalProntuarios: totalProntuarios,
        atendimentosPrevistos: totalPrevistosDia,
        aguardandoResultados: aguardandoResultadosGeral,
        aguardandoAvaliacaoMedica: aguardandoAvaliacaoGeral,
      };

      return {
        porUnidade: porUnidadeCompleto,
        totaisGerais,
        dataReferencia: new Date(diaBrStr),
        generatedAt: new Date(),
        source: 'database',
      };
    } catch (error) {
      this.logger.error(`❌ Erro: ${error.message}`);
      throw error;
    }
  }

  private async processarExamesPorUnidade(
    collection: any,
    matchStage: any,
    unidade: string,
  ): Promise<ExameStatisticsDto[]> {
    // ──────────────────────────────────────────────────────────
    // Cálculo sequencial:
    //   1º grupo  → dataExame − emissao
    //   2º+ grupo → dataExame (1º exame do grupo) − último dataExame do grupo anterior
    //   fallback  → dataExame − emissao (quando grupo anterior não tem data)
    // ──────────────────────────────────────────────────────────
    const pipeline = [
      { $match: { ...matchStage, UNIDADEATENDIMENTO: unidade } },
      { $match: { EXAMES: { $exists: true, $ne: null, $not: { $size: 0 } } } },
      { $match: { 'TICKET.emissao': { $exists: true, $ne: null } } },
      { $unwind: { path: '$EXAMES', preserveNullAndEmptyArrays: false } },
      { $match: { 'EXAMES.grupo': { $exists: true, $ne: null, $ne: '' } } },

      // 1. Agrupar por (schedulingId, grupo, status) → contagem + timestamps
      //    Filtra datas inválidas (placeholders < emissao) DENTRO do $group
      //    para preservar todos os exames no status breakdown
      {
        $group: {
          _id: {
            sid: '$_id',
            grupo: '$EXAMES.grupo',
            status: '$EXAMES.status',
          },
          count: { $sum: 1 },
          // Só usa datas onde dataExame >= emissao (filtra placeholders dentro do $group)
          earliestDataExame: {
            $min: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$EXAMES.dataExame', null] },
                    { $gte: [{ $toDate: '$EXAMES.dataExame' }, { $toDate: '$TICKET.emissao' }] },
                  ],
                },
                then: '$EXAMES.dataExame',
                else: null,
              },
            },
          },
          latestDataExame: {
            $max: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$EXAMES.dataExame', null] },
                    { $gte: [{ $toDate: '$EXAMES.dataExame' }, { $toDate: '$TICKET.emissao' }] },
                  ],
                },
                then: '$EXAMES.dataExame',
                else: null,
              },
            },
          },
          emissao: { $first: { $toDate: '$TICKET.emissao' } },
        },
      },

      // 2. Converter strings para Date
      {
        $addFields: {
          earliestDate: {
            $cond: {
              if: { $ne: ['$earliestDataExame', null] },
              then: { $toDate: '$earliestDataExame' },
              else: null,
            },
          },
          latestDate: {
            $cond: {
              if: { $ne: ['$latestDataExame', null] },
              then: { $toDate: '$latestDataExame' },
              else: null,
            },
          },
        },
      },

      // 3. Colapsar para (schedulingId, grupo) com status breakdown
      //    $min/$max garantem a data correta independente da ordem dos status
      {
        $group: {
          _id: { sid: '$_id.sid', grupo: '$_id.grupo' },
          total: { $sum: '$count' },
          statusList: {
            $push: { status: '$_id.status', quantidade: '$count' },
          },
          earliestDate: { $min: '$earliestDate' },
          latestDate: { $max: '$latestDate' },
          emissao: { $first: '$emissao' },
        },
      },

      // 4. Ordenar por data mais antiga (por agendamento) — nulls por último
      {
        $addFields: {
          _sortDate: { $ifNull: ['$earliestDate', new Date('9999-12-31')] },
        },
      },
      {
        $sort: {
          '_id.sid': 1,
          _sortDate: 1,
        },
      },
      { $project: { _sortDate: 0 } },

      // 5. $setWindowFields: obter último dataExame do grupo anterior
      {
        $setWindowFields: {
          partitionBy: '$_id.sid',
          sortBy: { earliestDate: 1 },
          output: {
            prevGroupLatestDate: {
              $shift: { output: '$latestDate', by: -1 },
            },
            groupRank: {
              $denseRank: {},
            },
          },
        },
      },

      // 6. Calcular tempo de espera por grupo
      {
        $addFields: {
          tempoEsperaMinutos: {
            $cond: {
              if: { $eq: ['$groupRank', 1] },
              // 1º grupo: dataExame − emissao
              then: {
                $cond: {
                  if: { $ne: ['$earliestDate', null] },
                  then: {
                    $divide: [
                      { $subtract: ['$earliestDate', '$emissao'] },
                      60000,
                    ],
                  },
                  else: null,
                },
              },
              // 2º+ grupo: dataExame − último dataExame do grupo anterior
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$earliestDate', null] },
                      { $ne: ['$prevGroupLatestDate', null] },
                    ],
                  },
                  then: {
                    $divide: [
                      { $subtract: ['$earliestDate', '$prevGroupLatestDate'] },
                      60000,
                    ],
                  },
                  else: null,
                },
              },
            },
          },
          tempoContexto: {
            $cond: {
              if: { $eq: ['$groupRank', 1] },
              then: 'primeiro',
              else: {
                $cond: {
                  if: { $ne: ['$prevGroupLatestDate', null] },
                  then: 'subsequente',
                  else: null,
                },
              },
            },
          },
        },
      },

      // 7. Filtrar tempos inválidos
      {
        $addFields: {
          tempoEsperaMinutos: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$tempoEsperaMinutos', null] },
                  { $gte: ['$tempoEsperaMinutos', 0] },
                  { $lte: ['$tempoEsperaMinutos', 480] },
                ],
              },
              then: '$tempoEsperaMinutos',
              else: null,
            },
          },
        },
      },

      // 8. Colapsar para grupo (agregar status + tempos)
      {
        $group: {
          _id: '$_id.grupo',
          total: { $sum: '$total' },
          temposEspera: { $push: '$tempoEsperaMinutos' },
          statusMerge: { $push: '$statusList' },
        },
      },

      // 9. Achatar e agregar status
      {
        $addFields: {
          statusListFlat: {
            $reduce: {
              input: '$statusMerge',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
      {
        $addFields: {
          porStatus: {
            $reduce: {
              input: '$statusListFlat',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [
                        {
                          k: '$$this.status',
                          v: {
                            $add: [
                              {
                                $ifNull: [
                                  {
                                    $getField: {
                                      field: '$$this.status',
                                      input: '$$value',
                                    },
                                  },
                                  0,
                                ],
                              },
                              '$$this.quantidade',
                            ],
                          },
                        },
                      ],
                    ],
                  },
                ],
              },
            },
          },
        },
      },

      // 10. Calcular média de tempos válidos
      {
        $addFields: {
          temposValidos: {
            $filter: {
              input: '$temposEspera',
              cond: {
                $and: [
                  { $ne: ['$$this', null] },
                  { $gte: ['$$this', 0] },
                  { $lte: ['$$this', 480] },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          tempoMedioEspera: {
            $cond: {
              if: { $gt: [{ $size: '$temposValidos' }, 0] },
              then: { $avg: '$temposValidos' },
              else: null,
            },
          },
        },
      },

      // 11. Projeto final
      {
        $project: {
          _id: 0,
          nomeExame: '$_id',
          total: 1,
          porStatus: 1,
          tempoMedioEspera: {
            $cond: {
              if: { $ne: ['$tempoMedioEspera', null] },
              then: { $round: ['$tempoMedioEspera', 1] },
              else: null,
            },
          },
          tempoContexto: 1,
        },
      },
      { $sort: { total: -1 } },
    ];
    return await collection.aggregate(pipeline).toArray();
  }

  private async processarTicketsPorUnidade(
    collection: any,
    matchStage: any,
    unidade: string,
  ): Promise<TicketStatisticsDto[]> {
    const pipeline = [
      { $match: { ...matchStage, UNIDADEATENDIMENTO: unidade } },
      { $match: { 'TICKET.emissao': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$TICKET.status',
          total: { $sum: 1 },
          preferencial: {
            $sum: { $cond: [{ $eq: ['$TICKET.preferencial', true] }, 1, 0] },
          },
          comPrefixo: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$TICKET.prefixo', null] },
                    { $ne: ['$TICKET.prefixo', ''] },
                    { $ne: ['$TICKET.preferencial', true] },
                    { $ne: ['$TICKET.prefixo', 'C'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          comPrefixoC: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$TICKET.prefixo', 'C'] },
                    { $ne: ['$TICKET.preferencial', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          total: 1,
          preferencial: 1,
          comPrefixo: 1,
          comPrefixoC: 1,
        },
      },
    ];
    return await collection.aggregate(pipeline).toArray();
  }

  private async processarTemposAtendimento(
    collection: any,
    matchStage: any,
    unidade: string,
  ): Promise<{ primeiroExame: TempoPrimeiroExameDto | null; permanencia: TempoPermanenciaDto[]; totalAgendamentos: number }> {
    // ── Base compartilhada: match + unwind ──────────────────────
    // NOTA: Apenas exames com dataExame preenchido entram no cálculo.
    // Exames sem dataExame (Triagem, etc) indicam que o exame não foi realizado.
    const baseMatch = [
      { $match: { ...matchStage, UNIDADEATENDIMENTO: unidade } },
      { $match: { EXAMES: { $exists: true, $ne: null, $not: { $size: 0 } } } },
      { $match: { 'TICKET.emissao': { $exists: true, $ne: null } } },
      { $unwind: { path: '$EXAMES', preserveNullAndEmptyArrays: false } },
      { $match: { 'EXAMES.dataExame': { $ne: null } } },
      // Exclui placeholders (ex: 03:00 UTC = meia-noite BRT) onde dataExame < emissao
      // Comparação de string ISO 8601 direta (lexicograficamente equivalente à ordem cronológica)
      // Evita a conversão dupla $toDate em cada documento — significativamente mais eficiente
      { $match: { $expr: { $gte: ['$EXAMES.dataExame', '$TICKET.emissao'] } } },
    ];

    // ── Pipeline 1: Emissão → Primeiro Exame ──────────────────
    const pipelinePrimeiro = [
      ...baseMatch,
      {
        $group: {
          _id: '$_id',
          primeiroExameDate: {
            $min: {
              $cond: {
                if: { $ne: ['$EXAMES.dataExame', null] },
                then: { $toDate: '$EXAMES.dataExame' },
                else: null,
              },
            },
          },
          emissao: { $first: { $toDate: '$TICKET.emissao' } },
        },
      },
      {
        $addFields: {
          tempoEsperaMin: {
            $divide: [
              { $subtract: ['$primeiroExameDate', '$emissao'] },
              60000,
            ],
          },
        },
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          comTempo: [
            { $match: { tempoEsperaMin: { $gte: 0, $lte: 1440 } } },
            {
              $group: {
                _id: null,
                mediaMinutos: { $avg: '$tempoEsperaMin' },
                faixas: {
                  $push: {
                    $switch: {
                      branches: [
                        { case: { $lte: ['$tempoEsperaMin', 15] }, then: '0-15min' },
                        { case: { $lte: ['$tempoEsperaMin', 30] }, then: '15-30min' },
                        { case: { $lte: ['$tempoEsperaMin', 60] }, then: '30-60min' },
                        { case: { $lte: ['$tempoEsperaMin', 120] }, then: '1-2h' },
                      ],
                      default: '2h+',
                    },
                  },
                },
              },
            },
            {
              $addFields: {
                faixas: {
                  $arrayToObject: {
                    $map: {
                      input: { $setUnion: ['$faixas'] },
                      as: 'faixa',
                      in: {
                        k: '$$faixa',
                        v: {
                          $size: {
                            $filter: {
                              input: '$faixas',
                              cond: { $eq: ['$$this', '$$faixa'] },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                mediaMinutos: { $round: ['$mediaMinutos', 1] },
                faixas: 1,
              },
            },
          ],
          mediana: [
            { $match: { tempoEsperaMin: { $gte: 0, $lte: 1440 } } },
            { $sort: { tempoEsperaMin: 1 } },
            {
              $group: {
                _id: null,
                values: { $push: '$tempoEsperaMin' },
                count: { $sum: 1 },
              },
            },
            {
              $addFields: {
                mediana: {
                  $let: {
                    vars: { midIndex: { $floor: { $divide: ['$count', 2] } } },
                    in: {
                      $cond: {
                        if: { $eq: [{ $mod: ['$count', 2] }, 1] },
                        then: { $arrayElemAt: ['$values', '$$midIndex'] },
                        else: {
                          $avg: [
                            { $arrayElemAt: ['$values', { $subtract: ['$$midIndex', 1] }] },
                            { $arrayElemAt: ['$values', '$$midIndex'] },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
            { $project: { _id: 0, mediana: { $round: ['$mediana', 1] } } },
          ],
        },
      },
    ];

    // ── Pipeline 2: Emissão → Último Exame, por qtde exames ──
    const pipelinePermanencia = [
      ...baseMatch,
      {
        $group: {
          _id: '$_id',
          ultimoExameDate: {
            $max: {
              $cond: {
                if: { $ne: ['$EXAMES.dataExame', null] },
                then: { $toDate: '$EXAMES.dataExame' },
                else: null,
              },
            },
          },
          emissao: { $first: { $toDate: '$TICKET.emissao' } },
          qtdeExames: { $sum: 1 },
        },
      },
      {
        $addFields: {
          tempoPermanenciaMin: {
            $divide: [
              { $subtract: ['$ultimoExameDate', '$emissao'] },
              60000,
            ],
          },
        },
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          comTempo: [
            { $match: { tempoPermanenciaMin: { $gte: 0, $lte: 1440 } } },
            {
              $addFields: {
                faixaExames: {
                  $switch: {
                    branches: [
                      { case: { $eq: ['$qtdeExames', 1] }, then: 1 },
                      { case: { $eq: ['$qtdeExames', 2] }, then: 2 },
                      { case: { $eq: ['$qtdeExames', 3] }, then: 3 },
                      { case: { $eq: ['$qtdeExames', 4] }, then: 4 },
                    ],
                    default: 5,
                  },
                },
              },
            },
            {
              $group: {
                _id: '$faixaExames',
                quantidade: { $sum: 1 },
                tempoMedioMinutos: { $avg: '$tempoPermanenciaMin' },
              },
            },
            {
              $project: {
                _id: 0,
                exames: '$_id',
                quantidade: 1,
                tempoMedioMinutos: { $round: ['$tempoMedioMinutos', 1] },
              },
            },
            { $sort: { exames: 1 } },
          ],
        },
      },
    ];

    const [primeiroExameResult, permanenciaResult] = await Promise.all([
      collection.aggregate(pipelinePrimeiro).toArray(),
      collection.aggregate(pipelinePermanencia).toArray(),
    ]);

    const primeiroExameData = primeiroExameResult[0] || { total: [], comTempo: [], mediana: [] };
    const permanenciaData = permanenciaResult[0] || { total: [], comTempo: [] };

    const totalAgendamentos = primeiroExameData.total[0]?.count || 0;
    const primeiroExameDoc = primeiroExameData.comTempo[0] || null;
    const medianaDoc = primeiroExameData.mediana?.[0] || null;
    const totalComTempo = primeiroExameDoc
      ? Object.values(primeiroExameDoc.faixas).reduce((a: number, b: number) => a + b, 0)
      : 0;

    return {
      primeiroExame: primeiroExameDoc
        ? { ...primeiroExameDoc, totalAgendamentos, totalComTempo, medianaMinutos: medianaDoc?.mediana ?? null }
        : null,
      permanencia: permanenciaData.comTempo || [],
      totalAgendamentos,
    };
  }
}
