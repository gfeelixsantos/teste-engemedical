import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../soc/utils/soc-export-data-url';
import type {
  SocFaturamento,
  SocPreco,
  RegistroVida,
  VidasKPIs,
  CustoPorVidaItem,
  VidasPorProdutoItem,
  VidasDashboardData,
} from './vidas.types';

@Injectable()
export class VidasService {
  private cache: { data: VidasDashboardData; expires: number } | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(VidasService.name);
  }

  /**
   * Busca Faturamento via SOC Exporta Dados 186376
   */
  private async fetchFaturamento(
    dataInicio?: string,
    dataFim?: string,
  ): Promise<SocFaturamento[]> {
    const credentials = getSocExportCredentials('SOC_ED_FATURAMENTO', this.configService);

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      dataInicio: dataInicio || '',
      dataFim: dataFim || '',
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug('Buscando faturamento SOC 186376');
      const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) {
        this.logger.error(`Falha ao buscar faturamento: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const raw: SocFaturamento[] = JSON.parse(decoded);
      this.logger.debug(`Retornados ${raw.length} registros do faturamento`);
      return raw;
    } catch (error) {
      this.logger.error('Erro ao buscar faturamento:', error);
      return [];
    }
  }

  /**
   * Busca Preco via SOC Exporta Dados 218761
   */
  private async fetchPrecos(): Promise<SocPreco[]> {
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
      this.logger.debug('Buscando precos SOC 218761');
      const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) {
        this.logger.error(`Falha ao buscar precos: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const raw: SocPreco[] = JSON.parse(decoded);
      this.logger.debug(`Retornados ${raw.length} registros de precos`);
      return raw;
    } catch (error) {
      this.logger.error('Erro ao buscar precos:', error);
      return [];
    }
  }

  private parseNumber(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private mapFaturamento(rows: SocFaturamento[]): RegistroVida[] {
    return rows
      .filter((r) => r.CODIGO_EMPRESA && r.EMPRESA)
      .map((r) => ({
        codigoEmpresa: r.CODIGO_EMPRESA,
        empresa: r.EMPRESA,
        codigoUnidade: r.CODIGO_UNIDADE,
        unidade: r.UNIDADE,
        codigoProduto: r.CODIGO_PRODUTO,
        produto: r.PRODUTO,
        mesCobranca: r.MES_COBRANCA,
        qtdVidas: this.parseNumber(r.QUANTIDADE_VIDAS),
        valorVida: this.parseNumber(r.VALOR_VIDA),
        valorTotal: this.parseNumber(r.VALOR_TOTAL),
        cidade: '',
        estado: '',
        subgrupo: '',
      }));
  }

  private buildDashboard(
    registros: RegistroVida[],
    precos: SocPreco[],
  ): VidasDashboardData {
    // Enriquecer registros com dados de preco
    const precoMap = new Map<string, SocPreco>();
    for (const p of precos) {
      const key = `${p.codigoEmpresa}|${p.codigoProduto}`;
      if (!precoMap.has(key)) precoMap.set(key, p);
    }

    for (const reg of registros) {
      const key = `${reg.codigoEmpresa}|${reg.codigoProduto}`;
      const preco = precoMap.get(key);
      if (preco) {
        reg.cidade = preco.cidadeEmpresa || preco.cidadeUnidade || '';
        reg.estado = preco.estadoEmpresa || preco.estadoUnidade || '';
        reg.subgrupo = preco.nomeGrupoProduto || '';
      }
    }

    // KPIs
    const empresasSet = new Set<string>();
    let totalVidas = 0;
    let valorTotal = 0;
    const empresasComPlano = new Set<string>();

    for (const reg of registros) {
      empresasSet.add(reg.codigoEmpresa);
      totalVidas += reg.qtdVidas;
      valorTotal += reg.valorTotal;
      if (reg.qtdVidas > 0) empresasComPlano.add(reg.codigoEmpresa);
    }

    const kpis: VidasKPIs = {
      totalRegistros: registros.length,
      totalEmpresas: empresasSet.size,
      totalVidas,
      valorTotalFaturado: valorTotal,
      mediaVidasPorEmpresa: empresasSet.size > 0 ? Math.round(totalVidas / empresasSet.size) : 0,
      empresasComPlano: empresasComPlano.size,
      empresasSemPlano: empresasSet.size - empresasComPlano.size,
    };

    // Custo por vida (Top 12)
    const custoMap = new Map<string, { empresa: string; qtdVidas: number; valorVida: number; valorTotal: number }>();
    for (const reg of registros) {
      const existing = custoMap.get(reg.empresa) || { empresa: reg.empresa, qtdVidas: 0, valorVida: 0, valorTotal: 0 };
      existing.qtdVidas += reg.qtdVidas;
      existing.valorVida += reg.valorVida;
      existing.valorTotal += reg.valorTotal;
      custoMap.set(reg.empresa, existing);
    }
    const custoPorVida = [...custoMap.values()]
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 12);

    // Vidas por produto
    const produtoMap = new Map<string, { produto: string; qtdVidas: number; empresas: Set<string> }>();
    for (const reg of registros) {
      const existing = produtoMap.get(reg.produto) || { produto: reg.produto, qtdVidas: 0, empresas: new Set() };
      existing.qtdVidas += reg.qtdVidas;
      existing.empresas.add(reg.codigoEmpresa);
      produtoMap.set(reg.produto, existing);
    }
    const vidasPorProduto: VidasPorProdutoItem[] = [...produtoMap.values()]
      .map((v) => ({ produto: v.produto, qtdVidas: v.qtdVidas, empresas: v.empresas.size }))
      .sort((a, b) => b.qtdVidas - a.qtdVidas)
      .slice(0, 12);

    // Vidas por empresa
    const vidasPorEmpresa = [...custoMap.values()]
      .sort((a, b) => b.qtdVidas - a.qtdVidas)
      .slice(0, 12);

    return {
      success: true,
      kpis,
      custoPorVida,
      vidasPorProduto,
      vidasPorEmpresa,
      registros: registros.slice(0, 1000),
      meta: {
        dataBase: new Date().toISOString(),
        fonte: 'SOC Exporta Dados 186376 (Faturamento) + 218761 (Preco)',
      },
      filtros: {
        empresas: [...empresasSet].sort(),
        produtos: [...new Set(registros.map((r) => r.produto))].sort(),
      },
    };
  }

  async getDashboardData(
    dataInicio?: string,
    dataFim?: string,
  ): Promise<VidasDashboardData> {
    const now = Date.now();
    if (this.cache && this.cache.expires > now && !dataInicio && !dataFim) {
      return this.cache.data;
    }

    const [faturamento, precos] = await Promise.all([
      this.fetchFaturamento(dataInicio, dataFim),
      this.fetchPrecos(),
    ]);

    const registros = this.mapFaturamento(faturamento);
    const dashboard = this.buildDashboard(registros, precos);

    this.cache = { data: dashboard, expires: Date.now() + this.CACHE_TTL_MS };
    return dashboard;
  }

  clearCache(): void {
    this.cache = null;
  }
}
