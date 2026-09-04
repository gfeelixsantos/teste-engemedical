import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../soc/utils/soc-export-data-url';
import type {
  SocPrecoEmpresa,
  RegistroEsocial,
  EsocialKPIs,
  StatusXmlItem,
  EventoDonutItem,
  EvolucaoMensalItem,
  StatusMesItem,
  ComparativoEmpresaItem,
  NaoConcluidoEmpresaItem,
  MatrizAnoItem,
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

  async fetchEmpresasEsocial(): Promise<SocPrecoEmpresa[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_PRECOS',
      this.configService,
    );

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
      this.logger.debug('Buscando empresas eSocial via SOC');
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        this.logger.error(`Falha ao buscar empresas eSocial: ${response.status}`);
        return [];
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data: SocPrecoEmpresa[] = JSON.parse(decoded);
      this.logger.debug(`Retornadas ${data.length} empresas`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar empresas eSocial:', error);
      return [];
    }
  }

  private generateMockRegistros(empresas: SocPrecoEmpresa[]): RegistroEsocial[] {
    const eventos: Array<'S2210' | 'S2220' | 'S2230' | 'S2240' | 'Sem evento identificado'> = [
      'S2240', 'S2220', 'S2230', 'S2210', 'Sem evento identificado',
    ];
    const status: Array<'Concluido' | 'Inconsistencias' | 'Pendente' | 'Excluido' | 'Assinado'> = [
      'Concluido', 'Inconsistencias', 'Pendente', 'Excluido', 'Assinado',
    ];
    const weightsEvento = [60, 39, 1, 0.5, 0.5];
    const weightsStatus = [64, 33, 2, 0.5, 0.5];
    const meses = [
      '', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ];

    const rows: RegistroEsocial[] = [];
    let idCounter = 1;
    const targetCount = 2500;

    for (let i = 0; i < targetCount; i++) {
      const emp = empresas[Math.floor(Math.random() * empresas.length)];
      const yr = 2023 + Math.floor(Math.random() * 4);
      const maxM = yr === 2026 ? 8 : 12;
      const mNum = 1 + Math.floor(Math.random() * maxM);
      const day = 1 + Math.floor(Math.random() * 28);

      const ev = this.weightedRandom(eventos, weightsEvento);
      const st = this.weightedRandom(status, weightsStatus);

      rows.push({
        id: idCounter++,
        codigoEmpresa: emp?.codigoEmpresa || '',
        empresa: emp?.nomeEmpresa || 'Empresa Nao Informada',
        cnpj: '',
        unidade: emp?.nomeUnidade || '',
        evento: ev,
        statusEvento: st,
        dataGeracao: `${yr}-${String(mNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        ano: yr,
        mesNum: mNum,
        mesNome: meses[mNum] || '',
        funcionario: `COLABORADOR ${1000 + Math.floor(Math.random() * 9000)}`,
        nrRecibo: st === 'Concluido' ? `1.${1000000 + Math.floor(Math.random() * 9000000)}` : '',
        codigoGed: `GED-${10000 + Math.floor(Math.random() * 90000)}`,
        nomeArquivo: `${ev}_${String(day).padStart(2, '0')}${String(mNum).padStart(2, '0')}${yr}.xml`,
        erro: st === 'Inconsistencias' ? 'Codigo de erro eSocial 1002: Inconsistencia nos dados cadastrais ou ambiente.' : '',
      });
    }

    return rows;
  }

  private weightedRandom<T>(arr: T[], weights: number[]): T {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let acc = 0;
    for (let i = 0; i < arr.length; i++) {
      acc += weights[i];
      if (r <= acc) return arr[i];
    }
    return arr[arr.length - 1];
  }

  private computeKPIs(registros: RegistroEsocial[]): EsocialKPIs {
    const empresasSet = new Set(registros.map((r) => r.empresa));
    const total = registros.length;
    const conc = registros.filter((r) => r.statusEvento === 'Concluido').length;
    const inc = registros.filter((r) => r.statusEvento === 'Inconsistencias').length;
    const pen = registros.filter((r) => r.statusEvento === 'Pendente').length;
    const exc = registros.filter((r) => r.statusEvento === 'Excluido').length;
    const asi = registros.filter((r) => r.statusEvento === 'Assinado').length;

    return {
      totalEmpresas: empresasSet.size,
      pctInconsistentes: total > 0 ? Math.round((inc / total) * 10000) / 100 : 0,
      totalRegistrosXml: total,
      conclusao: { qtd: conc, pct: total > 0 ? Math.round((conc / total) * 10000) / 100 : 0 },
      inconsistencias: { qtd: inc, pct: total > 0 ? Math.round((inc / total) * 10000) / 100 : 0 },
      pendente: { qtd: pen, pct: total > 0 ? Math.round((pen / total) * 10000) / 100 : 0 },
      excluido: { qtd: exc, pct: total > 0 ? Math.round((exc / total) * 10000) / 100 : 0 },
      assinado: { qtd: asi, pct: total > 0 ? Math.round((asi / total) * 10000) / 100 : 0 },
      ultimaAtualizacao: new Date().toISOString(),
    };
  }

  private aggregateStatusXml(registros: RegistroEsocial[]): StatusXmlItem[] {
    const map: Record<string, number> = {};
    for (const r of registros) {
      map[r.statusEvento] = (map[r.statusEvento] || 0) + 1;
    }
    const total = registros.length;
    return Object.entries(map)
      .map(([status, qtd]) => ({
        status,
        qtd,
        pct: total > 0 ? Math.round((qtd / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd);
  }

  private aggregateEventosDonut(registros: RegistroEsocial[]): EventoDonutItem[] {
    const map: Record<string, number> = {};
    for (const r of registros) {
      map[r.evento] = (map[r.evento] || 0) + 1;
    }
    const total = registros.length;
    return Object.entries(map)
      .map(([evento, qtd]) => ({
        evento,
        qtd,
        pct: total > 0 ? Math.round((qtd / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd);
  }

  private aggregateEvolucaoMensal(registros: RegistroEsocial[]): EvolucaoMensalItem[] {
    const map: Record<string, number> = {};
    for (const r of registros) {
      const key = `${r.ano}-${String(r.mesNum).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, qtd]) => ({ label, qtd }));
  }

  private aggregateStatusPorMes(registros: RegistroEsocial[]): StatusMesItem[] {
    const map: Record<string, StatusMesItem> = {};
    for (const r of registros) {
      const key = `${r.ano} ${r.mesNome}`;
      if (!map[key]) {
        map[key] = { mes: key, concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
      }
      switch (r.statusEvento) {
        case 'Concluido': map[key].concluido++; break;
        case 'Inconsistencias': map[key].inconsistencias++; break;
        case 'Pendente': map[key].pendente++; break;
        case 'Assinado': map[key].assinado++; break;
        case 'Excluido': map[key].excluido++; break;
      }
    }
    return Object.values(map).sort((a, b) => b.concluido - a.concluido);
  }

  private aggregateComparativoEmpresas(registros: RegistroEsocial[]): ComparativoEmpresaItem[] {
    const map: Record<string, { total: number; concluidos: number }> = {};
    for (const r of registros) {
      if (!map[r.empresa]) map[r.empresa] = { total: 0, concluidos: 0 };
      map[r.empresa].total++;
      if (r.statusEvento === 'Concluido') map[r.empresa].concluidos++;
    }
    return Object.entries(map)
      .map(([empresa, data]) => ({
        empresa,
        totalRegistros: data.total,
        pctConcluido: data.total > 0 ? Math.round((data.concluidos / data.total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.totalRegistros - a.totalRegistros)
      .slice(0, 10);
  }

  private aggregateNaoConcluidosEmpresa(registros: RegistroEsocial[]): NaoConcluidoEmpresaItem[] {
    const map: Record<string, NaoConcluidoEmpresaItem> = {};
    for (const r of registros) {
      if (r.statusEvento === 'Concluido') continue;
      if (!map[r.empresa]) {
        map[r.empresa] = { empresa: r.empresa, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
      }
      switch (r.statusEvento) {
        case 'Inconsistencias': map[r.empresa].inconsistencias++; break;
        case 'Pendente': map[r.empresa].pendente++; break;
        case 'Assinado': map[r.empresa].assinado++; break;
        case 'Excluido': map[r.empresa].excluido++; break;
      }
    }
    return Object.values(map)
      .sort((a, b) => (b.inconsistencias + b.pendente + b.assinado + b.excluido) - (a.inconsistencias + a.pendente + a.assinado + a.excluido))
      .slice(0, 10);
  }

  private aggregateMatriz(registros: RegistroEsocial[]) {
    const years: Record<number, MatrizAnoItem> = {};

    for (const r of registros) {
      const yr = r.ano;
      if (!years[yr]) {
        years[yr] = { ano: yr, concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0, meses: [] };
      }
      const year = years[yr];

      let mes = year.meses.find((m) => m.mesNum === r.mesNum);
      if (!mes) {
        mes = { mes: r.mesNome, mesNum: r.mesNum, concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0, eventos: [] };
        year.meses.push(mes);
      }

      let ev = mes.eventos.find((e) => e.evento === r.evento);
      if (!ev) {
        ev = { evento: r.evento, concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0, empresas: [] };
        mes.eventos.push(ev);
      }

      let emp = ev.empresas.find((e) => e.nome === r.empresa);
      if (!emp) {
        emp = { nome: r.empresa, concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
        ev.empresas.push(emp);
      }

      const increment = (target: Record<string, number>, field: string) => {
        target[field] = (target[field] || 0) + 1;
      };

      switch (r.statusEvento) {
        case 'Concluido':
          year.concluido++; mes.concluido++; ev.concluido++; emp.concluido++; break;
        case 'Inconsistencias':
          year.inconsistencias++; mes.inconsistencias++; ev.inconsistencias++; emp.inconsistencias++; break;
        case 'Pendente':
          year.pendente++; mes.pendente++; ev.pendente++; emp.pendente++; break;
        case 'Assinado':
          year.assinado++; mes.assinado++; ev.assinado++; emp.assinado++; break;
        case 'Excluido':
          year.excluido++; mes.excluido++; ev.excluido++; emp.excluido++; break;
      }
    }

    const totais = { concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
    for (const y of Object.values(years)) {
      totais.concluido += y.concluido;
      totais.inconsistencias += y.inconsistencias;
      totais.pendente += y.pendente;
      totais.assinado += y.assinado;
      totais.excluido += y.excluido;
    }

    return {
      ano: new Date().getFullYear(),
      totais,
      anos: Object.values(years).sort((a, b) => a.ano - b.ano),
    };
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
    const empresas = await this.fetchEmpresasEsocial();
    let registros = this.generateMockRegistros(empresas);

    // Aplicar filtros
    if (dataInicial) {
      registros = registros.filter((r) => r.dataGeracao >= dataInicial);
    }
    if (dataFinal) {
      registros = registros.filter((r) => r.dataGeracao <= dataFinal);
    }
    if (eventoFiltro && eventoFiltro !== 'Todos') {
      registros = registros.filter((r) => r.evento === eventoFiltro);
    }
    if (statusFiltro && statusFiltro !== 'Todos') {
      registros = registros.filter((r) => r.statusEvento === statusFiltro);
    }

    const kpis = this.computeKPIs(registros);
    const statusXml = this.aggregateStatusXml(registros);
    const eventosDonut = this.aggregateEventosDonut(registros);
    const evolucaoMensal = this.aggregateEvolucaoMensal(registros);
    const statusPorMes = this.aggregateStatusPorMes(registros);
    const comparativoEmpresas = this.aggregateComparativoEmpresas(registros);
    const naoConcluidosEmpresa = this.aggregateNaoConcluidosEmpresa(registros);
    const matriz = this.aggregateMatriz(registros);

    const empresasList = [...new Set(registros.map((r) => r.empresa))].sort();

    const data: EsocialDashboardData = {
      kpis,
      statusXml,
      eventosDonut,
      evolucaoMensal,
      statusPorMes,
      comparativoEmpresas,
      naoConcluidosEmpresa,
      matriz,
      registros: registros.slice(0, 500),
      empresas: empresasList,
      totalRegistros: registros.length,
      filtros: {
        empresas: empresasList,
        eventos: ['S2210', 'S2220', 'S2230', 'S2240', 'Sem evento identificado'],
        status: ['Concluido', 'Inconsistencias', 'Pendente', 'Excluido', 'Assinado'],
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