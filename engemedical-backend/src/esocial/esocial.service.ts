import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../soc/utils/soc-export-data-url';
import type {
  SocFaturamento,
  SocPrecoEmpresa,
  EsocialKPIs,
  StatusXmlItem,
  EventoDonutItem,
  EvolucaoMensalItem,
  StatusMesItem,
  ComparativoEmpresaItem,
  NaoConcluidoEmpresaItem,
  EsocialDashboardData,
} from './esocial.types';

@Injectable()
export class EsocialService {
  private cache: { data: EsocialDashboardData; expires: number } | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(EsocialService.name);
  }

  /**
   * Busca FATURAMENTO (186376) - contem QUANTIDADE_EVENTOS_ESOCIAL e VALOR_EVENTO
   */
  private async fetchFaturamento(dataInicio?: string, dataFim?: string): Promise<SocFaturamento[]> {
    const credentials = getSocExportCredentials('SOC_ED_FATURAMENTO', this.configService);

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
    };
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug('Buscando faturamento via SOC (186376)');
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) {
        this.logger.error(`Falha ao buscar faturamento: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data: SocFaturamento[] = JSON.parse(decoded);
      this.logger.debug(`Retornadas ${data.length} linhas de faturamento`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar faturamento:', error);
      return [];
    }
  }

  /**
   * Busca PREÇO (218761) - identifica empresas que fazem eSocial via tipoCobranca
   */
  private async fetchPrecoEmpresas(): Promise<SocPrecoEmpresa[]> {
    const credentials = getSocExportCredentials('SOC_ED_PRECOS', this.configService);

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      codigoEmpresa: '',
      codigoUnidade: '',
      codigoProduto: '',
      codigoGrupoProduto: '',
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug('Buscando precos via SOC (218761)');
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) {
        this.logger.error(`Falha ao buscar precos: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data: SocPrecoEmpresa[] = JSON.parse(decoded);
      this.logger.debug(`Retornadas ${data.length} linhas de preco`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar precos:', error);
      return [];
    }
  }

  /**
   * Busca FUNCIONÁRIOS MOVIMENTADOS (215452) - para headcount
   */
  private async fetchFuncionarios(): Promise<any[]> {
    const credentials = getSocExportCredentials('SOC_ED_FUNCIONARIOS_MOVIMENTADO', this.configService);

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug('Buscando funcionarios movimentados via SOC (215452)');
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) return [];
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error('Erro ao buscar funcionarios:', error);
      return [];
    }
  }

  private parseMoney(val: string | number): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // SOC retorna como "1.234,56" ou "1234.56"
    const cleaned = String(val).replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  private aggregateKPIs(faturamento: SocFaturamento[], precoEmpresas: SocPrecoEmpresa[]): EsocialKPIs {
    // Filtrar empresas que fazem eSocial (tipoCobranca indica eSocial)
    const empresasEsocial = new Set<string>();
    for (const p of precoEmpresas) {
      if (p.tipoCobranca && (p.tipoCobranca.toLowerCase().includes('esocial') || p.tipoCobranca !== '')) {
        empresasEsocial.add(p.codigoEmpresa);
      }
    }

    // Agregar eventos eSocial do faturamento
    let totalEventosEsocial = 0;
    let totalValorEventos = 0;
    const empresasComEventos = new Set<string>();

    for (const f of faturamento) {
      const qtd = parseInt(String(f.quantidadeEventosEsocial || '0'), 10);
      if (qtd > 0) {
        totalEventosEsocial += qtd;
        totalValorEventos += this.parseMoney(f.valorEvento || '0');
        empresasComEventos.add(f.codigoEmpresa);
      }
    }

    // Total de empresas unicas no faturamento
    const totalEmpresasFaturamento = new Set(faturamento.map((f) => f.codigoEmpresa)).size;

    return {
      totalEmpresas: empresasComEventos.size,
      pctInconsistentes: 0, // Sem dados de inconsistencias no export
      totalRegistrosXml: totalEventosEsocial,
      conclusao: { qtd: 0, pct: 0 },
      inconsistencias: { qtd: 0, pct: 0 },
      pendente: { qtd: 0, pct: 0 },
      excluido: { qtd: 0, pct: 0 },
      assinado: { qtd: 0, pct: 0 },
      ultimaAtualizacao: new Date().toISOString(),
      valorTotalEventos: totalValorEventos,
      empresasEsocial: empresasEsocial.size,
      empresasComEventos: empresasComEventos.size,
      empresasFaturamento: totalEmpresasFaturamento,
    };
  }

  private aggregateEventosPorEmpresa(faturamento: SocFaturamento[]): ComparativoEmpresaItem[] {
    const map: Record<string, { empresa: string; total: number; valor: number }> = {};

    for (const f of faturamento) {
      const qtd = parseInt(String(f.quantidadeEventosEsocial || '0'), 10);
      if (qtd <= 0) continue;

      const key = f.empresa || f.codigoEmpresa;
      if (!map[key]) map[key] = { empresa: key, total: 0, valor: 0 };
      map[key].total += qtd;
      map[key].valor += this.parseMoney(f.valorEvento || '0');
    }

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
      .map((item) => ({
        empresa: item.empresa,
        totalRegistros: item.total,
        pctConcluido: 0,
        valor: item.valor,
      }));
  }

  private aggregateEventosPorMes(faturamento: SocFaturamento[]): EvolucaoMensalItem[] {
    const map: Record<string, number> = {};

    for (const f of faturamento) {
      const qtd = parseInt(String(f.quantidadeEventosEsocial || '0'), 10);
      if (qtd <= 0) continue;

      const key = `${f.mesCobranca || '00'}`;
      map[key] = (map[key] || 0) + qtd;
    }

    const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, qtd]) => ({
        label: meses[parseInt(key, 10)] || key,
        qtd,
      }));
  }

  private aggregateValorPorEmpresa(faturamento: SocFaturamento[]): NaoConcluidoEmpresaItem[] {
    const map: Record<string, { empresa: string; valor: number }> = {};

    for (const f of faturamento) {
      const valor = this.parseMoney(f.valorEvento || '0');
      if (valor <= 0) continue;

      const key = f.empresa || f.codigoEmpresa;
      if (!map[key]) map[key] = { empresa: key, valor: 0 };
      map[key].valor += valor;
    }

    return Object.values(map)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
      .map((item) => ({
        empresa: item.empresa,
        inconsistencias: 0,
        pendente: 0,
        assinado: 0,
        excluido: 0,
        valor: item.valor,
      }));
  }

  private aggregateEventosPorProduto(faturamento: SocFaturamento[]): EventoDonutItem[] {
    const map: Record<string, number> = {};

    for (const f of faturamento) {
      const qtd = parseInt(String(f.quantidadeEventosEsocial || '0'), 10);
      if (qtd <= 0) continue;

      const produto = f.produto || 'Sem Produto';
      map[produto] = (map[produto] || 0) + qtd;
    }

    const total = Object.values(map).reduce((s, v) => s + v, 0);

    return Object.entries(map)
      .map(([evento, qtd]) => ({
        evento,
        qtd,
        pct: total > 0 ? Math.round((qtd / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd);
  }

  private aggregateVidasPorEmpresa(faturamento: SocFaturamento[]): StatusMesItem[] {
    const map: Record<string, StatusMesItem> = {};

    for (const f of faturamento) {
      const key = f.empresa || f.codigoEmpresa;
      if (!map[key]) {
        map[key] = { mes: key, concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
      }
      map[key].concluido += parseInt(String(f.quantidadeVidas || '0'), 10);
      map[key].inconsistencias += parseInt(String(f.quantidadeEventosEsocial || '0'), 10);
    }

    return Object.values(map)
      .sort((a, b) => b.concluido - a.concluido)
      .slice(0, 15);
  }

  getDashboardData(
    dataInicial?: string,
    dataFinal?: string,
    eventoFiltro?: string,
    statusFiltro?: string,
  ): Promise<EsocialDashboardData> {
    const now = Date.now();
    if (this.cache && this.cache.expires > now) {
      return Promise.resolve(this.cache.data);
    }
    return this.buildDashboard(dataInicial, dataFinal, eventoFiltro, statusFiltro);
  }

  private async buildDashboard(
    dataInicial?: string,
    dataFinal?: string,
    eventoFiltro?: string,
    statusFiltro?: string,
  ): Promise<EsocialDashboardData> {
    // Buscar dados dos exports SOC
    const [faturamento, precoEmpresas] = await Promise.all([
      this.fetchFaturamento(dataInicial, dataFinal),
      this.fetchPrecoEmpresas(),
    ]);

    const kpis = this.aggregateKPIs(faturamento, precoEmpresas);
    const eventosPorEmpresa = this.aggregateEventosPorEmpresa(faturamento);
    const eventosPorMes = this.aggregateEventosPorMes(faturamento);
    const valorPorEmpresa = this.aggregateValorPorEmpresa(faturamento);
    const eventosPorProduto = this.aggregateEventosPorProduto(faturamento);
    const vidasPorEmpresa = this.aggregateVidasPorEmpresa(faturamento);

    const empresasList = [...new Set(faturamento.map((f) => f.empresa || f.codigoEmpresa))].sort();

    const data: EsocialDashboardData = {
      kpis,
      statusXml: [],
      eventosDonut: eventosPorProduto,
      evolucaoMensal: eventosPorMes,
      statusPorMes: vidasPorEmpresa,
      comparativoEmpresas: eventosPorEmpresa,
      naoConcluidosEmpresa: valorPorEmpresa,
      registros: [],
      empresas: empresasList,
      totalRegistros: faturamento.length,
      filtros: {
        empresas: empresasList,
        eventos: [],
        status: [],
        dataInicio: dataInicial || '',
        dataFim: dataFinal || '',
      },
    };

    this.cache = { data, expires: Date.now() + this.CACHE_TTL_MS };
    return data;
  }

  clearCache(): void {
    this.cache = null;
  }
}