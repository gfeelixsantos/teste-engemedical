import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../soc/utils/soc-export-data-url';
import * as fs from 'fs';
import * as path from 'path';
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
  private staticData: RegistroEsocial[] | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(EsocialService.name);
  }

  private loadStaticData(): RegistroEsocial[] {
    if (this.staticData && this.staticData.length > 0) return this.staticData;

    try {
      // Tentar carregar do projeto onboardingengemedical
      const dataPath = path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        'Desktop',
        'WORKSPACE',
        'onboardingengemedical',
        'data',
        'esocial_data.json',
      );

      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.staticData = parsed.map((r: any) => ({
          id: r.id,
          codigoEmpresa: String(r.codigo_empresa || ''),
          empresa: r.empresa || '',
          cnpj: r.cnpj || '',
          unidade: r.unidade || '',
          evento: r.evento || 'Sem evento identificado',
          statusEvento: r.status_evento || 'Pendente',
          dataGeracao: r.data_geracao || '',
          ano: r.ano || 0,
          mesNum: r.mes_num || 0,
          mesNome: r.mes_nome || '',
          funcionario: r.funcionario || '',
          nrRecibo: r.nr_recibo || '',
          codigoGed: r.codigo_ged || '',
          nomeArquivo: r.nome_arquivo || '',
          erro: r.erro || '',
        }));
        const data = this.staticData as RegistroEsocial[];
        this.logger.debug(`Carregados ${data.length} registros eSocial do arquivo estatico`);
        return data;
      }
    } catch (error) {
      this.logger.warn('Arquivo estatico eSocial nao encontrado, usando mock');
    }

    // Fallback: gerar dados mock
    return this.generateMockRegistros();
  }

  private generateMockRegistros(): RegistroEsocial[] {
    const empresas = [
      { nome: 'GRUPO TORA', cnpj: '12.345.678/0001-90' },
      { nome: 'INSTITUTO MIRANTE DE CULTURA E ARTE', cnpj: '23.456.789/0001-01' },
      { nome: 'ASO AVULSO - TORA TRANSPORTES', cnpj: '34.567.890/0001-12' },
      { nome: 'IMPACTO SERVICOS E TERCEIRIZACAO LTDA', cnpj: '45.678.901/0001-23' },
      { nome: 'NORTEARH SERVICES LOCACAO DE MAO DE OBRA LTDA', cnpj: '56.789.012/0001-34' },
      { nome: 'MCD SERVICOS DE BUFFET LTDA', cnpj: '67.890.123/0001-45' },
      { nome: 'MISPA SEGURANCA LTDA', cnpj: '78.901.234/0001-56' },
      { nome: 'GO COMERCIO DE ARTIGOS ELETRONICOS E ACESSORIOS LTDA', cnpj: '89.012.345/0001-67' },
      { nome: 'ELETRICAL SERVICE AUTOMACAO LTDA', cnpj: '48.780.133/0001-54' },
      { nome: 'GRISOLIA E FILHAS LTDA', cnpj: '90.123.456/0001-78' },
      { nome: 'HERC COMERCIO DE EQUIPAMENTOS E SERVICOS', cnpj: '01.234.567/0001-89' },
      { nome: 'IRISTECH AUTOMACAO E TECNOLOGIA LTDA', cnpj: '11.223.344/0001-99' },
    ];

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
        codigoEmpresa: String(100 + Math.floor(Math.random() * 900)),
        empresa: emp.nome,
        cnpj: emp.cnpj,
        unidade: ['MATRIZ', 'FILIAL FORTALEZA', 'UNIDADE REGIONAL JUAZEIRO', 'UNIDADE SOBRAL'][Math.floor(Math.random() * 4)],
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
    // Carregar dados do arquivo estatico ou mock
    let registros = this.loadStaticData();

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