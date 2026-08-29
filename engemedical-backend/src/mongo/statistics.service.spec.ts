import { StatisticsService } from './statistics.service';
import { AtendimentoStatus } from './enum/scheduling.enum';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let mockMongoService: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      estimatedDocumentCount: jest.fn().mockResolvedValue(100),
      countDocuments: jest.fn().mockResolvedValue(5),
      aggregate: jest.fn().mockImplementation((pipeline) => {
        // Detecção básica de qual pipeline está rodando para simular a resposta correta
        const hasFacet = pipeline.some((stage: any) => stage.$facet);
        if (hasFacet) {
          const facetStage = pipeline.find((stage: any) => stage.$facet).$facet;
          
          if (facetStage.porUnidade) {
            // Pipeline Principal
            return {
              toArray: jest.fn().mockResolvedValue([
                {
                  porUnidade: [
                    {
                      unidade: 'RIO CLARO',
                      totalAgendamentos: 10,
                      aguardandoResultados: 2,
                      aguardandoAvaliacaoMedica: 1,
                      statusList: ['EM_ATENDIMENTO'],
                      tipoExameList: ['PERIODICO'],
                    },
                  ],
                  totaisGerais: [
                    {
                      totalAgendamentos: 10,
                      totalExames: 15,
                      totalTickets: 8,
                      statusList: ['EM_ATENDIMENTO'],
                      tipoExameList: ['PERIODICO'],
                    },
                  ],
                },
              ]),
            };
          } else if (facetStage.mediana) {
            // pipelinePrimeiro em processarTemposAtendimento
            return {
              toArray: jest.fn().mockResolvedValue([
                {
                  total: [{ count: 10 }],
                  comTempo: [{ faixas: { '0-15min': 2 } }],
                  mediana: [{ mediana: 15.5 }],
                },
              ]),
            };
          } else {
            // pipelinePermanencia em processarTemposAtendimento
            return {
              toArray: jest.fn().mockResolvedValue([
                {
                  total: [{ count: 10 }],
                  comTempo: [{ exames: 1, quantidade: 2, tempoMedioMinutos: 30 }],
                },
              ]),
            };
          }
        }

        // Caso padrão para processarExamesPorUnidade e processarTicketsPorUnidade
        return {
          toArray: jest.fn().mockResolvedValue([]),
        };
      }),
    };

    mockMongoService = {
      schedulingsCollection: mockCollection,
    };

    service = new StatisticsService(mockMongoService);
  });

  it('deve buscar do banco de dados quando o cache estiver vazio e depois servir do cache', async () => {
    const resultDb = await service.getAtendimentosPorUnidade('RIO CLARO');
    expect(resultDb.source).toBe('database');
    expect(mockCollection.aggregate).toHaveBeenCalledTimes(5); // 1 principal + 4 auxiliares

    // Segunda chamada deve servir do cache
    const resultCache = await service.getAtendimentosPorUnidade('RIO CLARO');
    expect(resultCache.source).toBe('cache');
    expect(resultCache.processingTimeMs).toBe(0);
    expect(mockCollection.aggregate).toHaveBeenCalledTimes(5); // Não incrementou chamadas
  });

  it('deve executar sub-agregações de forma sequencial', async () => {
    const callOrder: string[] = [];

    mockCollection.aggregate = jest.fn().mockImplementation((pipeline) => {
      const hasFacet = pipeline.some((stage: any) => stage.$facet);
      const isUnwind = pipeline.some((stage: any) => stage.$unwind);
      
      if (hasFacet) {
        const facetStage = pipeline.find((stage: any) => stage.$facet).$facet;
        if (facetStage.porUnidade) {
          callOrder.push('principal');
          return {
            toArray: jest.fn().mockResolvedValue([
              {
                porUnidade: [{ unidade: 'RIO CLARO' }],
                totaisGerais: [{}],
              },
            ]),
          };
        } else if (facetStage.mediana) {
          callOrder.push('tempos_primeiro');
          return {
            toArray: jest.fn().mockResolvedValue([
              {
                total: [{ count: 10 }],
                comTempo: [{ faixas: { '0-15min': 2 } }],
                mediana: [{ mediana: 15.5 }],
              },
            ]),
          };
        } else {
          callOrder.push('tempos_permanencia');
          return {
            toArray: jest.fn().mockResolvedValue([
              {
                total: [{ count: 10 }],
                comTempo: [{ exames: 1, quantidade: 2, tempoMedioMinutos: 30 }],
              },
            ]),
          };
        }
      }

      if (isUnwind) {
        callOrder.push('exames');
      } else {
        callOrder.push('tickets');
      }

      return {
        toArray: jest.fn().mockResolvedValue([]),
      };
    });

    await service.getAtendimentosPorUnidade('RIO CLARO');

    // O primeiro precisa ser o principal
    expect(callOrder[0]).toBe('principal');
    
    // Deve conter todas as sub-chamadas otimizadas sequencialmente
    expect(callOrder).toContain('exames');
    expect(callOrder).toContain('tickets');
    expect(callOrder).toContain('tempos_primeiro');
    expect(callOrder).toContain('tempos_permanencia');
  });
});
