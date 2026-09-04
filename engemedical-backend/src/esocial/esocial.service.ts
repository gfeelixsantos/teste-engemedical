import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../soc/utils/soc-export-data-url';
import type {
  SocEventoEsocial,
  RegistroEsocial,
  EsocialKPIs,
  StatusItem,
  LayoutItem,
  EvolucaoMensalItem,
  StatusMesItem,
  EmpresaStatusItem,
  EsocialDashboardData,
  LayoutEvento,
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
   * Busca Eventos eSocial via SOC Exporta Dados 186601
   */
  private async fetchEventosEsocial(
    dataInicio: string,
    dataFim: string,
    empresaTrabalho?: string,
    status?: string,
    layout?: string,
  ): Promise<RegistroEsocial[]> {
    const credentials = getSocExportCredentials('SOC_ED_ESOCIAL_EVENTOS', this.configService);

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      dataInicio,
      dataFim,
      empresaTrabalho: empresaTrabalho || '',
      status: status || '99',
      layout: layout || '0',
      unidade: '0',
      ambiente: '1',
      funcionario: '',
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug(`Buscando eventos eSocial SOC 186601 | ${dataInicio} a ${dataFim}`);
      const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) {
        this.logger.error(`Falha ao buscar eventos eSocial: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const raw: SocEventoEsocial[] = JSON.parse(decoded);
      this.logger.debug(`Retornados ${raw.length} registros do SOC`);

      return raw.map((r) => this.mapRow(r)).filter((r) => r !== null) as RegistroEsocial[];
    } catch (error) {
      this.logger.error('Erro ao buscar eventos eSocial:', error);
      return [];
    }
  }

  private mapRow(row: SocEventoEsocial): RegistroEsocial | null {
    const layout = this.normalizeLayout(row['COD EVENTO'] || row.EVENTO || '');
    const status = this.normalizeStatus(row.STATUSEVENTO || '');
    const empresa = row.EMPRESA || row.CODIGOEMPRESA || 'Sem empresa';
    const funcionario = row.NOMEFUNCIONARIO || row.FUNCIONARIO || '';
    const dataGeracao = this.parseDate(row.DATAGERACAO || '');

    if (layout === 'Sem evento identificado' && status === '' && !empresa && !funcionario && !dataGeracao) {
      return null;
    }

    return {
      codigoEmpresa: row.CODIGOEMPRESA || '',
      empresa,
      cnpj: row.CNPJ || '',
      subgrupo: row.SUBGRUPO || '',
      unidade: row.NOMEUNIDADE || '',
      classificacaoEmpresa: row.ClassificacaoEmpresa || '',
      layout,
      evento: row.EVENTO || '',
      dataGeracao,
      codigoGed: row.CODIGOGED || '',
      nomeArquivo: row.NOMEARQUIVO || '',
      codigoFuncionario: row.FUNCIONARIO || '',
      funcionario,
      statusEvento: (status as any) || 'Sem status',
      nrRecibo: row.NRRECIBO || '',
      erro: row.ERRO || '',
      codigoErroEsocial: row.CODIGOERROESOCIAL || '',
      ambiente: row.AMBIENTEPRODUCAO || '',
      cargaInicial: row.CARGAINICIAL || '',
      solucaoEsocial: row['Solucao eSocial'] || '',
    };
  }

  private normalizeLayout(value: string): LayoutEvento {
    const upper = value.toUpperCase().trim();
    const match = upper.match(/S?-?(22(?:10|20|21|30|40))/);
    if (match) return ('S' + match[1]) as LayoutEvento;
    if (upper.includes('2221')) return 'S2221';
    return 'Sem evento identificado' as LayoutEvento;
  }

  private normalizeStatus(status: string): string {
    const upper = status.toUpperCase().trim();
    if (upper.includes('CONCLUID')) return 'Concluido';
    if (upper.includes('ERRO') || upper.includes('INCONSIST')) return 'Inconsistencias';
    if (upper.includes('PENDENTE')) return 'Pendente';
    if (upper.includes('EXCLUID')) return 'Excluido';
    if (upper.includes('ASSINADO')) return 'Assinado';
    if (upper.includes('PROCESS')) return 'Processando';
    if (upper.includes('REPROCESS')) return 'Reprocessar';
    if (upper.includes('IGNORADO')) return 'Ignorado';
    if (upper.includes('APTO')) return 'Apto para envio';
    if (upper.includes('INTEGRACAO')) return 'Integracao';
    return status;
  }

  private parseDate(raw: string): string {
    if (!raw) return '';
    // SOC pode retornar como DD/MM/YYYY ou YYYY-MM-DD ou /Date(timestamp)/
    if (raw.startsWith('/Date(')) {
      const ts = parseInt(raw.replace(/\/Date\((\d+).*\//, '$1'), 10);
      return new Date(ts).toISOString().split('T')[0];
    }
    if (raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return raw;
  }

  private monthKey(dataGeracao: string): string {
    if (!dataGeracao || dataGeracao.length < 7) return '';
    return dataGeracao.substring(0, 7); // YYYY-MM
  }

  private buildDashboard(rows: RegistroEsocial[], dataInicio: string, dataFim: string): EsocialDashboardData {
    const empresasSet = new Set<string>();
    let concluidos = 0;
    let inconsistencias = 0;
    let pendentes = 0;

    const layouts: Record<string, number> = {};
    const porStatus: Record<string, number> = {};
    const porLayout: Record<string, number> = {};
    const porMes: Record<string, number> = {};
    const porMesStatus: Record<string, any> = {};
    const porEmpresa: Record<string, number> = {};
    const porEmpresaStatus: Record<string, any> = {};
    const porErro: Record<string, number> = {};

    for (const row of rows) {
      empresasSet.add(row.empresa);

      if (row.statusEvento === 'Concluido') concluidos++;
      else if (row.statusEvento === 'Inconsistencias') inconsistencias++;
      else if (row.statusEvento === 'Pendente') pendentes++;

      layouts[row.layout] = (layouts[row.layout] || 0) + 1;
      porStatus[row.statusEvento] = (porStatus[row.statusEvento] || 0) + 1;
      porLayout[row.layout] = (porLayout[row.layout] || 0) + 1;

      const mes = this.monthKey(row.dataGeracao);
      if (mes) {
        porMes[mes] = (porMes[mes] || 0) + 1;
        if (!porMesStatus[mes]) porMesStatus[mes] = { concluido: 0, inconsistencias: 0, pendente: 0, excluido: 0, assinado: 0, outros: 0 };
        this.incrementStatus(porMesStatus[mes], row.statusEvento);
      }

      porEmpresa[row.empresa] = (porEmpresa[row.empresa] || 0) + 1;
      if (!porEmpresaStatus[row.empresa]) {
        porEmpresaStatus[row.empresa] = { empresa: row.empresa, totalRegistros: 0, concluido: 0, inconsistencias: 0, pendente: 0, excluido: 0, assinado: 0 };
      }
      porEmpresaStatus[row.empresa].totalRegistros++;
      this.incrementStatus(porEmpresaStatus[row.empresa], row.statusEvento);

      const erro = row.codigoErroEsocial || row.erro;
      if (erro) porErro[erro] = (porErro[erro] || 0) + 1;
    }

    const total = rows.length;
    const taxaConclusao = total > 0 ? Math.round((concluidos / total) * 10000) / 100 : 0;

    const sortedMeses = Object.keys(porMes).sort();
    const sortedEmpresas = Object.entries(porEmpresa).sort((a, b) => b[1] - a[1]).slice(0, 12);

    return {
      success: true,
      kpis: {
        totalRegistros: total,
        totalEmpresas: empresasSet.size,
        concluidos,
        inconsistencias,
        pendentes,
        taxaConclusao,
      },
      layouts,
      charts: {
        por_status: Object.entries(porStatus).map(([status, qtd]) => ({ status, qtd })).sort((a, b) => b.qtd - a.qtd),
        por_layout: Object.entries(porLayout).map(([layout, qtd]) => ({ layout, qtd })).sort((a, b) => b.qtd - a.qtd),
        por_mes: sortedMeses.map((mes) => ({ mes, qtd: porMes[mes] })),
        por_mes_status: sortedMeses.map((mes) => ({ mes, ...porMesStatus[mes] })),
        por_empresa: sortedEmpresas.map(([empresa, qtd]) => ({ status: empresa, qtd })),
        por_empresa_status: Object.values(porEmpresaStatus).slice(0, 12),
        por_erro: Object.entries(porErro).map(([erro, qtd]) => ({ status: erro, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 10),
      },
      matrix: {},
      rows: rows.slice(0, 1000),
      meta: {
        periodo: { dataInicio, dataFim },
        dataBase: new Date().toISOString(),
        fonte: 'SOC Exporta Dados 186601 - Eventos eSocial',
      },
      filtros: {
        empresas: [...empresasSet].sort(),
        layouts: ['S2210', 'S2220', 'S2230', 'S2240', 'Sem evento identificado'],
        status: ['Concluido', 'Inconsistencias', 'Pendente', 'Excluido', 'Assinado'],
      },
    };
  }

  private incrementStatus(obj: any, status: string): void {
    switch (status) {
      case 'Concluido': obj.concluido++; break;
      case 'Inconsistencias': obj.inconsistencias++; break;
      case 'Pendente': obj.pendente++; break;
      case 'Excluido': obj.excluido++; break;
      case 'Assinado': obj.assinado++; break;
      default: obj.outros = (obj.outros || 0) + 1;
    }
  }

  async getDashboardData(
    dataInicio?: string,
    dataFim?: string,
    empresaTrabalho?: string,
    status?: string,
    layout?: string,
  ): Promise<EsocialDashboardData> {
    const now = Date.now();
    if (this.cache && this.cache.expires > now && !dataInicio && !dataFim) {
      return this.cache.data;
    }

    // Default: ultimos 365 dias
    if (!dataInicio || !dataFim) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 365);
      dataInicio = dataInicio || start.toISOString().split('T')[0];
      dataFim = dataFim || end.toISOString().split('T')[0];
    }

    const rows = await this.fetchEventosEsocial(dataInicio, dataFim, empresaTrabalho, status, layout);
    const dashboard = this.buildDashboard(rows, dataInicio, dataFim);

    this.cache = { data: dashboard, expires: Date.now() + this.CACHE_TTL_MS };
    return dashboard;
  }

  clearCache(): void {
    this.cache = null;
  }
}