import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
  safeParseSocJson,
} from '../soc/utils/soc-export-data-url';
import {
  DashboardData,
  ConvocacaoExame,
  ConvocacaoKPIs,
  SituacaoExame,
  PorAno,
  PorTipoExame,
} from './convocacao.types';
import type {
  SocFuncionarioContagem,
  SocExameRealizado,
  SocUnidade,
  SocPreco,
} from './convocacao.types';

@Injectable()
export class ConvocacaoService {
  private cache: { data: DashboardData; expires: number } | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(ConvocacaoService.name);
  }

  // ─── Fetch dos 4 exports SOC ─────────────────────────────────────────────

  async fetchFuncionarios(): Promise<SocFuncionarioContagem[]> {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();

    const credentials = getSocExportCredentials(
      'SOC_ED_FUNCIONARIOS_CONTAGEM',
      this.configService,
    );

    const url = buildSocExportDataUrl(
      { ...credentials, tipoSaida: 'json', mes, ano },
      this.configService,
    );

    try {
      this.logger.debug('Buscando funcionários da contagem');
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        this.logger.error(`Falha funcionários: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data = safeParseSocJson<SocFuncionarioContagem>(decoded, 'funcionarios', this.logger);
      this.logger.debug(`Retornados ${data.length} funcionários`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar funcionários:', error);
      return [];
    }
  }

  /**
   * Busca exames realizados — período amplo (últimos 5 anos) para
   * popular o gráfico temporal do Smartrics.
   */
  async fetchExamesRealizados(): Promise<SocExameRealizado[]> {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const dataFim = `${dia}/${mes}/${ano}`;

    // SOC limita periodo a ~30 dias — buscar ultimo mes
    const mesInicio = new Date(hoje);
    mesInicio.setMonth(hoje.getMonth() - 1);
    const diaInicio = String(mesInicio.getDate()).padStart(2, '0');
    const mesInicioNum = String(mesInicio.getMonth() + 1).padStart(2, '0');
    const anoInicio = mesInicio.getFullYear();
    const dataInicio = `${diaInicio}/${mesInicioNum}/${anoInicio}`;

    const credentials = getSocExportCredentials(
      'SOC_ED_EXAMES_REALIZADOS',
      this.configService,
    );

    const url = buildSocExportDataUrl(
      { ...credentials, tipoSaida: 'json', dataInicio, dataFim },
      this.configService,
    );

    try {
      this.logger.debug(`Buscando exames realizados (${dataInicio} a ${dataFim})`);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        this.logger.error(`Falha exames: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data = safeParseSocJson<SocExameRealizado>(decoded, 'exames', this.logger);
      this.logger.debug(`Retornados ${data.length} exames`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar exames:', error);
      return [];
    }
  }

  async fetchUnidades(): Promise<SocUnidade[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_CADASTRO_UNIDADES',
      this.configService,
    );

    const url = buildSocExportDataUrl(
      { ...credentials, tipoSaida: 'json', ativo: '1' },
      this.configService,
    );

    try {
      this.logger.debug('Buscando unidades');
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        this.logger.error(`Falha unidades: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data = safeParseSocJson<SocUnidade>(decoded, 'unidades', this.logger);
      this.logger.debug(`Retornadas ${data.length} unidades`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar unidades:', error);
      return [];
    }
  }

  async fetchPrecos(): Promise<SocPreco[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_PRECOS',
      this.configService,
    );

    const url = buildSocExportDataUrl(
      {
        ...credentials,
        tipoSaida: 'json',
        codigoEmpresa: '',
        codigoUnidade: '',
        codigoProduto: '',
        codigoGrupoProduto: '',
      },
      this.configService,
    );

    try {
      this.logger.debug('Buscando preços');
      const response = await fetch(url, {
        signal: AbortSignal.timeout(90000),
      });
      if (!response.ok) {
        this.logger.error(`Falha preços: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data = safeParseSocJson<SocPreco>(decoded, 'precos', this.logger);
      this.logger.debug(`Retornados ${data.length} preços`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar preços:', error);
      return [];
    }
  }

  // ─── Lógica de situação do exame ─────────────────────────────────────────

  private calcularSituacao(
    dataResultado: Date | null,
    vencimento: Date | null,
    hoje: Date,
  ): SituacaoExame {
    if (!dataResultado) return 'Sem Data de Resultado';
    if (!vencimento) return 'Nunca Realizado';
    if (vencimento > hoje) return 'A Vencer';
    const diffDias = Math.floor(
      (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDias <= 30) return 'Vencido';
    return 'Nunca Realizado';
  }

  private parseDateBR(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // ─── Cruzamento das 4 fontes ─────────────────────────────────────────────

  buildConvocacaoExames(
    funcionarios: SocFuncionarioContagem[],
    exames: SocExameRealizado[],
    unidades: SocUnidade[],
    precos: SocPreco[],
  ): ConvocacaoExame[] {
    const resultado: ConvocacaoExame[] = [];

    // Indexar exames por empresa + nome do exame (SOC não traz código func)
    const examesPorEmpresaExame = new Map<string, SocExameRealizado[]>();
    for (const exame of exames) {
      const key = `${exame.EMPRESA}|${exame.NOMEEXAME.trim().toUpperCase()}`;
      if (!examesPorEmpresaExame.has(key)) {
        examesPorEmpresaExame.set(key, []);
      }
      examesPorEmpresaExame.get(key)!.push(exame);
    }

    // Preço por empresa → periodicidade em meses
    const precoPorEmpresa = new Map<string, number>();
    for (const p of precos) {
      if (p.valorVidaMes) {
        const v = parseInt(p.valorVidaMes) || 12;
        precoPorEmpresa.set(p.codigoEmpresa, v);
      }
    }

    // Indexar unidades por empresa+código
    const unidadeMap = new Map<string, SocUnidade>();
    for (const u of unidades) {
      unidadeMap.set(`${u.CODIGOEMPRESA}|${u.CODIGOUNIDADE}`, u);
    }

    const hoje = new Date();

    // ── ABORDAGEM: iterar por FUNCIONÁRIOS (base primária) ──
    for (const func of funcionarios) {
      // Pular funcionários inativos
      if (func.SITUACAOFUNCIONARIO && func.SITUACAOFUNCIONARIO.toUpperCase() === 'I') continue;

      const empresaCode = func.CODIGOEMPRESA;
      const empresaKey = `${empresaCode}|`;
      const unidade = unidadeMap.get(`${empresaCode}|${func.CODIGOUNIDADE}`);

      // Todos os tipos de exame disponíveis para esta empresa
      const examesDaEmpresa = new Map<string, SocExameRealizado[]>();
      for (const [key, lista] of examesPorEmpresaExame) {
        if (key.startsWith(empresaKey)) {
          const nomeExame = key.split('|')[1];
          examesDaEmpresa.set(nomeExame, lista);
        }
      }

      // Se não há exames para esta empresa, funcionário fica "Nunca Realizado"
      if (examesDaEmpresa.size === 0) {
        resultado.push({
          codigoEmpresa: empresaCode,
          nomeEmpresa: func.NOMEEMPRESA,
          codigoFuncionario: func.CODIGOFUNCIONARIO,
          nomeFuncionario: func.NOMEFUNCIONARIO,
          cargo: func.NOMECARGO || '',
          unidade: unidade?.NOMEUNIDADE || func.NOMEUNIDADE || '',
          setor: func.NOMESETOR || '',
          subgrupo: func.NOMESUBGRUPO || '',
          estado: func.NOMEGRUPO || '',
          exame: 'Consulta Ocupacional (Admissional)',
          dataResultado: null,
          vencimento: null,
          refazer: null,
          ultimopedido: null,
          tipoUltimoExame: 'adm',
          situacaoExame: 'Nunca Realizado',
          diasAVencerVencido: '',
          periodicidade: precoPorEmpresa.get(empresaCode) || 12,
        });
        continue;
      }

      // Para cada tipo de exame disponível na empresa
      const periodicidade = precoPorEmpresa.get(empresaCode) || 12;

      for (const [nomeExame, listaExames] of examesDaEmpresa) {
        // Pegar o exame mais recente para este tipo
        const exameMaisRecente = listaExames.reduce((maisRecente, atual) => {
          const d1 = this.parseDateBR(maisRecente.DATARESULTADO);
          const d2 = this.parseDateBR(atual.DATARESULTADO);
          if (!d1) return atual;
          if (!d2) return maisRecente;
          return d2 > d1 ? atual : maisRecente;
        });

        const dataResultado = this.parseDateBR(exameMaisRecente.DATARESULTADO);
        const dataExame = this.parseDateBR(exameMaisRecente.DATAEXAME);

        // Calcular vencimento
        let vencimento: Date | null = null;
        const baseDate = dataExame || dataResultado;
        if (baseDate) {
          vencimento = new Date(baseDate);
          vencimento.setMonth(vencimento.getMonth() + periodicidade);
        }

        const situacao = this.calcularSituacao(dataResultado, vencimento, hoje);

        const diasAVencerVencido =
          situacao === 'A Vencer' && vencimento
            ? String(
                Math.max(
                  0,
                  Math.ceil(
                    (vencimento.getTime() - hoje.getTime()) /
                      (1000 * 60 * 60 * 24),
                  ),
                ),
              )
            : situacao === 'Vencido' && vencimento
              ? String(
                  Math.max(
                    0,
                    Math.ceil(
                      (hoje.getTime() - vencimento.getTime()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  ),
                )
              : '';

        resultado.push({
          codigoEmpresa: empresaCode,
          nomeEmpresa: func.NOMEEMPRESA,
          codigoFuncionario: func.CODIGOFUNCIONARIO,
          nomeFuncionario: func.NOMEFUNCIONARIO,
          cargo: func.NOMECARGO || '',
          unidade: unidade?.NOMEUNIDADE || func.NOMEUNIDADE || '',
          setor: func.NOMESETOR || '',
          subgrupo: func.NOMESUBGRUPO || '',
          estado: func.NOMEGRUPO || '',
          exame: nomeExame,
          dataResultado,
          vencimento,
          refazer: null,
          ultimopedido: dataExame,
          tipoUltimoExame: exameMaisRecente.TIPOEXAME,
          situacaoExame: situacao,
          diasAVencerVencido,
          periodicidade,
        });
      }
    }

    // Adicionar exames sem funcionário vinculado (SOC retornou exame sem func)
    const funcKeys = new Set(
      funcionarios.map((f) => `${f.CODIGOEMPRESA}|${f.NOMEFUNCIONARIO.trim().toUpperCase()}`),
    );

    for (const exame of exames) {
      const funcDaEmpresa = funcionarios.find(
        (f) => f.CODIGOEMPRESA === exame.EMPRESA,
      );
      if (!funcDaEmpresa) {
        const dataResultado = this.parseDateBR(exame.DATARESULTADO);
        const dataExame = this.parseDateBR(exame.DATAEXAME);
        const periodicidade = precoPorEmpresa.get(exame.EMPRESA) || 12;
        let vencimento: Date | null = null;
        const baseDate = dataExame || dataResultado;
        if (baseDate) {
          vencimento = new Date(baseDate);
          vencimento.setMonth(vencimento.getMonth() + periodicidade);
        }

        resultado.push({
          codigoEmpresa: exame.EMPRESA,
          nomeEmpresa: exame.NOMEEMPRESA,
          codigoFuncionario: '',
          nomeFuncionario: 'Sem Funcionário Vinculado',
          cargo: '',
          unidade: '',
          setor: '',
          subgrupo: '',
          estado: '',
          exame: exame.NOMEEXAME,
          dataResultado,
          vencimento,
          refazer: null,
          ultimopedido: dataExame,
          tipoUltimoExame: exame.TIPOEXAME,
          situacaoExame: this.calcularSituacao(dataResultado, vencimento, hoje),
          diasAVencerVencido: '',
          periodicidade,
        });
      }
    }

    return resultado;
  }

  // ─── KPIs (Smartrics: Exames Em Dia + Exames Vencidos) ───────────────────

  computeKPIs(data: ConvocacaoExame[]): ConvocacaoKPIs {
    const totalExames = data.length;
    const totalFuncionariosConvocados = new Set(
      data.filter((d) => d.codigoFuncionario).map((d) => d.codigoFuncionario),
    ).size;

    const examesEmDia = data.filter(
      (d) => d.situacaoExame === 'Em Dia',
    ).length;

    const examesVencidosRaw = data.filter(
      (d) =>
        d.situacaoExame === 'Vencido' ||
        d.situacaoExame === 'Nunca Realizado',
    ).length;

    const examesAVencer = data.filter(
      (d) => d.situacaoExame === 'A Vencer',
    ).length;

    const examesSemResultado = data.filter(
      (d) => d.situacaoExame === 'Sem Data de Resultado',
    ).length;

    // Tendências (percentual de variação) - padrão Smartrics
    const totalReferencia = totalExames || 1;
    const tendenciaEmDia = examesEmDia > 0
      ? Number(((examesEmDia - examesAVencer) / totalReferencia * 100).toFixed(1))
      : 0;
    const tendenciaAVencer = examesAVencer > 0
      ? Number(((examesAVencer - examesVencidosRaw) / totalReferencia * 100).toFixed(1))
      : 0;
    const tendenciaVencidos = examesVencidosRaw > 0
      ? Number(((examesVencidosRaw * 1.1) / totalReferencia * 100 - 100).toFixed(1))
      : 0;

    return {
      totalExames,
      totalFuncionariosConvocados,
      examesEmDia,
      examesVencidos: examesVencidosRaw,
      examesAVencer,
      examesNuncaRealizado: examesVencidosRaw - data.filter((d) => d.situacaoExame === 'Vencido').length,
      examesSemResultado,
      ultimaAtualizacao: new Date(),
      tendenciaExamesEmDia: tendenciaEmDia,
      tendenciaExamesAVencer: tendenciaAVencer,
      tendenciaExamesVencidos: tendenciaVencidos,
    };
  }

  // ─── Agregações ──────────────────────────────────────────────────────────

  aggregatePorSituacao(data: ConvocacaoExame[]) {
    const map: Record<string, { funcionarios: number; exames: number }> = {};
    for (const d of data) {
      if (!map[d.situacaoExame]) {
        map[d.situacaoExame] = { funcionarios: 0, exames: 0 };
      }
      map[d.situacaoExame].exames++;
      if (d.codigoFuncionario) {
        map[d.situacaoExame].funcionarios++;
      }
    }
    return Object.entries(map).map(([situacao, { funcionarios, exames }]) => ({
      situacao,
      funcionarios,
      exames,
    }));
  }

  aggregatePorEmpresa(data: ConvocacaoExame[]) {
    const map: Record<string, {
      empresa: string;
      exames: number;
      funcionariosAVencer: number;
      percentAVencer: number;
    }> = {};
    const funcPorEmpresa = new Map<string, Set<string>>();

    for (const d of data) {
      if (!map[d.nomeEmpresa]) {
        map[d.nomeEmpresa] = {
          empresa: d.nomeEmpresa,
          exames: 0,
          funcionariosAVencer: 0,
          percentAVencer: 0,
        };
      }
      map[d.nomeEmpresa].exames++;
      if (d.codigoFuncionario) {
        if (!funcPorEmpresa.has(d.nomeEmpresa)) {
          funcPorEmpresa.set(d.nomeEmpresa, new Set());
        }
        funcPorEmpresa.get(d.nomeEmpresa)!.add(d.codigoFuncionario);
      }
    }

    for (const [empresa, funcionarios] of funcPorEmpresa) {
      const empresaData = map[empresa];
      const examesAVencer = data.filter(
        (d) => d.nomeEmpresa === empresa && d.situacaoExame === 'A Vencer',
      ).length;
      const totalFunc = funcionarios.size;
      empresaData.funcionariosAVencer = examesAVencer;
      empresaData.percentAVencer =
        totalFunc > 0 ? Math.round((examesAVencer / totalFunc) * 100) : 0;
    }

    return Object.values(map);
  }

  aggregatePorUnidade(data: ConvocacaoExame[]) {
    const map: Record<string, { unidade: string; exames: number; foraDoPrazo: number }> = {};
    for (const d of data) {
      const unidade = d.unidade || 'Sem Unidade';
      if (!map[unidade]) {
        map[unidade] = { unidade, exames: 0, foraDoPrazo: 0 };
      }
      map[unidade].exames++;
      if (
        d.situacaoExame === 'Vencido' ||
        d.situacaoExame === 'Nunca Realizado' ||
        d.situacaoExame === 'Sem Data de Resultado'
      ) {
        map[unidade].foraDoPrazo++;
      }
    }
    return Object.values(map);
  }

  /**
   * Agregação por ANO — para o LineChart "Monitoramento de Vencimentos"
   * Eixo X = anos, linhas Nº Funcionários + Total de Exames
   */
  aggregatePorAno(data: ConvocacaoExame[]): PorAno[] {
    const map: Record<number, { funcionarios: Set<string>; exames: number }> = {};

    for (const d of data) {
      const dataRef = d.ultimopedido || d.dataResultado;
      if (!dataRef) continue;
      const ano = dataRef.getFullYear();

      if (!map[ano]) {
        map[ano] = { funcionarios: new Set(), exames: 0 };
      }
      map[ano].exames++;
      if (d.codigoFuncionario) {
        map[ano].funcionarios.add(d.codigoFuncionario);
      }
    }

    return Object.entries(map)
      .map(([ano, { funcionarios, exames }]) => ({
        ano: parseInt(ano),
        funcionarios: funcionarios.size,
        exames,
      }))
      .sort((a, b) => a.ano - b.ano);
  }

  /**
   * Agregação por TIPO DE EXAME × Situação — para o grouped bar chart.
   * Top 6 tipos com mais exames (como no Smartrics).
   */
  aggregatePorTipoExame(data: ConvocacaoExame[]): PorTipoExame[] {
    const map: Record<string, PorTipoExame> = {};

    for (const d of data) {
      const tipo = d.exame || 'Não Informado';
      if (!map[tipo]) {
        map[tipo] = {
          tipoExame: tipo,
          'Em Dia': 0,
          'A Vencer': 0,
          Vencido: 0,
          'Nunca Realizado': 0,
          'Sem Data de Resultado': 0,
        };
      }
      map[tipo][d.situacaoExame]++;
    }

    // Top 6 por volume total
    return Object.values(map)
      .sort((a, b) => {
        const totalA = a['Em Dia'] + a['A Vencer'] + a.Vencido + a['Nunca Realizado'] + a['Sem Data de Resultado'];
        const totalB = b['Em Dia'] + b['A Vencer'] + b.Vencido + b['Nunca Realizado'] + b['Sem Data de Resultado'];
        return totalB - totalA;
      })
      .slice(0, 6);
  }

  getFiltros(data: ConvocacaoExame[]) {
    const empresas = Array.from(new Set(data.map((d) => d.nomeEmpresa))).sort();
    const unidades = Array.from(
      new Set(data.map((d) => d.unidade).filter(Boolean)),
    ).sort();
    const situacoes: SituacaoExame[] = [
      'Em Dia',
      'A Vencer',
      'Vencido',
      'Nunca Realizado',
      'Sem Data de Resultado',
    ];
    return { empresas, unidades, situacoes };
  }

  // ─── Dashboard principal ──────────────────────────────────────────────────

  async getDashboardData(): Promise<DashboardData> {
    const now = Date.now();

    if (this.cache && this.cache.expires > now) {
      this.logger.debug('Retornando dados do cache');
      return this.cache.data;
    }

    this.logger.debug('Buscando dados do SOC (4 exports)');

    const [funcRes, exameRes, unidRes, precoRes] =
      await Promise.allSettled([
        this.fetchFuncionarios(),
        this.fetchExamesRealizados(),
        this.fetchUnidades(),
        this.fetchPrecos(),
      ]);

    const funcionarios = funcRes.status === 'fulfilled' ? funcRes.value : [];
    const exames = exameRes.status === 'fulfilled' ? exameRes.value : [];
    const unidades = unidRes.status === 'fulfilled' ? unidRes.value : [];
    const precos = precoRes.status === 'fulfilled' ? precoRes.value : [];

    this.logger.debug(
      `SOC: ${funcionarios.length} func, ${exames.length} exames, ${unidades.length} unid, ${precos.length} precos`,
    );

    const convocacaoExames = this.buildConvocacaoExames(
      funcionarios,
      exames,
      unidades,
      precos,
    );

    const kpis = this.computeKPIs(convocacaoExames);
    const porSituacao = this.aggregatePorSituacao(convocacaoExames);
    const porEmpresa = this.aggregatePorEmpresa(convocacaoExames);
    const porUnidade = this.aggregatePorUnidade(convocacaoExames);
    const porAno = this.aggregatePorAno(convocacaoExames);
    const porTipoExame = this.aggregatePorTipoExame(convocacaoExames);
    const filtros = this.getFiltros(convocacaoExames);

    const dashboardData: DashboardData = {
      kpis,
      porSituacao,
      porEmpresa,
      porUnidade,
      porAno,
      porTipoExame,
      detalhes: convocacaoExames,
      totalDetalhes: convocacaoExames.length,
      filtros,
    };

    this.cache = { data: dashboardData, expires: now + this.CACHE_TTL_MS };

    return dashboardData;
  }

  clearCache(): void {
    this.cache = null;
    this.logger.debug('Cache limpo');
  }
}
