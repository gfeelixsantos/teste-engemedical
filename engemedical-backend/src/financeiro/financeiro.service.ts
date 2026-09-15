import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import { buildSocExportDataUrl, safeParseSocJson } from '../soc/utils/soc-export-data-url';
import { FinanceiroDashboardData, SocRow, FinanceiroProdutoItem } from './financeiro.types';

const value = (row: SocRow, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return String(row[key]).trim();
  }
  return '';
};

const money = (raw: string) => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  const s = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const monthKey = (raw: string) => {
  if (!raw) return 'Sem data';
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}`; // YYYY-MM
  const iso = raw.match(/(\d{4})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}` : 'Sem data';
};

const round = (n: number) => Number(n.toFixed(2));

export function buildFinanceiroDashboard(
  titulos: SocRow[],
  exames: SocRow[],
  vidasRows: SocRow[] = [],
): FinanceiroDashboardData {
  const porMes = new Map<string, FinanceiroDashboardData['porMes'][number]>();
  const porEmpresaMap = new Map<string, FinanceiroDashboardData['porEmpresa'][number]>();
  const porProdutoMap = new Map<string, FinanceiroProdutoItem>();

  let valorTitulos = 0;
  let valorCobradoExames = 0;
  let valorAPagarExames = 0;

  // 1. Processar Títulos (SOC 220488)
  for (const row of titulos) {
    const valor = money(value(row, ['VALOR', 'valor']));
    const codEmp = value(row, ['CODIGOEMPRESA', 'codigoEmpresa']);
    const empNome = value(row, ['EMPRESA', 'NOMEEMPRESA', 'empresa']) || `Empresa ${codEmp}`;
    const mes = monthKey(value(row, ['DATACOBRANCA', 'dataCobranca']));
    const codProd = value(row, ['CODIGOPRODUTO', 'codigoProduto']) || 'Outros';
    const vidas = money(value(row, ['QTDVIDAS', 'qtdVidas']));

    valorTitulos += valor;

    // Agrupamento por mês
    const itemMes = porMes.get(mes) ?? {
      mes,
      valorTitulos: 0,
      valorCobradoExames: 0,
      valorAPagarExames: 0,
      margemExames: 0,
      titulos: 0,
    };
    itemMes.valorTitulos += valor;
    itemMes.titulos += 1;
    porMes.set(mes, itemMes);

    // Agrupamento por empresa
    const empKey = codEmp || empNome;
    const itemEmp = porEmpresaMap.get(empKey) ?? {
      codigo: codEmp,
      empresa: empNome,
      valorTitulos: 0,
      vidas: 0,
      titulos: 0,
      socnet: 'Não',
    };
    itemEmp.valorTitulos += valor;
    itemEmp.titulos += 1;
    itemEmp.vidas += vidas;
    porEmpresaMap.set(empKey, itemEmp);

    // Agrupamento por produto
    const itemProd = porProdutoMap.get(codProd) ?? {
      codigoProduto: codProd,
      nomeProduto: `Produto ${codProd}`,
      valorTotal: 0,
      qtdTitulos: 0,
    };
    itemProd.valorTotal += valor;
    itemProd.qtdTitulos += 1;
    porProdutoMap.set(codProd, itemProd);
  }

  // 2. Processar Contagem de Vidas (SOC 220489)
  let totalVidasContagem = 0;
  let empresasSocnetCount = 0;
  let vidasSocnetCount = 0;

  for (const row of vidasRows) {
    const cod = value(row, ['CODIGO', 'codigo']);
    const nome = value(row, ['NOME', 'nome']);
    const vds = parseInt(value(row, ['NUMERO_VIDAS', 'numeroVidas']) || '0', 10);
    const socnet = value(row, ['SOCNET', 'socnet']).toLowerCase();
    const isSocnet = socnet === 'sim' || socnet === 's';

    totalVidasContagem += vds;
    if (isSocnet) {
      empresasSocnetCount++;
      vidasSocnetCount += vds;
    }

    if (cod && porEmpresaMap.has(cod)) {
      const existing = porEmpresaMap.get(cod)!;
      existing.vidas = vds;
      existing.empresa = nome || existing.empresa;
      existing.socnet = isSocnet ? 'Sim' : 'Não';
    }
  }

  // 3. Processar Exames Valorizados SOCNET (SOC 220494)
  for (const row of exames) {
    const cobrar = money(value(row, ['VALOR_COBRAR', 'VALORCOBRAR', 'valorCobrar']));
    const pagar = money(value(row, ['VALOR_PAGAR', 'VALORPAGAR', 'valorPagar']));
    const dt = value(row, ['DATA_VALORIZACAO', 'DATAVALORIZACAO', 'DATAEXAME']);
    const mes = monthKey(dt);

    valorCobradoExames += cobrar;
    valorAPagarExames += pagar;

    const itemMes = porMes.get(mes) ?? {
      mes,
      valorTitulos: 0,
      valorCobradoExames: 0,
      valorAPagarExames: 0,
      margemExames: 0,
      titulos: 0,
    };
    itemMes.valorCobradoExames += cobrar;
    itemMes.valorAPagarExames += pagar;
    itemMes.margemExames += cobrar - pagar;
    porMes.set(mes, itemMes);
  }

  const mesesArray = [...porMes.values()]
    .map((x) => ({
      ...x,
      valorTitulos: round(x.valorTitulos),
      valorCobradoExames: round(x.valorCobradoExames),
      valorAPagarExames: round(x.valorAPagarExames),
      margemExames: round(x.valorCobradoExames - x.valorAPagarExames),
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const empresasArray = [...porEmpresaMap.values()]
    .sort((a, b) => b.valorTitulos - a.valorTitulos)
    .slice(0, 20)
    .map((x) => ({
      ...x,
      valorTitulos: round(x.valorTitulos),
    }));

  const produtosArray = [...porProdutoMap.values()]
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 15)
    .map((x) => ({
      ...x,
      valorTotal: round(x.valorTotal),
    }));

  return {
    success: true,
    kpis: {
      totalTitulos: titulos.length,
      valorTitulos: round(valorTitulos),
      vidasContagem: totalVidasContagem,
      totalEmpresasContagem: vidasRows.length,
      empresasSocnet: empresasSocnetCount,
      vidasSocnet: vidasSocnetCount,
      valorCobradoExames: round(valorCobradoExames),
      valorAPagarExames: round(valorAPagarExames),
      margemExames: round(valorCobradoExames - valorAPagarExames),
    },
    porMes: mesesArray,
    porEmpresa: empresasArray,
    porProduto: produtosArray,
    inconsistencias: [
      {
        tipo: 'titulos_faturamento',
        descricao: 'Títulos Faturados correspondem a contratos de faturamento mensal e de exames executados.',
        quantidade: titulos.length,
      },
      {
        tipo: 'socnet_cobertura',
        descricao: `${empresasSocnetCount} empresas clientes estão operando via integração SOCNET (${vidasSocnetCount.toLocaleString('pt-BR')} vidas).`,
        quantidade: empresasSocnetCount,
      },
    ],
    meta: {
      periodo: { inicio: '', fim: '' },
      fonte: 'SOC Exporta Dados 220488 (Títulos), 220489 (Vidas Contagem) e 220494 (Exames Valorizados SOCNET)',
      atualizadoEm: new Date().toISOString(),
    },
  };
}

@Injectable()
export class FinanceiroService {
  private cache: { expires: number; data: FinanceiroDashboardData } | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(FinanceiroService.name);
  }

  private async fetchExport(
    codigo: string,
    chave: string,
    params: Record<string, string>,
  ): Promise<SocRow[]> {
    const empresa = this.configService.get<string>('SOC_WEBSERVICE_EMPRESA_PRINCIPAL') || '1153506';
    const payload = {
      empresa,
      codigo,
      chave,
      tipoSaida: 'json',
      ...params,
    };
    const url = buildSocExportDataUrl(payload, this.configService);

    try {
      this.logger.debug(`Buscando SOC Exporta Dados ${codigo}...`);
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) {
        this.logger.error(`Falha exporta dados ${codigo}: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      return safeParseSocJson<SocRow>(decoded, `exporta dados ${codigo}`, this.logger);
    } catch (error) {
      this.logger.error(`Erro ao buscar exporta dados ${codigo}:`, error);
      return [];
    }
  }

  async getDashboard(
    dataInicio = '',
    dataFim = '',
    refresh = false,
  ): Promise<FinanceiroDashboardData> {
    const now = Date.now();
    if (!refresh && this.cache && this.cache.expires > now) {
      return this.cache.data;
    }

    const start = dataInicio || '01/01/2026';
    const end = dataFim || '31/12/2026';

    const [titulos, vidasRows, exames] = await Promise.all([
      this.fetchExport('220488', 'eea1e34f0a565d23937d', { dataInicio: start, dataFim: end }),
      this.fetchExport('220489', '3e957a0e521a4c7cabc7', {}),
      this.fetchExport('220494', '32686ac9dea0ebfb385b', {
        EmpresaSel: '',
        funcionarioInicio: '',
        funcionarioFim: '',
        dataInicio: start,
        dataFim: end,
        tpExame: '',
      }),
    ]);

    const data = buildFinanceiroDashboard(titulos, exames, vidasRows);
    data.meta.periodo = { inicio: start, fim: end };
    this.cache = { data, expires: Date.now() + this.CACHE_TTL_MS };

    return data;
  }

  clearCache() {
    this.cache = null;
  }
}

