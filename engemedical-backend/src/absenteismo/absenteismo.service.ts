import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
  safeParseSocJson,
} from '../soc/utils/soc-export-data-url';
import type {
  SocLicencaMedica,
  LicencaNormalizada,
  AbsenteismoKPIs,
  PorMesLinha,
  PorEmpresaBar,
  PorCidBar,
  AbsenteismoDashboardData,
} from './absenteismo.types';

@Injectable()
export class AbsenteismoService {
  private cache: { data: AbsenteismoDashboardData; expires: number } | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(AbsenteismoService.name);
  }

  async fetchLicencas(
    dataInicial?: string,
    dataFinal?: string,
  ): Promise<SocLicencaMedica[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_LICENCA_MEDICA',
      this.configService,
    );

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      listaFuncionario: '',
      dataInicio: dataInicial || '',
      dataFim: dataFinal || '',
      dataInicioCriacao: '',
      dataFimCriacao: '',
      dataAlteracao: '',
      tipoAtestado: '0',
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug('Buscando licencas medicas do SOC');
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        this.logger.error(`Falha ao buscar licencas: ${response.status}`);
        return [];
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const data = safeParseSocJson<SocLicencaMedica>(decoded, 'licencas', this.logger);
      this.logger.debug(`Retornadas ${data.length} licencas`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar licencas:', error);
      return [];
    }
  }

  private parseDateBR(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr);
  }

  private calcDiasPerdidos(inicio: string, fim: string): number {
    const d1 = this.parseDateBR(inicio);
    const d2 = this.parseDateBR(fim);
    if (!d1 || !d2) return 1;
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }

  private normalizeLicenca(raw: SocLicencaMedica): LicencaNormalizada {
    const inicio = raw.dataInicioAfastamento || '';
    const fim = raw.dataFimAfastamento || '';
    const diasPerdidos = this.calcDiasPerdidos(inicio, fim);
    const custoDireto = diasPerdidos * 120;
    const custoIndireto = Math.round(custoDireto * 0.56 * 100) / 100;

    return {
      codigoSequencial: raw.codigoSequencialLicenca,
      codigoFuncionario: raw.codigoFuncionario,
      cpfFuncionario: raw.cpfFuncionario,
      matriculaFuncionario: raw.matriculaFuncionario,
      dataFicha: raw.dataFicha,
      dataInicio: inicio,
      dataFim: fim,
      diasPerdidos,
      horasAfastado: raw.HorasAfastado,
      tipoAfastamento: raw.tipoDeAfastamento || raw.descricaoMotivo || 'Nao Informado',
      cid: raw.cidContestado || raw.cids || 'Sem CID',
      cidGrupo: raw.cidESocial || raw.tipoCid || 'Nao Informado',
      descricaoMotivo: raw.descricaoMotivo || 'Nao Informado',
      empresaCodigo: raw.codigoEmpresaFuncionario,
      custoDireto,
      custoIndireto,
      custoTotal: custoDireto + custoIndireto,
    };
  }

  computeKPIs(licencas: LicencaNormalizada[], totalFuncionarios: number): AbsenteismoKPIs {
    const totalAtestados = licencas.length;
    const totalDiasPerdidos = licencas.reduce((sum, l) => sum + l.diasPerdidos, 0);
    const custoDireto = licencas.reduce((sum, l) => sum + l.custoDireto, 0);
    const custoIndireto = licencas.reduce((sum, l) => sum + l.custoIndireto, 0);
    const taxaFrequencia = totalFuncionarios > 0
      ? Math.round((totalAtestados / totalFuncionarios) * 100) / 100
      : 0;
    const taxaGravidade = totalFuncionarios > 0
      ? Math.round((totalDiasPerdidos / totalFuncionarios) * 100) / 100
      : 0;
    const diasUteisMes = 22 * 8;
    const indiceAbsenteismo = totalFuncionarios > 0
      ? Math.round((totalDiasPerdidos / (totalFuncionarios * diasUteisMes)) * 10000) / 100
      : 0;

    return {
      totalFuncionarios,
      totalAtestados,
      totalDiasPerdidos,
      taxaFrequencia,
      taxaGravidade,
      indiceAbsenteismo,
      custoDireto,
      custoIndireto,
      custoTotal: custoDireto + custoIndireto,
      ultimaAtualizacao: new Date().toISOString(),
    };
  }

  aggregatePorMes(licencas: LicencaNormalizada[]): PorMesLinha[] {
    const mesesPt = [
      '', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];

    const map: Record<number, { diasPerdidos: number; atestados: number }> = {};

    for (const l of licencas) {
      if (!l.dataInicio) continue;
      const d = this.parseDateBR(l.dataInicio);
      if (!d) continue;
      const mes = d.getMonth() + 1;

      if (!map[mes]) {
        map[mes] = { diasPerdidos: 0, atestados: 0 };
      }
      map[mes].diasPerdidos += l.diasPerdidos;
      map[mes].atestados++;
    }

    return Object.entries(map)
      .map(([mes, data]) => ({
        mes: mesesPt[parseInt(mes)] || mes,
        mesNum: parseInt(mes),
        ...data,
      }))
      .sort((a, b) => a.mesNum - b.mesNum);
  }

  aggregatePorEmpresa(licencas: LicencaNormalizada[], empresasMap: Record<string, string>): PorEmpresaBar[] {
    const map: Record<string, { custoTotal: number; diasPerdidos: number }> = {};

    for (const l of licencas) {
      const empresa = empresasMap[l.empresaCodigo] || l.empresaCodigo;
      if (!map[empresa]) {
        map[empresa] = { custoTotal: 0, diasPerdidos: 0 };
      }
      map[empresa].custoTotal += l.custoTotal;
      map[empresa].diasPerdidos += l.diasPerdidos;
    }

    return Object.entries(map)
      .map(([empresa, data]) => ({ empresa, ...data }))
      .sort((a, b) => b.custoTotal - a.custoTotal);
  }

  aggregatePorCid(licencas: LicencaNormalizada[]): PorCidBar[] {
    const map: Record<string, { descricao: string; grupo: string; atestados: number }> = {};

    for (const l of licencas) {
      const cid = l.cid || 'Sem CID';
      if (!map[cid]) {
        map[cid] = { descricao: l.descricaoMotivo, grupo: l.cidGrupo, atestados: 0 };
      }
      map[cid].atestados++;
    }

    return Object.entries(map)
      .map(([cid, data]) => ({ cid, ...data }))
      .sort((a, b) => b.atestados - a.atestados);
  }

  getDashboardData(
    dataInicial?: string,
    dataFinal?: string,
    empresasMap?: Record<string, string>,
    totalFuncionarios?: number,
  ): Promise<AbsenteismoDashboardData> {
    const now = Date.now();
    if (this.cache && this.cache.expires > now) {
      this.logger.debug('Retornando dados do cache Absenteismo');
      return Promise.resolve(this.cache.data);
    }
    return this.buildDashboard(dataInicial, dataFinal, empresasMap, totalFuncionarios);
  }

  private async buildDashboard(
    dataInicial?: string,
    dataFinal?: string,
    empresasMap: Record<string, string> = {},
    totalFuncionarios: number = 52,
  ): Promise<AbsenteismoDashboardData> {
    const raw = await this.fetchLicencas(dataInicial, dataFinal);
    const dados = raw.map((r) => this.normalizeLicenca(r));

    const kpis = this.computeKPIs(dados, totalFuncionarios);
    const porMes = this.aggregatePorMes(dados);
    const porEmpresa = this.aggregatePorEmpresa(dados, empresasMap);
    const porCid = this.aggregatePorCid(dados);
    const empresas = [...new Set(dados.map((d) => empresasMap[d.empresaCodigo] || d.empresaCodigo))].sort();

    const data: AbsenteismoDashboardData = {
      kpis,
      porMes,
      porEmpresa,
      porCid,
      detalhes: dados,
      empresas,
      totalRegistros: dados.length,
      filtros: {
        empresas,
        dataInicio: dataInicial || '',
        dataFim: dataFinal || '',
      },
    };

    this.cache = { data, expires: Date.now() + this.CACHE_TTL_MS };
    return data;
  }

  clearCache(): void {
    this.cache = null;
    this.logger.debug('Cache limpo');
  }
}