import { Injectable, Logger } from '@nestjs/common';
import { StructuredLogger } from 'src/utils/logger';
import { ConfigService } from '@nestjs/config';
import { ICadastroPessoas } from '../types/CadastroPessoas';
import { CadastroFuncionarioPorSituacao } from '../types/CadastroFuncionarioPorSituacao';
import {
  ResultadoDataFichaExame,
  ResultadoDataFichaExameRequest,
} from '../types/ResultadoExameDataFicha';
import { PedidoExame, PedidoExameRequest } from '../types/PedidoExame';
import { calcularRangePipeline } from 'src/utils/util';
import { AsoFuncionarioDto } from '../types/AsoFuncionario';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { DocumentoGED } from '../types/GED';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
  getSocExportLayoutCredentials,
  safeParseSocJson,
} from '../utils/soc-export-data-url';

type CodigoEmpresa = string;

@Injectable()
export class SocExportService {
  private cacheResultadoDataFichaExame: Record<
    CodigoEmpresa,
    ResultadoDataFichaExame[]
  > = {};

  private pessoasCache: { data: ICadastroPessoas[]; expires: number } | null = null;
  private readonly PESSOAS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(SocExportService.name);
  }

  /**
   * Exporta dados cadastro de pessoas (login).
   */
  async EdCadastroPessoas(): Promise<ICadastroPessoas[] | null> {
    const now = Date.now();
    if (this.pessoasCache && this.pessoasCache.expires > now) {
      return this.pessoasCache.data;
    }

    const credentials = getSocExportCredentials(
      'SOC_ED_CADASTRO_PESSOAS',
      this.configService,
    );
    const url = buildSocExportDataUrl(
      {
        ...credentials,
        tipoSaida: 'json',
        ativo: '1',
      },
      this.configService,
    );

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.error(
          `Falha ao buscar dados do SOC: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const listaCadastroPessoas: ICadastroPessoas[] = JSON.parse(decoded);

      this.pessoasCache = {
        data: listaCadastroPessoas,
        expires: now + this.PESSOAS_CACHE_TTL_MS,
      };

      return listaCadastroPessoas;
    } catch (error) {
      this.logger.error(
        'Erro ao buscar dados do SOC (timeout ou rede):',
        error,
      );
      return [];
    }
  }

  /**
   * Exporta dados responsável por levantar todas as fichas
   * de todas as empresas.
   * @param dataInicio formato: (dd/MM/yyyy) - configurado para dia 01 do mês corrente
   * @param dataFim formato: (dd/MM/yyyy)
   * @default dataAtual
   */
  async EdResultadoExamesTodasEmpresas(
    request: ResultadoDataFichaExameRequest,
  ): Promise<void> {
    const { diaBrStr } = calcularRangePipeline();
    const {
      empresa = '',
      funcionario = '',
      dataInicio = diaBrStr,
      dataFim = diaBrStr,
    } = request;

    const codigosDeExames = [
      'clinico',
      'EXM1', // Gestão vencimento
      '51.01.004-6', // Audiometria
      '50.01.001-8', // Acuidade visual
      '20221407', // Acuidade Ishihara
      '28011023', // Hemoglobina
      '02020', // Toxicologico
      '28.01.097-3', // Glicemia
      '28.04.048-1', // Hemograma
      '111', // Coluna lombo-sacra
      '20.01.001-0', // ECG
      '22010017', // EEG
      '19.01.029-0', // Espirometria
      '32050070', // RX Tórax
      '12200', // Tomografia
      '225588', // Psicossocial
      '28.01.054-0', // Creatinina
      '28100239', // Cultura
      '28030141', // Parasitológico
      '28.01.136-8', // TGO
      '28.01.137-6', // TGP
    ];

    const credentials = getSocExportCredentials(
      'SOC_ED_RESULTADO_EXAMES_TODAS_EMPRESAS',
      this.configService,
    );

    for (const codigo of codigosDeExames) {
      const url = buildSocExportDataUrl(
        {
          ...credentials,
          tipoSaida: 'json',
          dataInicio,
          datafim: dataFim,
          codexame: codigo,
        },
        this.configService,
      );

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          this.logger.error(
            'Falha na requisição no exporta dados resultados de exames todas as empresas',
            await response.text(),
          );
          return;
        }

        const responseBuff = await response.arrayBuffer();
        const responseDecode = new TextDecoder('iso-8859-1').decode(
          responseBuff,
        );
        const trimmed = responseDecode.trim();
        if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
          this.logger.warn(
            `SOC ficha todas empresas retornou texto em vez de JSON (${trimmed.slice(0, 120)})`,
          );
          continue;
        }
        let responseJson: ResultadoDataFichaExame[] =
          JSON.parse(responseDecode);

        if (responseJson.length > 0) {
          // Caso houver empresa e funcionario, filtra o resultado
          if (funcionario && empresa) {
            responseJson = responseJson.filter(
              (r) => r.EMPRESA === empresa && r.CODFUNCIONARIO === funcionario,
            );

            // SE ENCONTROU O FUNCIONÁRIO, ENCERRA O LOOP
            if (responseJson.length > 0) {
              // Aqui você ainda pode salvar no cache antes de sair, se necessário
              if (this.cacheResultadoDataFichaExame[empresa])
                this.cacheResultadoDataFichaExame[empresa].push(
                  ...responseJson,
                );
              else this.cacheResultadoDataFichaExame[empresa] = responseJson;

              break;
            }
          }

          // Agrupamento padrão, se não filtrou por funcionário
          const agrupado = responseJson.reduce<
            Record<string, ResultadoDataFichaExame[]>
          >((acc, ficha) => {
            if (!acc[ficha.EMPRESA]) acc[ficha.EMPRESA] = [];
            acc[ficha.EMPRESA].push(ficha);
            return acc;
          }, {});

          for (const [empresaKey, fichas] of Object.entries(agrupado)) {
            if (!this.cacheResultadoDataFichaExame[empresaKey]) {
              this.cacheResultadoDataFichaExame[empresaKey] = fichas;
            } else {
              const sequenciasExistentes = new Set(
                this.cacheResultadoDataFichaExame[empresaKey].map(
                  (f) => f.SEQUENCIAFICHA,
                ),
              );

              for (const ficha of fichas) {
                if (!sequenciasExistentes.has(ficha.SEQUENCIAFICHA)) {
                  this.cacheResultadoDataFichaExame[empresaKey].push(ficha);
                }
              }
            }
          }
        }
      } catch (e) {
        this.logger.error(
          'Um erro ocorreu no exporta dados ficha todas as empresas',
          e,
        );
      }
    }
  }

  /**
   * Exporta os pedidos de exames de uma empresa.
   *
   * @param request Objeto {@link PedidoExameRequest} contendo os parâmetros da busca.
   * @returns Lista de pedidos de exames ou null em caso de erro.
   */
  async EdPedidoExame(
    request: PedidoExameRequest,
  ): Promise<PedidoExame[] | null> {
    const { diaBrStr } = calcularRangePipeline();

    const {
      empresa,
      funcionario = '',
      dataInicio = request.dataInicio ?? diaBrStr,
      dataFim = diaBrStr,
    } = request;

    const credentials = getSocExportLayoutCredentials(
      'SOC_ED_PEDIDO_EXAME',
      this.configService,
    );
    const url = buildSocExportDataUrl(
      {
        empresa,
        ...credentials,
        tipoSaida: 'json',
        paramSequencial: '',
        sequenciaFicha: '',
        funcionarioInicio: '1',
        funcionarioFim: '999999999',
        paramData: '1',
        dataInicio,
        dataFim,
        paramFunc: '',
        cpffuncionario: '',
        nomefuncionario: '',
        codpresta: '',
        nomepresta: '',
        paramPresta: '',
        codunidade: '',
        nomeunidade: '',
        paramUnidade: '',
      },
      this.configService,
    );

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.error(
          'Falha na requisição no exporta dados PEDIDO DE EXAME:',
          await response.text(),
        );
        return null;
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      // Caso a resposta seja inválida (texto plano "De..." etc.)
      if (decoded.startsWith('De')) {
        this.logger.debug({
          event: 'SOC_RESPONSE_UNEXPECTED',
          response: decoded.slice(0, 500),
        });
        return null;
      }

      let responseJson: PedidoExame[];
      try {
        responseJson = JSON.parse(decoded);
      } catch (err) {
        this.logger.error(
          'Erro ao converter resposta em JSON:',
          err,
          decoded.slice(0, 300),
        );
        return null;
      }

      // Nenhum pedido encontrado
      if (!responseJson?.length) {
        return null;
      }

      // Filtra por funcionário, se informado
      if (funcionario) {
        responseJson = responseJson.filter(
          (r) => r.CODIGOFUNCIONARIO === funcionario.trim(),
        );
      }

      return responseJson;
    } catch (error) {
      this.logger.error(
        'Erro ao processar exporta dados PEDIDO DE EXAME:',
        error,
        url,
      );
      return null;
    }
  }

  /**
   * Fluxo EXCLUSIVO do sync de prontuário.
   * Mantém cópia da lógica do EdPedidoExame para evitar impacto em fluxos legados.
   */
  async EdPedidoExameSyncProntuario(
    request: PedidoExameRequest,
  ): Promise<PedidoExame[] | null> {
    const { diaBrStr } = calcularRangePipeline();

    const {
      empresa,
      funcionario = '',
      dataInicio = request.dataInicio ?? diaBrStr,
      dataFim = diaBrStr,
    } = request;

    const credentials = getSocExportLayoutCredentials(
      'SOC_ED_PEDIDO_EXAME',
      this.configService,
    );
    const url = buildSocExportDataUrl(
      {
        empresa,
        ...credentials,
        tipoSaida: 'json',
        paramSequencial: '',
        sequenciaFicha: '',
        funcionarioInicio: '1',
        funcionarioFim: '999999999',
        paramData: '1',
        dataInicio,
        dataFim,
        paramFunc: '',
        cpffuncionario: '',
        nomefuncionario: '',
        codpresta: '',
        nomepresta: '',
        paramPresta: '',
        codunidade: '',
        nomeunidade: '',
        paramUnidade: '',
      },
      this.configService,
    );

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.error(
          '[SYNC_PRONTUARIO] Falha na requisição PEDIDO DE EXAME:',
          await response.text(),
        );
        return null;
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      if (decoded.startsWith('De')) {
        this.logger.debug({
          event: 'SOC_SYNC_PRONTUARIO_RESPONSE_UNEXPECTED',
          response: decoded.slice(0, 500),
        });
        return null;
      }

      let responseJson: PedidoExame[];
      try {
        responseJson = JSON.parse(decoded);
      } catch (err) {
        this.logger.error(
          '[SYNC_PRONTUARIO] Erro ao converter resposta em JSON:',
          err,
          decoded.slice(0, 300),
        );
        return null;
      }

      if (!responseJson?.length) {
        return null;
      }

      if (funcionario) {
        responseJson = responseJson.filter(
          (r) => r.CODIGOFUNCIONARIO === funcionario.trim(),
        );
      }

      return responseJson;
    } catch (error) {
      this.logger.error(
        '[SYNC_PRONTUARIO] Erro ao processar exporta dados PEDIDO DE EXAME:',
        error,
        url,
      );
      return null;
    }
  }

  /**
   * Exporta ASOs de um funcionário.
   */
  async EdAsosFuncionario(
    empresa: string,
    funcionario: string,
    fichaAtual: string,
  ): Promise<AsoFuncionarioDto[]> {
    const credentials = getSocExportLayoutCredentials(
      'SOC_ED_ASO_FUNCIONARIO',
      this.configService,
    );
    const url = buildSocExportDataUrl(
      {
        empresa,
        ...credentials,
        tipoSaida: 'json',
        funcionario,
        tipoASO: '1,2,3,4,5,6',
        paramFiltroData: '0',
        dataInicio: '',
        dataFim: '',
      },
      this.configService,
    );

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const listaAsos: AsoFuncionarioDto[] = await response.json();
        const asosValidos = listaAsos.filter((a) => a.IDFICHA != fichaAtual);
        return asosValidos;
      } else {
        return [];
      }
    } catch (err) {
      this.logger.error('Erro ao buscar ASOs do funcionário:', err);
      return [];
    }
  }

  async expdSocged(funcionario: SchedulingDocument) {
    const CODIGO_ASODIGITAL =
      this.configService.get<string>('SOC_CODIGO_SOCGED_ASODIGITAL') || '41';
    const credentials = getSocExportLayoutCredentials(
      'SOC_ED_SOCGED',
      this.configService,
    );

    const url = buildSocExportDataUrl(
      {
        empresa: funcionario.CODIGOEMPRESA,
        ...credentials,
        tipoSaida: 'json',
        tipoBusca: '0',
        sequencialFicha: '',
        cpfFuncionario: '',
        filtraPorTipoSocged: 'true',
        codigoTipoSocged: CODIGO_ASODIGITAL,
        dataInicio: '01/01/2026',
        dataFim: '04/02/2026',
        dataEmissaoInicio: '',
        dataEmissaoFim: '',
      },
      this.configService,
    );

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      const responseBuff = await response.arrayBuffer();
      const responseDecode = new TextDecoder('iso-8859-1').decode(responseBuff);
      const socgedRegister: DocumentoGED[] = await JSON.parse(responseDecode);

      if (socgedRegister.length > 0) {
        return socgedRegister;
      } else {
        return;
      }
    } catch (err) {
      this.logger.error('Erro ao buscar GED no SOC:', err);
    }
  }

  /**
   * Busca contatos de uma empresa para envio de ASO por email.
   * Filtra preferencialmente pelo perfil de ASO (código 2).
   */
  async getCompanyContacts(codEmpresa: string): Promise<string[] | null> {
    const CODIGO_PERFIL_ASO = '2';
    const credentials = getSocExportCredentials(
      'SOC_ED_CONTATOS_EMPRESA',
      this.configService,
    );

    const url = buildSocExportDataUrl(
      {
        ...credentials,
        tipoSaida: 'json',
        empresaTrabalho: codEmpresa,
        codigoPerfil: '',
      },
      this.configService,
    );

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.error(
          `[SocExportService] Falha ao buscar contatos: ${response.status}`,
        );
        return null;
      }

      const responseBuff = await response.arrayBuffer();
      const responseDecode = new TextDecoder('iso-8859-1').decode(responseBuff);

      if (
        !responseDecode.trim().startsWith('[') &&
        !responseDecode.trim().startsWith('{')
      ) {
        return null;
      }

      const jsonDecoded: any[] = JSON.parse(responseDecode);
      if (!jsonDecoded || jsonDecoded.length === 0) return null;

      // Filtra pelo perfil de ASO
      const perfilAso = jsonDecoded.filter(
        (contact) => String(contact.codigoPerfil) === CODIGO_PERFIL_ASO,
      );

      if (perfilAso.length > 0) {
        return perfilAso
          .map((p) => p.primeiroEmail)
          .filter((email) => email && email.trim() !== '');
      }

      // Fallback: todos os emails
      return jsonDecoded
        .map((p) => p.primeiroEmail)
        .filter((email) => email && email.trim() !== '');
    } catch (error) {
      this.logger.error(
        `[SocExportService] Erro ao buscar contatos da empresa ${codEmpresa}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Busca contatos detalhados de uma empresa a partir do layout 187196.
   */
  async getCompanyContactsDetailed(codEmpresa: string): Promise<any[] | null> {
    const credentials = getSocExportCredentials(
      'SOC_ED_CONTATOS_EMPRESA',
      this.configService,
    );

    const url = buildSocExportDataUrl(
      {
        ...credentials,
        tipoSaida: 'json',
        empresaTrabalho: codEmpresa,
        codigoPerfil: '',
      },
      this.configService,
    );

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.error(
          `[SocExportService] Falha ao buscar contatos detalhados: ${response.status}`,
        );
        return null;
      }

      const responseBuff = await response.arrayBuffer();
      const responseDecode = new TextDecoder('iso-8859-1').decode(responseBuff);

      if (
        !responseDecode.trim().startsWith('[') &&
        !responseDecode.trim().startsWith('{')
      ) {
        return null;
      }

      const jsonDecoded: any[] = JSON.parse(responseDecode);
      return jsonDecoded;
    } catch (error) {
      this.logger.error(
        `[SocExportService] Erro ao buscar contatos detalhados da empresa ${codEmpresa}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Exporta cadastro de funcionários por situação.
   */
  async EdCadastroFuncionariosPorSituacao(
    empresaSolicitada: string,
    params?: {
      ativo?: string;
      inativo?: string;
      afastado?: string;
      pendente?: string;
      ferias?: string;
    },
  ): Promise<CadastroFuncionarioPorSituacao[]> {
    // O C# usa CadastroFuncionarios. Enquanto esse layout não estiver
    // configurado no ambiente atual, usamos o layout Situação já existente.
    const genericCodigo =
      this.configService.get<string>('SOC_ED_CADASTRO_FUNCIONARIOS_CODIGO')?.trim() ||
      process.env.SOC_ED_CADASTRO_FUNCIONARIOS_CODIGO?.trim();
    const layoutPrefix = genericCodigo
      ? 'SOC_ED_CADASTRO_FUNCIONARIOS'
      : 'SOC_ED_CADASTRO_FUNCIONARIOS_SITUACAO';
    const credentials = getSocExportLayoutCredentials(
      layoutPrefix,
      this.configService,
    );
    const payload = {
      empresa: empresaSolicitada,
      ...credentials,
      tipoSaida: 'json',
      // Obrigatório no contrato usado pelo projeto C# para restringir a
      // exportação à empresa selecionada.
      empresaTrabalho: empresaSolicitada,
      ...(layoutPrefix === 'SOC_ED_CADASTRO_FUNCIONARIOS'
        ? {
            cpf: '',
            parametroData: '',
            dataInicio: '',
            dataFim: '',
          }
        : {
            ativo: params?.ativo || 'Sim',
            inativo: params?.inativo || 'Sim',
            afastado: params?.afastado || 'Sim',
            pendente: params?.pendente || 'Sim',
            ferias: params?.ferias || 'Sim',
          }),
    };

    const url = buildSocExportDataUrl(payload, this.configService);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      const responseBuff = await response.arrayBuffer();
      const responseDecode = new TextDecoder('iso-8859-1').decode(responseBuff);
      if (!response.ok) {
        this.logger.error(
          `Erro SOC ExportaFuncionarios (${layoutPrefix}): ${response.status} ${responseDecode.slice(0, 180)}`,
        );
        throw new Error(`SOC Exporta Funcionários retornou HTTP ${response.status}`);
      }

      const data = safeParseSocJson<CadastroFuncionarioPorSituacao>(
        responseDecode,
        `funcionários da empresa ${empresaSolicitada}`,
        this.logger,
      );

      if (!Array.isArray(data)) {
        this.logger.warn('SOC: Resposta de funcionários não é um array');
        return [];
      }

      this.logger.log(
        `[SOC] ${layoutPrefix}: empresa=${empresaSolicitada} funcionários=${data.length}`,
      );
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar funcionários por situação:', error);
      return [];
    }
  }

  /**
   * Obtém o cache de resultados de fichas de exames.
   */
  getCacheResultadoDataFichaExame(): Record<
    CodigoEmpresa,
    ResultadoDataFichaExame[]
  > {
    return this.cacheResultadoDataFichaExame;
  }

  /**
   * Limpa o cache de resultados de fichas de exames.
   */
  clearCacheResultadoDataFichaExame(): void {
    this.cacheResultadoDataFichaExame = {};
  }

  // ─── Inativação em Massa: Preço / Elegibilidade ─────────────────────────

  /**
   * Normaliza tipoCobranca removendo acentos e caracteres especiais.
   */
  private normalizarTipoCobranca(tipo: string): string {
    return tipo
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toLowerCase();
  }

  /**
   * Verifica se o tipoCobranca protege a empresa de inativação.
   * "Vida Ativa" e "eSocial" são protegidos — empresa NÃO pode ser inativada.
   */
  isTipoCobrancaProtegido(tipoCobranca: string): boolean {
    const normalizado = this.normalizarTipoCobranca(tipoCobranca);
    return normalizado === 'vidaativa' || normalizado === 'esocial';
  }

  /**
   * Busca preços/produtos da empresa via Exporta Dados 218761.
   * Retorna os registros brutos do SOC para análise de elegibilidade.
   */
  async fetchPrecosEmpresa(
    codigoEmpresa: string,
  ): Promise<{ tipoCobranca: string; tiposCobranca: string[]; isElegivel: boolean; motivo: string }> {
    const credentials = getSocExportCredentials(
      'SOC_ED_PRECOS',
      this.configService,
    );

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      codigoEmpresa,
      codigoUnidade: '',
      codigoProduto: '',
      codigoGrupoProduto: '',
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        this.logger.error(
          `Erro SOC fetchPrecosEmpresa (${codigoEmpresa}): ${response.status}`,
        );
        return {
          tipoCobranca: '',
          tiposCobranca: [],
          isElegivel: false,
          motivo: `Erro HTTP ${response.status}`,
        };
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data = JSON.parse(decoded);

      if (!Array.isArray(data) || data.length === 0) {
        // Sem registros = empresa sem contrato → elegível para inativação
        return {
          tipoCobranca: '',
          tiposCobranca: [],
          isElegivel: true,
          motivo: 'Sem Serviço Mensal (nenhum registro de preço retornado)',
        };
      }

      // Analisar tipoCobranca de todos os registros
      const tiposMap = new Map<string, boolean>();
      let tipoPrincipal = '';
      let temProtegido = false;

      for (const row of data) {
        const tipo =
          row.tipoCobranca ||
          row.TIPOCOBRANCA ||
          row.tipo_cobranca ||
          row.TipoCobranca ||
          '';

        if (tipo && !tiposMap.has(tipo)) {
          tiposMap.set(tipo, true);
          if (!tipoPrincipal) {
            tipoPrincipal = tipo;
          }
          if (this.isTipoCobrancaProtegido(tipo)) {
            temProtegido = true;
            tipoPrincipal = tipo;
          }
        }
      }

      const tiposCobranca = [...tiposMap.keys()].sort();
      const isElegivel = !temProtegido;

      let motivo: string;
      if (temProtegido) {
        motivo = `Inelegível (Serviço Mensal: ${tipoPrincipal})`;
      } else if (tiposCobranca.length > 0) {
        motivo = `Elegível (tipos de cobrança: ${tiposCobranca.join(', ')})`;
      } else {
        motivo = 'Elegível (Sem Serviço Mensal)';
      }

      return { tipoCobranca: tipoPrincipal, tiposCobranca, isElegivel, motivo };
    } catch (error) {
      this.logger.error(
        `Erro fetchPrecosEmpresa (${codigoEmpresa}): ${error.message}`,
      );
      return {
        tipoCobranca: '',
        tiposCobranca: [],
        isElegivel: false,
        motivo: `Erro ao consultar preços: ${error.message}`,
      };
    }
  }
}
