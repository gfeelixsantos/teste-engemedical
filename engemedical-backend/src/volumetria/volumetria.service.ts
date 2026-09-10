import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
  safeParseSocJson,
} from '../soc/utils/soc-export-data-url';
import type {
  SocCompromisso,
  VolumetriaKPIs,
  PorAgendaBar,
  PorEmpresaBar,
  PorTipoCompromissoGrouped,
  PorAnoLine,
  PorSubGrupoBar,
  VolumetriaDashboardData,
  CompromissoDetalhe,
  SituacaoNome,
} from './volumetria.types';

// Mapeamento de situacoes do SOC para nomes amigaveis
const SITUACAO_MAP: Record<string, SituacaoNome> = {
  '1': 'Atendido',
  '2': 'NaoAtendido',
  '3': 'AguardandoAtendimento',
  '4': 'Cancelado',
  '5': 'NaoCompareceu',
};

// Situacoes em formato numerico do SOC
const SITUACAO_ATENDIDO = '1';
const SITUACAO_NAO_ATENDIDO = '2';
const SITUACAO_AGUARDANDO = '3';
const SITUACAO_CANCELADO = '4';
const SITUACAO_NAO_COMPARECEU = '5';

@Injectable()
export class VolumetriaService {
  private cache: { data: VolumetriaDashboardData; expires: number } | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(VolumetriaService.name);
  }

  async fetchCompromissos(
    dataInicial?: string,
    dataFinal?: string,
    codigosAgenda?: string[],
  ): Promise<SocCompromisso[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_COMPROMISSOS',
      this.configService,
    );

    // SOC exige datas no formato DD/MM/YYYY
    const hoje = new Date();
    const defaultInicio = new Date(hoje);
    defaultInicio.setDate(hoje.getDate() - 30);

    const formatBR = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const di = dataInicial || formatBR(defaultInicio);
    const df = dataFinal || formatBR(hoje);

    this.logger.debug(`Buscando compromissos SOC: ${di} a ${df}`);

    // SOC exige pelo menos codigosAgendamentos — se não informado, enviar todas
    const DEFAULT_AGENDAS = [
      '02222202', '03781287', '02787023', '03781265',
      '02289144', '03593277', '01820242', '01773500',
      '02088164', '02979233', '03719460', '03357588',
    ];

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      dataInicioCriacaoCompromissoBusca: di,
      dataFimCriacaoCompromissoBusca: df,
      codigosAgendamentos: codigosAgenda && codigosAgenda.length > 0
        ? codigosAgenda.join(',')
        : DEFAULT_AGENDAS.join(','),
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug('Buscando compromissos do SOC');
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        this.logger.error(`Falha ao buscar compromissos: ${response.status}`);
        return [];
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      const data = safeParseSocJson<SocCompromisso>(decoded, 'compromissos', this.logger);
      this.logger.debug(`Retornados ${data.length} compromissos`);
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar compromissos:', error);
      return [];
    }
  }

  private normalizeCompromisso(raw: SocCompromisso): CompromissoDetalhe {
    return {
      codigoAgenda: raw.codigoAgenda,
      nomeAgenda: raw.nomeAgenda,
      codigoEmpresa: raw.codigoEmpresa,
      nomeEmpresa: raw.nomeEmpresa,
      codigoFuncionario: raw.codigoFuncionario,
      nomeFuncionario: raw.nomeFuncionario,
      cpfFuncionario: raw.cpfFuncionario,
      tipoCompromisso: raw.tipoCompromisso,
      tipoCompromissoNome: raw.nomeTipoCompromisso,
      dataCompromisso: raw.dataCompromisso,
      horaInicio: raw.horaInicio,
      horaFim: raw.horaFim,
      nomeCompromisso: raw.nomeCompromisso,
      situacao: raw.situacao,
      situacaoNome: SITUACAO_MAP[raw.situacao] || 'AguardandoAtendimento',
      setorFuncionario: raw.setorFuncionario,
      unidadeFuncionario: raw.unidadeFuncionario,
      cargoFuncionario: raw.cargoFuncionario,
      codigoSequencialFicha: raw.codigoSequencialFicha,
    };
  }

  computeKPIs(compromissos: CompromissoDetalhe[]): VolumetriaKPIs {
    const totalAgendamentos = compromissos.length;
    const totalAtendidos = compromissos.filter((c) => c.situacao === SITUACAO_ATENDIDO).length;
    const totalNaoAtendidos = compromissos.filter((c) => c.situacao === SITUACAO_NAO_ATENDIDO).length;
    const totalAguardando = compromissos.filter((c) => c.situacao === SITUACAO_AGUARDANDO).length;
    const totalFuncionarios = new Set(
      compromissos.filter((c) => c.codigoFuncionario).map((c) => c.codigoFuncionario),
    ).size;
    const totalExames = totalAtendidos;

    return {
      totalAgendamentos,
      totalAtendidos,
      totalNaoAtendidos,
      totalAguardando,
      totalFuncionarios,
      totalExames,
      ultimaAtualizacao: new Date().toISOString(),
    };
  }

  aggregatePorAgenda(compromissos: CompromissoDetalhe[]): PorAgendaBar[] {
    const map: Record<string, PorAgendaBar> = {};

    for (const c of compromissos) {
      const agenda = c.nomeAgenda;
      if (!map[agenda]) {
        map[agenda] = {
          nomeAgenda: agenda,
          agendamentos: 0,
          atendidos: 0,
          naoAtendidos: 0,
        };
      }
      map[agenda].agendamentos++;
      if (c.situacao === SITUACAO_ATENDIDO) map[agenda].atendidos++;
      if (c.situacao === SITUACAO_NAO_ATENDIDO) map[agenda].naoAtendidos++;
    }

    return Object.values(map).sort((a, b) => b.agendamentos - a.agendamentos).slice(0, 15);
  }

  aggregatePorSubGrupo(compromissos: CompromissoDetalhe[]): PorSubGrupoBar[] {
    const map: Record<string, { agendamentos: number; atendidos: number }> = {};

    for (const c of compromissos) {
      const subGrupo = c.setorFuncionario || 'Sem SubGrupo';
      if (!map[subGrupo]) {
        map[subGrupo] = { agendamentos: 0, atendidos: 0 };
      }
      map[subGrupo].agendamentos++;
      if (c.situacao === SITUACAO_ATENDIDO) map[subGrupo].atendidos++;
    }

    return Object.entries(map)
      .map(([subGrupo, data]) => ({ subGrupo, ...data }))
      .sort((a, b) => b.agendamentos - a.agendamentos);
  }

  aggregatePorTipoCompromisso(compromissos: CompromissoDetalhe[]): PorTipoCompromissoGrouped[] {
    const map: Record<string, PorTipoCompromissoGrouped> = {};

    for (const c of compromissos) {
      const tipo = c.tipoCompromissoNome || c.tipoCompromisso || 'Nao Informado';
      if (!map[tipo]) {
        map[tipo] = {
          tipoCompromisso: tipo,
          AguardandoAtendimento: 0,
          Atendido: 0,
          NaoAtendido: 0,
        };
      }

      switch (c.situacao) {
        case SITUACAO_ATENDIDO:
          map[tipo].Atendido++;
          break;
        case SITUACAO_NAO_ATENDIDO:
          map[tipo].NaoAtendido++;
          break;
        case SITUACAO_AGUARDANDO:
          map[tipo].AguardandoAtendimento++;
          break;
      }
    }

    return Object.values(map).sort((a, b) => {
      const totalA = a.AguardandoAtendimento + a.Atendido + a.NaoAtendido;
      const totalB = b.AguardandoAtendimento + b.Atendido + b.NaoAtendido;
      return totalB - totalA;
    });
  }

  aggregatePorAno(compromissos: CompromissoDetalhe[]): PorAnoLine[] {
    const map: Record<number, { agendamentos: number; atendidos: number; exames: number }> = {};

    for (const c of compromissos) {
      const dataStr = c.dataCompromisso;
      if (!dataStr) continue;

      const ano = parseInt(dataStr.split('/')[2] || new Date().getFullYear().toString(), 10);
      if (isNaN(ano)) continue;

      if (!map[ano]) {
        map[ano] = { agendamentos: 0, atendidos: 0, exames: 0 };
      }
      map[ano].agendamentos++;
      if (c.situacao === SITUACAO_ATENDIDO) {
        map[ano].atendidos++;
        map[ano].exames++;
      }
    }

    return Object.entries(map)
      .map(([ano, data]) => ({ ano: parseInt(ano), ...data }))
      .sort((a, b) => a.ano - b.ano);
  }

  aggregatePorEmpresa(compromissos: CompromissoDetalhe[]): PorEmpresaBar[] {
    const map: Record<string, PorEmpresaBar> = {};

    for (const c of compromissos) {
      const empresa = c.nomeEmpresa;
      if (!map[empresa]) {
        map[empresa] = {
          nomeEmpresa: empresa,
          agendamentos: 0,
          funcionarios: 0,
          exames: 0,
        };
      }
      map[empresa].agendamentos++;
    }

    const funcSet = new Set<string>();
    for (const c of compromissos) {
      if (c.codigoFuncionario) {
        funcSet.add(`${c.nomeEmpresa}-${c.codigoFuncionario}`);
      }
    }

    for (const empresa of Object.keys(map)) {
      map[empresa].funcionarios = Array.from(funcSet).filter((f) => f.startsWith(empresa)).length;
      map[empresa].exames = map[empresa].funcionarios;
    }

    return Object.values(map).sort((a, b) => b.agendamentos - a.agendamentos);
  }

  getDashboardData(
    dataInicial?: string,
    dataFinal?: string,
    codigosAgenda?: string[],
  ): Promise<VolumetriaDashboardData> {
    const now = Date.now();

    if (this.cache && this.cache.expires > now) {
      this.logger.debug('Retornando dados do cache Volumetria');
      return Promise.resolve(this.cache.data);
    }

    return this.buildDashboard(dataInicial, dataFinal, codigosAgenda);
  }

  private async buildDashboard(
    dataInicial?: string,
    dataFinal?: string,
    codigosAgenda?: string[],
  ): Promise<VolumetriaDashboardData> {
    const raw = await this.fetchCompromissos(dataInicial, dataFinal, codigosAgenda);
    const dados = raw.map((r) => this.normalizeCompromisso(r));

    const kpis = this.computeKPIs(dados);
    const porAgenda = this.aggregatePorAgenda(dados);
    const porSubGrupo = this.aggregatePorSubGrupo(dados);
    const porTipoCompromisso = this.aggregatePorTipoCompromisso(dados);
    const porAno = this.aggregatePorAno(dados);
    const porEmpresa = this.aggregatePorEmpresa(dados);

    const agendasCodigo = [
      { codigo: '02222202', nome: 'AGENDA IN COMPANY - CE MATRIZ' },
      { codigo: '03781287', nome: 'AGENDA IN COMPANY - ENGEMEDICAL PRAIA GRANDE' },
      { codigo: '02787023', nome: 'AGENDA IN COMPANY - FILIAL BH' },
      { codigo: '03781265', nome: 'AGENDA IN COMPANY - SANTOS' },
      { codigo: '02289144', nome: 'AGENDAMENTO P CLINICAS CREDENCIADAS - GERAL' },
      { codigo: '03593277', nome: 'AGENDAMENTO P/ CREDENCIADAS - BH/CTG' },
      { codigo: '01820242', nome: 'CLINICA ENGEMEDICAL - BH' },
      { codigo: '01773500', nome: 'CLINICA ENGEMEDICAL - CE (MATRIZ)' },
      { codigo: '02088164', nome: 'CLINICA ENGEMEDICAL - CE2' },
      { codigo: '02979233', nome: 'CLINICA ENGEMEDICAL - CONTAGEM/MG' },
      { codigo: '03719460', nome: 'CLINICA ENGEMEDICAL - PRAIA GRANDE' },
      { codigo: '03357588', nome: 'CLINICA ENGEMEDICAL - SANTOS' },
    ];

    const empresasDistintas = [...new Set(dados.map((d) => d.nomeEmpresa))].sort();
    const tiposDistintos = [...new Set(dados.map((d) => d.tipoCompromissoNome))].sort();

    const data: VolumetriaDashboardData = {
      kpis,
      porAgenda,
      porEmpresa,
      porTipoCompromisso,
      porAno,
      porSubGrupo,
      detalhes: dados,
      agendas: agendasCodigo,
      empresas: empresasDistintas,
      tiposCompromisso: tiposDistintos,
      totalCompromissos: dados.length,
      filtros: {
        agendas: agendasCodigo,
        empresas: empresasDistintas,
        situacoes: ['Atendido', 'NaoAtendido', 'AguardandoAtendimento', 'Cancelado', 'NaoCompareceu'] as SituacaoNome[],
        tiposCompromisso: tiposDistintos,
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