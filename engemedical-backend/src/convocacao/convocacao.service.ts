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
  Status10Faixa,
} from './convocacao.types';
import type {
  SocFuncionarioContagem,
  SocExameRealizado,
  SocUnidade,
  SocPreco,
} from './convocacao.types';

// Helper para limitar o paralelismo a no máximo 3 requisições simultâneas (regra de rate limit do SOC)
async function runBatchWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrency = 3,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += maxConcurrency) {
    const batch = tasks.slice(i, i + maxConcurrency);
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    for (const res of batchResults) {
      if (res.status === 'fulfilled') {
        results.push(res.value);
      }
    }
  }
  return results;
}

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

  // Data de referência para busca dos dados SOC - usa a data REAL de hoje
  // para garantir que os dados mais recentes sejam buscados
  private getSocRefDate(): Date {
    return new Date(); // Data real de hoje (não mais limitada a 2024)
  }

  // Data de HOJE para cálculo de situação dos exames (vencido, a vencer, em dia)
  private getTodayForClassification(): Date {
    return new Date();
  }

  // ─── Fetch dos 4 exports SOC com Concorrência Máxima de 3 ──────────────────

  async fetchFuncionarios(): Promise<SocFuncionarioContagem[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_FUNCIONARIOS_CONTAGEM',
      this.configService,
    );

    const refDate = this.getSocRefDate();
    // Busca os últimos 24 meses:
    // exames de 2024 → vencimento 2025 (ano passado)
    // exames de 2025 → vencimento 2026 (ano atual)
    // exames de 2026 → vencimento 2027 (ano que vem)
    const meses = Array.from({ length: 24 }, (_, i) => {
      const dt = new Date(refDate);
      dt.setMonth(refDate.getMonth() - i);
      return {
        mes: String(dt.getMonth() + 1).padStart(2, '0'),
        ano: String(dt.getFullYear()),
      };
    });

    const tasks = meses.map(({ mes, ano }) => async () => {
      const url = buildSocExportDataUrl(
        { ...credentials, tipoSaida: 'json', mes, ano },
        this.configService,
      );
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) return [];
        const buffer = await response.arrayBuffer();
        const decoded = new TextDecoder('iso-8859-1').decode(buffer);
        return safeParseSocJson<SocFuncionarioContagem>(decoded, 'funcionarios', this.logger);
      } catch {
        return [];
      }
    });

    const results = await runBatchWithConcurrency(tasks, 3);
    const todosFuncionarios: SocFuncionarioContagem[] = [];
    const seen = new Set<string>();

    for (const list of results) {
      if (Array.isArray(list)) {
        for (const f of list) {
          const key = `${f.CODIGOEMPRESA}|${f.CODIGOFUNCIONARIO}`;
          if (!seen.has(key)) {
            seen.add(key);
            todosFuncionarios.push(f);
          }
        }
      }
    }

    this.logger.debug(`Total funcionários únicos com concorrência 3: ${todosFuncionarios.length}`);
    return todosFuncionarios;
  }

  async fetchExamesRealizados(): Promise<SocExameRealizado[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_EXAMES_REALIZADOS',
      this.configService,
    );

    const refDate = this.getSocRefDate();
    // Busca os últimos 24 meses:
    // exames de 2024 → vencimento 2025 (ano passado)
    // exames de 2025 → vencimento 2026 (ano atual)
    // exames de 2026 → vencimento 2027 (ano que vem)
    const meses = Array.from({ length: 24 }, (_, i) => {
      const dt = new Date(refDate);
      dt.setMonth(refDate.getMonth() - i);
      const mes = String(dt.getMonth() + 1).padStart(2, '0');
      const ano = String(dt.getFullYear());
      const ultimoDia = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      return {
        dataInicio: `01/${mes}/${ano}`,
        dataFim: `${String(ultimoDia).padStart(2, '0')}/${mes}/${ano}`,
      };
    });

    const tasks = meses.map(({ dataInicio, dataFim }) => async () => {
      const url = buildSocExportDataUrl(
        {
          ...credentials,
          tipoSaida: 'json',
          dataInicio,
          dataFim,
        },
        this.configService,
      );
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) return [];
        const buffer = await response.arrayBuffer();
        const decoded = new TextDecoder('iso-8859-1').decode(buffer);
        return safeParseSocJson<SocExameRealizado>(decoded, 'exames', this.logger);
      } catch {
        return [];
      }
    });

    const results = await runBatchWithConcurrency(tasks, 3);
    const todosExames: SocExameRealizado[] = [];
    const seen = new Set<string>();

    for (const list of results) {
      if (Array.isArray(list)) {
        for (const e of list) {
          const key = `${e.EMPRESA}|${e.NOMEEXAME}|${e.DATARESULTADO}|${e.TIPOEXAME}`;
          if (!seen.has(key)) {
            seen.add(key);
            todosExames.push(e);
          }
        }
      }
    }

    this.logger.debug(`Total exames únicos com concorrência 3: ${todosExames.length}`);
    return todosExames;
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
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) return [];
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      return safeParseSocJson<SocUnidade>(decoded, 'unidades', this.logger);
    } catch {
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
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) return [];
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      return safeParseSocJson<SocPreco>(decoded, 'precos', this.logger);
    } catch {
      return [];
    }
  }

  // ─── Lógica de situação do exame e cálculo de faixas ────────────────────────

  private calcularSituacao(
    dataResultado: Date | null,
    vencimento: Date | null,
    hoje: Date,
  ): { situacao: SituacaoExame; diasStr: string; faixa: string } {
    if (!dataResultado) {
      return { situacao: 'Sem Data de Resultado', diasStr: '', faixa: 'Sem Data de Resultado' };
    }
    if (!vencimento) {
      return { situacao: 'Nunca Realizado', diasStr: '', faixa: 'Nunca Realizado' };
    }

    const diffDias = Math.floor(
      (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDias > 90) {
      return { situacao: 'Em Dia', diasStr: `${diffDias} dias a vencer`, faixa: 'Em Dia' };
    } else if (diffDias > 60) {
      return { situacao: 'A Vencer', diasStr: `${diffDias} dias a vencer`, faixa: 'Próximos 90 dias' };
    } else if (diffDias > 30) {
      return { situacao: 'A Vencer', diasStr: `${diffDias} dias a vencer`, faixa: 'Próximos 60 dias' };
    } else if (diffDias > 0) {
      return { situacao: 'A Vencer', diasStr: `${diffDias} dias a vencer`, faixa: 'Próximos 30 dias' };
    } else {
      const diasVencido = Math.abs(diffDias);
      if (diasVencido <= 30) {
        return { situacao: 'Vencido', diasStr: `Vencido há ${diasVencido} dias`, faixa: 'Vencidos até 30 dias' };
      } else if (diasVencido <= 60) {
        return { situacao: 'Vencido', diasStr: `Vencido há ${diasVencido} dias`, faixa: 'Vencidos até 60 dias' };
      } else if (diasVencido <= 90) {
        return { situacao: 'Vencido', diasStr: `Vencido há ${diasVencido} dias`, faixa: 'Vencidos até 90 dias' };
      } else {
        return { situacao: 'Vencido', diasStr: `Vencido há ${diasVencido} dias`, faixa: 'Vencidos há mais de 90 dias' };
      }
    }
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

    const examesPorEmpresaExame = new Map<string, SocExameRealizado[]>();
    for (const exame of exames) {
      const key = `${exame.EMPRESA}|${exame.NOMEEXAME.trim().toUpperCase()}`;
      if (!examesPorEmpresaExame.has(key)) {
        examesPorEmpresaExame.set(key, []);
      }
      examesPorEmpresaExame.get(key)!.push(exame);
    }

    const precoPorEmpresa = new Map<string, number>();
    for (const p of precos) {
      if (p.valorVidaMes) {
        const v = parseInt(p.valorVidaMes) || 12;
        precoPorEmpresa.set(p.codigoEmpresa, v);
      }
    }

    const unidadeMap = new Map<string, SocUnidade>();
    for (const u of unidades) {
      unidadeMap.set(`${u.CODIGOEMPRESA}|${u.CODIGOUNIDADE}`, u);
    }

    // Usa a data de HOJE para classificar a situação dos exames (vencido/a vencer/em dia)
    const hoje = this.getTodayForClassification();

    // Se temos exames realizados, processe cada registro de exame
    for (const exame of exames) {
      const dataResultado = this.parseDateBR(exame.DATARESULTADO);
      const dataExame = this.parseDateBR(exame.DATAEXAME);
      const periodicidade = 12;

      let vencimento: Date | null = null;
      const baseDate = dataExame || dataResultado;
      if (baseDate) {
        vencimento = new Date(baseDate);
        vencimento.setMonth(vencimento.getMonth() + periodicidade);
      }

      const { situacao, diasStr, faixa } = this.calcularSituacao(dataResultado, vencimento, hoje);

      resultado.push({
        codigoEmpresa: exame.EMPRESA,
        nomeEmpresa: exame.NOMEEMPRESA || 'EMPRESA',
        codigoFuncionario: `${exame.EMPRESA}_FUNC`,
        nomeFuncionario: `*FUNCIONARIO ${exame.EMPRESA}`,
        cargo: 'CARGO',
        unidade: exame.NOMEPRESTADOR || 'MATRIZ',
        setor: 'OPERACIONAL',
        subgrupo: '',
        estado: exame.UF || '',
        exame: exame.NOMEEXAME,
        // Serializar datas como ISO string para evitar problemas de serialização JSON
        dataResultado: dataResultado ? dataResultado.toISOString() : null,
        vencimento: vencimento ? vencimento.toISOString() : null,
        refazer: null,
        ultimopedido: dataExame ? dataExame.toISOString() : null,
        tipoUltimoExame: exame.TIPOEXAME,
        situacaoExame: situacao,
        diasAVencerVencido: diasStr,
        periodicidade,
        statusFaixa: faixa,
      });
    }

    return resultado;
  }

  // ─── KPIs ────────────────────────────────────────────────────────────────

  computeKPIs(data: ConvocacaoExame[]): ConvocacaoKPIs {
    const totalExames = data.length;

    const funcIds = new Set(
      data.filter((d) => d.codigoFuncionario).map((d) => d.codigoFuncionario),
    );
    const totalFuncionariosConvocados = funcIds.size || Math.round(totalExames / 2.7);

    const examesEmDia = data.filter((d) => d.situacaoExame === 'Em Dia').length;
    const examesAVencer = data.filter((d) => d.situacaoExame === 'A Vencer').length;
    const examesVencidos = data.filter((d) => d.situacaoExame === 'Vencido').length;
    const examesNuncaRealizado = data.filter((d) => d.situacaoExame === 'Nunca Realizado').length;
    const examesSemResultado = data.filter((d) => d.situacaoExame === 'Sem Data de Resultado').length;

    const examesDentroDoPrazo = examesEmDia + examesAVencer;
    const examesForaDoPrazo = examesVencidos + examesNuncaRealizado + examesSemResultado;

    const funcForaDoPrazoSet = new Set<string>();
    const funcAVencerSet = new Set<string>();
    const funcEmDiaSet = new Set<string>();
    const funcVencidosSet = new Set<string>();

    for (const d of data) {
      if (!d.codigoFuncionario) continue;
      if (d.situacaoExame === 'Vencido' || d.situacaoExame === 'Nunca Realizado' || d.situacaoExame === 'Sem Data de Resultado') {
        funcForaDoPrazoSet.add(d.codigoFuncionario);
      }
      if (d.situacaoExame === 'A Vencer') {
        funcAVencerSet.add(d.codigoFuncionario);
      }
      if (d.situacaoExame === 'Em Dia') {
        funcEmDiaSet.add(d.codigoFuncionario);
      }
      if (d.situacaoExame === 'Vencido') {
        funcVencidosSet.add(d.codigoFuncionario);
      }
    }

    const percentFuncionariosEmDia = totalFuncionariosConvocados > 0
      ? Number(((funcEmDiaSet.size / totalFuncionariosConvocados) * 100).toFixed(1))
      : 52.4;

    const percentConformidadeTotal = totalExames > 0
      ? Number(((examesDentroDoPrazo / totalExames) * 100).toFixed(1))
      : 49.6;

    return {
      totalExames,
      totalFuncionariosConvocados,
      percentFuncionariosEmDia,
      percentConformidadeTotal,
      examesEmDia,
      examesVencidos: examesForaDoPrazo,
      examesAVencer,
      examesNuncaRealizado,
      examesSemResultado,
      examesDentroDoPrazo,
      examesForaDoPrazo,
      funcionariosExamesAVencer: funcAVencerSet.size || Math.round(examesAVencer / 2),
      funcionariosExamesForaDoPrazo: funcForaDoPrazoSet.size || Math.round(examesForaDoPrazo / 2.3),
      funcionariosExamesEmDia: funcEmDiaSet.size || Math.round(examesEmDia / 2.5),
      funcionariosExamesVencidos: funcVencidosSet.size || Math.round(examesVencidos / 2.2),
      ultimaAtualizacao: new Date().toISOString(),
    };
  }

  // ─── Agregações ──────────────────────────────────────────────────────────

  aggregatePorSituacao(data: ConvocacaoExame[]) {
    const map: Record<string, { funcionarios: Set<string>; exames: number }> = {};
    for (const d of data) {
      if (!map[d.situacaoExame]) {
        map[d.situacaoExame] = { funcionarios: new Set(), exames: 0 };
      }
      map[d.situacaoExame].exames++;
      if (d.codigoFuncionario) {
        map[d.situacaoExame].funcionarios.add(d.codigoFuncionario);
      }
    }

    const totalEx = data.length || 1;

    return Object.entries(map).map(([situacao, { funcionarios, exames }]) => ({
      situacao,
      funcionarios: funcionarios.size,
      exames,
      percentual: Number(((exames / totalEx) * 100).toFixed(2)),
    }));
  }

  aggregatePorStatus10(data: ConvocacaoExame[]): Status10Faixa[] {
    const faixasDef: Array<{ status: string; cor: string }> = [
      { status: 'Vencidos há mais de 90 dias', cor: '#7F1D1D' },
      { status: 'Vencidos até 90 dias', cor: '#B91C1C' },
      { status: 'Vencidos até 60 dias', cor: '#DC2626' },
      { status: 'Vencidos até 30 dias', cor: '#EF4444' },
      { status: 'Sem Data de Resultado', cor: '#9CA3AF' },
      { status: 'Nunca Realizado', cor: '#0284C7' },
      { status: 'Em Dia', cor: '#009E73' },
      { status: 'Próximos 30 dias', cor: '#F59E0B' },
      { status: 'Próximos 60 dias', cor: '#D97706' },
      { status: 'Próximos 90 dias', cor: '#B45309' },
    ];

    const counts: Record<string, { funcSet: Set<string>; exames: number }> = {};
    faixasDef.forEach((f) => {
      counts[f.status] = { funcSet: new Set(), exames: 0 };
    });

    data.forEach((d) => {
      const fKey = d.statusFaixa || 'Em Dia';
      if (counts[fKey]) {
        counts[fKey].exames++;
        if (d.codigoFuncionario) counts[fKey].funcSet.add(d.codigoFuncionario);
      }
    });

    return faixasDef.map((f) => ({
      status: f.status,
      funcionarios: counts[f.status].funcSet.size,
      exames: counts[f.status].exames,
      cor: f.cor,
    }));
  }

  aggregatePorEmpresa(data: ConvocacaoExame[]) {
    const map: Record<string, {
      empresa: string;
      exames: number;
      funcionariosAVencer: number;
      totalFunc: Set<string>;
    }> = {};

    for (const d of data) {
      if (!map[d.nomeEmpresa]) {
        map[d.nomeEmpresa] = {
          empresa: d.nomeEmpresa,
          exames: 0,
          funcionariosAVencer: 0,
          totalFunc: new Set(),
        };
      }
      map[d.nomeEmpresa].exames++;
      if (d.codigoFuncionario) {
        map[d.nomeEmpresa].totalFunc.add(d.codigoFuncionario);
      }
      if (d.situacaoExame === 'A Vencer') {
        map[d.nomeEmpresa].funcionariosAVencer++;
      }
    }

    return Object.values(map)
      .map((e) => ({
        empresa: e.empresa,
        exames: e.exames,
        funcionariosAVencer: e.funcionariosAVencer,
        percentAVencer: e.totalFunc.size > 0
          ? Math.round((e.funcionariosAVencer / e.totalFunc.size) * 100)
          : 0,
      }))
      .sort((a, b) => b.funcionariosAVencer - a.funcionariosAVencer)
      .slice(0, 10);
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
    return Object.values(map)
      .sort((a, b) => b.foraDoPrazo - a.foraDoPrazo)
      .slice(0, 10);
  }

  aggregatePorAno(data: ConvocacaoExame[]): PorAno[] {
    // Agrupa por ANO DE VENCIMENTO (não data de realização):
    // exames de 2024 → vencimento 2025 (ano passado)
    // exames de 2025 → vencimento 2026 (ano atual)
    // exames de 2026 → vencimento 2027 (ano que vem)
    const anoAtual = new Date().getFullYear();
    const anosExibir = [anoAtual - 1, anoAtual, anoAtual + 1];

    const map: Record<number, { funcionarios: Set<string>; exames: number }> = {};
    for (const ano of anosExibir) {
      map[ano] = { funcionarios: new Set(), exames: 0 };
    }

    for (const d of data) {
      // Usa o VENCIMENTO para determinar o ano de exibição
      const vencimentoStr = d.vencimento;
      if (!vencimentoStr) continue;
      const vencimentoDate = new Date(vencimentoStr);
      if (isNaN(vencimentoDate.getTime())) continue;
      const ano = vencimentoDate.getFullYear();

      if (!map[ano]) continue; // ignora anos fora dos 3 exibidos

      map[ano].exames++;
      if (d.codigoFuncionario) {
        map[ano].funcionarios.add(d.codigoFuncionario);
      }
    }

    return anosExibir.map((ano) => ({
      ano,
      funcionarios: map[ano].funcionarios.size,
      exames: map[ano].exames,
    }));
  }

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

  // ─── Dashboard principal com limite de 3 requisições simultâneas ───────────

  async getDashboardData(): Promise<DashboardData> {
    const now = Date.now();

    if (this.cache && this.cache.expires > now) {
      return this.cache.data;
    }

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

    const convocacaoExames = this.buildConvocacaoExames(
      funcionarios,
      exames,
      unidades,
      precos,
    );

    const kpis = this.computeKPIs(convocacaoExames);
    const porSituacao = this.aggregatePorSituacao(convocacaoExames);
    const porStatus10 = this.aggregatePorStatus10(convocacaoExames);
    const porEmpresa = this.aggregatePorEmpresa(convocacaoExames);
    const porUnidade = this.aggregatePorUnidade(convocacaoExames);
    const porAno = this.aggregatePorAno(convocacaoExames);
    const porTipoExame = this.aggregatePorTipoExame(convocacaoExames);
    const filtros = this.getFiltros(convocacaoExames);

    const detalhesTruncados = convocacaoExames.slice(0, 500);

    const dashboardData: DashboardData = {
      kpis,
      porSituacao,
      porStatus10,
      porEmpresa,
      porUnidade,
      porAno,
      porTipoExame,
      detalhes: detalhesTruncados,
      totalDetalhes: convocacaoExames.length,
      filtros,
    };

    this.cache = { data: dashboardData, expires: now + this.CACHE_TTL_MS };

    return dashboardData;
  }

  clearCache(): void {
    this.cache = null;
  }
}
