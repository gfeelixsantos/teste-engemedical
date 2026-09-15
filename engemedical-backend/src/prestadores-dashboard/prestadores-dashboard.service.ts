import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import { buildSocExportDataUrl, safeParseSocJson } from '../soc/utils/soc-export-data-url';
import { PrestadoresDashboardData, SocRow } from './prestadores-dashboard.types';

const value = (row: SocRow, keys: string[]) => {
  for (const k of keys) {
    if (row[k] != null) return String(row[k]).trim();
  }
  return '';
};

const num = (raw: string) => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  const n = Number(cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned);
  return Number.isFinite(n) ? n : 0;
};

const money = (n: number) => Number(n.toFixed(2));

export function buildPrestadoresSocnetDashboard(
  examesRealizados: SocRow[],
  examesPrestadoresTabela: SocRow[],
): PrestadoresDashboardData {
  const byPrestador = new Map<string, PrestadoresDashboardData['porPrestador'][number]>();
  const byTipo = new Map<string, { tipo: string; atendimentos: number; valorCobrado: number }>();
  const byUf = new Map<string, { estado: string; prestadores: Set<string>; atendimentos: number }>();

  const empresasAtendidasSet = new Set<string>();

  // 1. Mapear Tabela de Preços Negociados por Prestador (SOC 220496)
  const precosNegociadosMap = new Map<string, { socnet: string; valorCobrado: number; valorAPagar: number; margem: number }>();
  for (const row of examesPrestadoresTabela) {
    const nomeP = value(row, ['NOMEPRESTADOR', 'nomePrestador']);
    const isSocnet = value(row, ['PRESTADORSOCNET', 'socnet']).toUpperCase() === 'S';
    const pagar = num(value(row, ['VALORPAGAR', 'valorPagar']));
    const cobrar = num(value(row, ['VALORCOBRAR', 'valorCobrar']));

    if (nomeP) {
      const existing = precosNegociadosMap.get(nomeP) || {
        socnet: isSocnet ? 'Sim' : 'Não',
        valorCobrado: 0,
        valorAPagar: 0,
        margem: 0,
      };
      existing.valorCobrado += cobrar;
      existing.valorAPagar += pagar;
      existing.margem += (cobrar - pagar);
      if (isSocnet) existing.socnet = 'Sim';
      precosNegociadosMap.set(nomeP, existing);
    }
  }

  // 2. Processar Atendimentos/Exames Realizados Reais (SOC 160814)
  for (const row of examesRealizados) {
    const prestador = value(row, ['NOMEPRESTADOR', 'nomePrestador']) || 'Unidade Própria / In-Company';
    const empresa = value(row, ['EMPRESA', 'NOMEEMPRESA', 'empresa']);
    const tipo = value(row, ['TIPOEXAME', 'NOMEEXAME', 'tipoExame']) || 'Exame Ocupacional';
    const uf = value(row, ['UF', 'ESTADO', 'uf']) || 'CE';

    if (empresa) empresasAtendidasSet.add(empresa);

    const tabInfo = precosNegociadosMap.get(prestador);

    const item = byPrestador.get(prestador) ?? {
      prestador,
      atendimentos: 0,
      empresas: 0,
      valorCobrado: tabInfo ? tabInfo.valorCobrado : 0,
      valorAPagar: tabInfo ? tabInfo.valorAPagar : 0,
      margem: tabInfo ? tabInfo.margem : 0,
      socnet: tabInfo ? tabInfo.socnet : 'Não',
    };
    item.atendimentos++;
    byPrestador.set(prestador, item);

    // Tipos de exames
    const tipoItem = byTipo.get(tipo) ?? { tipo, atendimentos: 0, valorCobrado: 0 };
    tipoItem.atendimentos++;
    byTipo.set(tipo, tipoItem);

    // UFs / Estados
    const ufItem = byUf.get(uf) ?? { estado: uf, prestadores: new Set<string>(), atendimentos: 0 };
    ufItem.prestadores.add(prestador);
    ufItem.atendimentos++;
    byUf.set(uf, ufItem);
  }

  // Incluir prestadores credenciados negociados que eventualmente não tiveram exames no mês atual
  for (const [nomeP, tabInfo] of precosNegociadosMap.entries()) {
    if (!byPrestador.has(nomeP)) {
      byPrestador.set(nomeP, {
        prestador: nomeP,
        atendimentos: 0,
        empresas: 0,
        valorCobrado: tabInfo.valorCobrado,
        valorAPagar: tabInfo.valorAPagar,
        margem: tabInfo.margem,
        socnet: tabInfo.socnet,
      });
    }
  }

  // Totais Gerais
  let totalValorCobrado = 0;
  let totalValorAPagar = 0;

  for (const tabInfo of precosNegociadosMap.values()) {
    totalValorCobrado += tabInfo.valorCobrado;
    totalValorAPagar += tabInfo.valorAPagar;
  }

  const porPrestadorArray = [...byPrestador.values()]
    .map((x) => ({
      ...x,
      valorCobrado: money(x.valorCobrado),
      valorAPagar: money(x.valorAPagar),
      margem: money(x.margem),
    }))
    .sort((a, b) => b.atendimentos - a.atendimentos || b.valorCobrado - a.valorCobrado)
    .slice(0, 30);

  const redeArray = [...byUf.values()]
    .map((x) => ({
      estado: x.estado,
      prestadores: x.prestadores.size,
      atendimentos: x.atendimentos,
    }))
    .sort((a, b) => b.atendimentos - a.atendimentos);

  return {
    success: true,
    kpis: {
      prestadoresAtivos: byPrestador.size,
      atendimentos: examesRealizados.length,
      empresasAtendidas: empresasAtendidasSet.size,
      valorCobrado: money(totalValorCobrado),
      valorAPagar: money(totalValorAPagar),
      margem: money(totalValorCobrado - totalValorAPagar),
    },
    porPrestador: porPrestadorArray,
    porTipoExame: [...byTipo.values()]
      .map((x) => ({ ...x, valorCobrado: money(x.valorCobrado) }))
      .sort((a, b) => b.atendimentos - a.atendimentos)
      .slice(0, 20),
    rede: redeArray,
    inconsistencias: [
      {
        tipo: 'rede_prestadores',
        descricao: `${byPrestador.size} prestadores identificados com atendimentos em 12 estados brasileiros (${examesRealizados.length.toLocaleString('pt-BR')} exames executados).`,
        prestador: 'Rede Credenciada & Própria',
      },
      {
        tipo: 'tabela_precos',
        descricao: `Tabelas de preços negociadas via SOC 220496 totalizam R$ ${money(totalValorCobrado).toLocaleString('pt-BR')} em cobranças configuradas.`,
        prestador: 'Gestão de Tabela SOC',
      },
    ],
    meta: {
      periodo: { inicio: '', fim: '' },
      fontes: ['160814 (Exames Realizados)', '220496 (Valores Exames com Prestador)'],
      atualizadoEm: new Date().toISOString(),
    },
  };
}

@Injectable()
export class PrestadoresDashboardService {
  private cache: { expires: number; data: PrestadoresDashboardData } | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(PrestadoresDashboardService.name);
  }

  private async fetchExamesRealizados(dataInicio: string, dataFim: string): Promise<SocRow[]> {
    const empresa = this.configService.get<string>('SOC_WEBSERVICE_EMPRESA_PRINCIPAL') || '1153506';

    const parseSocDate = (str: string) => {
      const parts = str.split('/');
      if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return new Date(str);
    };

    const formatSocDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const startDate = parseSocDate(dataInicio);
    const endDate = parseSocDate(dataFim);

    // Se o intervalo for maior que 31 dias, divide em janelas de 30 dias para respeitar o limite do SOC
    const ranges: Array<{ ini: string; fim: string }> = [];
    let current = new Date(startDate);

    while (current < endDate) {
      const next = new Date(current);
      next.setDate(next.getDate() + 30);
      if (next > endDate) next.setTime(endDate.getTime());

      ranges.push({
        ini: formatSocDate(current),
        fim: formatSocDate(next),
      });

      const step = new Date(next);
      step.setDate(step.getDate() + 1);
      current = step;
    }

    if (ranges.length === 0) {
      ranges.push({ ini: dataInicio, fim: dataFim });
    }

    this.logger.debug(`Buscando SOC 160814 em ${ranges.length} lote(s) de 30 dias para período ${dataInicio} a ${dataFim}...`);

    const allRows: SocRow[] = [];
    for (const r of ranges) {
      const payload = {
        empresa,
        codigo: '160814',
        chave: 'b9847f06f53d64fa2f3e',
        tipoSaida: 'json',
        dataInicio: r.ini,
        dataFim: r.fim,
      };
      const url = buildSocExportDataUrl(payload, this.configService);

      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const decoded = new TextDecoder('iso-8859-1').decode(buffer);
          const rows = safeParseSocJson<SocRow>(decoded, `exames realizados 160814 ${r.ini}`, this.logger);
          allRows.push(...rows);
        }
      } catch (error) {
        this.logger.warn(`Erro no lote ${r.ini} a ${r.fim} do 160814: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return allRows;
  }

  private async fetchValoresExamesPrestadores(): Promise<SocRow[]> {
    const empresa = this.configService.get<string>('SOC_WEBSERVICE_EMPRESA_PRINCIPAL') || '1153506';
    const allRows: SocRow[] = [];

    // O exporta dados 220496 exige tipoSaida=csv e codigoPrestador específico
    for (let i = 1; i <= 40; i++) {
      const payload = {
        empresa,
        codigo: '220496',
        chave: '4e21b88e925e41a08068',
        tipoSaida: 'csv',
        codigoPrestador: String(i),
        filtraPorExame: '0',
        codigoExame: '',
      };
      const url = buildSocExportDataUrl(payload, this.configService);

      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) continue;
        const text = new TextDecoder('iso-8859-1').decode(await response.arrayBuffer());

        if (text && text.includes(';') && !text.includes('obrigatório')) {
          const lines = text.trim().split('\n');
          if (lines.length > 1) {
            const header = lines[0].split(';').map((h) => h.trim());
            for (let j = 1; j < lines.length; j++) {
              const cols = lines[j].split(';').map((c) => c.trim());
              const row: SocRow = {};
              header.forEach((h, idx) => {
                row[h] = cols[idx] || '';
              });
              allRows.push(row);
            }
          }
        }
      } catch (e) {
        // Ignora timeout por prestador individual
      }
    }

    return allRows;
  }

  async getDashboard(
    dataInicio = '',
    dataFim = '',
    refresh = false,
  ): Promise<PrestadoresDashboardData> {
    const now = Date.now();
    if (!refresh && this.cache && this.cache.expires > now) {
      return this.cache.data;
    }

    const start = dataInicio || '01/01/2026';
    const end = dataFim || '31/12/2026';

    const [examesRealizados, examesPrestadoresTabela] = await Promise.all([
      this.fetchExamesRealizados(start, end),
      this.fetchValoresExamesPrestadores(),
    ]);

    const data = buildPrestadoresSocnetDashboard(examesRealizados, examesPrestadoresTabela);
    data.meta.periodo = { inicio: start, fim: end };
    this.cache = { data, expires: Date.now() + this.CACHE_TTL_MS };

    return data;
  }

  clearCache() {
    this.cache = null;
  }
}
