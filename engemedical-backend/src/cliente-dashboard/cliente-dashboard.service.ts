import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportLayoutCredentials,
  safeParseSocJson,
} from '../soc/utils/soc-export-data-url';

interface SocExameRealizadoEmpresa {
  EMPRESA: string;
  CODFUNCIONARIO: string;
  NOMEFUNCIONARIO: string;
  DATAFICHA: string;
  TIPOFICHA: string;
  DATAEXAME: string;
  CODEXAME: string;
  NOMEEXAME: string;
  SAIASO: string;
  PARECERASO: string;
  [key: string]: any;
}

const randomDelay = () =>
  new Promise((r) => setTimeout(r, 100 + Math.random() * 400));

async function runBatchWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrency = 5,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += maxConcurrency) {
    const batch = tasks.slice(i, i + maxConcurrency);
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    for (const res of batchResults) {
      if (res.status === 'fulfilled') results.push(res.value);
    }
    if (i + maxConcurrency < tasks.length) await randomDelay();
  }
  return results;
}

export interface DashboardResumo {
  validos: number;
  aVencer: number;
  vencidos: number;
  semHistorico: number;
  total: number;
  porEmpresa: Array<{
    codigo: string;
    validos: number;
    aVencer: number;
    vencidos: number;
    semHistorico: number;
    total: number;
  }>;
}

@Injectable()
export class ClienteDashboardService {
  private cache: {
    data: DashboardResumo;
    expires: number;
    codigos: string;
  } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(ClienteDashboardService.name);
  }

  async getResumo(codigos: string[]): Promise<DashboardResumo> {
    const validCodigos = [
      ...new Set(codigos.map((c) => String(c).trim()).filter(Boolean)),
    ].slice(0, 50);

    this.logger.log(`[DASH] getResumo: ${JSON.stringify(validCodigos)}`);

    if (!validCodigos.length) {
      return {
        validos: 0, aVencer: 0, vencidos: 0, semHistorico: 0,
        total: 0, porEmpresa: [],
      };
    }

    const cacheKey = validCodigos.sort().join(',');
    if (
      this.cache &&
      this.cache.expires > Date.now() &&
      this.cache.codigos === cacheKey
    ) {
      this.logger.log('[DASH] Cache hit');
      return this.cache.data;
    }

    const hoje = new Date();
    const br = new Date(
      hoje.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
    );
    const hojeBrt = new Date(br.getFullYear(), br.getMonth(), br.getDate());

    const exames = await this.fetchExamesRealizados(validCodigos);

    this.logger.log(`[DASH] Total exames retornados: ${exames.length}`);

    const result = this.buildResumo(exames, validCodigos, hojeBrt);

    this.logger.log(
      `[DASH] Resultado: validos=${result.validos} aVencer=${result.aVencer} vencidos=${result.vencidos} semHistorico=${result.semHistorico} total=${result.total}`,
    );
    for (const pe of result.porEmpresa) {
      this.logger.log(
        `[DASH] Empresa ${pe.codigo}: total=${pe.total} validos=${pe.validos} aVencer=${pe.aVencer} vencidos=${pe.vencidos} sem=${pe.semHistorico}`,
      );
    }

    this.cache = {
      data: result,
      expires: Date.now() + this.CACHE_TTL_MS,
      codigos: cacheKey,
    };
    return result;
  }

  private async fetchExamesRealizados(
    codigosEmpresa: string[],
  ): Promise<SocExameRealizadoEmpresa[]> {
    const mainEmpresa =
      this.configService.get<string>('SOC_WEBSERVICE_EMPRESA_PRINCIPAL') ||
      '1153506';

    const layoutCredentials = getSocExportLayoutCredentials(
      'SOC_ED_EXAMES_REALIZADOS_DATA_EMPRESA',
      this.configService,
    );

    const hoje = new Date();
    const umAnoAtras = new Date(hoje);
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

    const fmtBr = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const dataInicio = fmtBr(umAnoAtras);
    const dataFim = fmtBr(hoje);

    this.logger.log(
      `[SOC] EXAMES_REALIZADOS_DATA_EMPRESA: ${codigosEmpresa.length} empresas, período ${dataInicio} a ${dataFim}`,
    );

    const tasks = codigosEmpresa.map((empresaTrabalho) => async () => {
      await randomDelay();
      const payload = {
        empresa: mainEmpresa,
        ...layoutCredentials,
        tipoSaida: 'json',
        empresaTrabalho,
        dataInicio,
        dataFim,
      };
      const url = buildSocExportDataUrl(payload, this.configService);
      this.logger.log(`[SOC] Chamando empresa ${empresaTrabalho}...`);
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) {
          this.logger.warn(
            `[SOC] Erro HTTP ${response.status} para empresa ${empresaTrabalho}`,
          );
          return [];
        }
        const buffer = await response.arrayBuffer();
        const decoded = new TextDecoder('iso-8859-1').decode(buffer);
        if (decoded.length < 200) {
          this.logger.warn(
            `[SOC] Resposta curta para empresa ${empresaTrabalho}: "${decoded.substring(0, 150)}"`,
          );
          return [];
        }
        const data = safeParseSocJson<SocExameRealizadoEmpresa>(
          decoded,
          'exames',
          this.logger,
        );
        this.logger.log(
          `[SOC] Empresa ${empresaTrabalho}: ${data.length} exames`,
        );
        return data;
      } catch (err) {
        this.logger.error(
          `[SOC] Erro chamando empresa ${empresaTrabalho}: ${err}`,
        );
        return [];
      }
    });

    const results = await runBatchWithConcurrency(tasks, 5);
    const all: SocExameRealizadoEmpresa[] = [];
    for (const list of results) {
      if (Array.isArray(list)) all.push(...list);
    }
    return all;
  }

  private buildResumo(
    exames: SocExameRealizadoEmpresa[],
    codigosEmpresa: string[],
    hoje: Date,
  ): DashboardResumo {
    const empresaSet = new Set(codigosEmpresa);

    const examesPorEmpresaFunc = new Map<string, SocExameRealizadoEmpresa[]>();
    for (const e of exames) {
      const emp = String((e as any).EMPRESA ?? '').trim();
      if (!empresaSet.has(emp)) continue;
      const funcCod = String((e as any).CODFUNCIONARIO ?? '').trim();
      if (!funcCod) continue;
      const key = `${emp}|${funcCod}`;
      if (!examesPorEmpresaFunc.has(key)) examesPorEmpresaFunc.set(key, []);
      examesPorEmpresaFunc.get(key)!.push(e);
    }

    const porEmpresa: DashboardResumo['porEmpresa'] = [];
    let totValidos = 0, totAVencer = 0, totVencidos = 0, totSem = 0;

    for (const codigo of codigosEmpresa) {
      const funcCodes = new Set<string>();
      for (const [key] of examesPorEmpresaFunc) {
        if (key.startsWith(`${codigo}|`)) {
          funcCodes.add(key.split('|')[1]);
        }
      }

      let validos = 0, aVencer = 0, vencidos = 0, semHistorico = 0;

      for (const funcCod of funcCodes) {
        const examesFunc =
          examesPorEmpresaFunc.get(`${codigo}|${funcCod}`) || [];

        let dataExame: Date | null = null;

        for (const e of examesFunc) {
          const de = this.parseSocDate((e as any).DATAEXAME);
          if (de) {
            if (!dataExame || de > dataExame) dataExame = de;
          }
        }

        if (!dataExame) {
          semHistorico++;
          continue;
        }

        const venc = new Date(dataExame);
        venc.setFullYear(venc.getFullYear() + 1);
        const diffDays = Math.floor(
          (venc.getTime() - hoje.getTime()) / 86400000,
        );

        if (diffDays < 0) vencidos++;
        else if (diffDays <= 30) aVencer++;
        else validos++;
      }

      porEmpresa.push({
        codigo,
        validos,
        aVencer,
        vencidos,
        semHistorico,
        total: funcCodes.size,
      });
      totValidos += validos;
      totAVencer += aVencer;
      totVencidos += vencidos;
      totSem += semHistorico;
    }

    return {
      validos: totValidos,
      aVencer: totAVencer,
      vencidos: totVencidos,
      semHistorico: totSem,
      total: totValidos + totAVencer + totVencidos + totSem,
      porEmpresa,
    };
  }

  private parseSocDate(v: string | null | undefined): Date | null {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s || s === 'null' || s === 'undefined') return null;
    const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m2) {
      const d = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
      return isNaN(d.getTime()) ? null : d;
    }
    const m4 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m4) {
      const d = new Date(Number(m4[1]), Number(m4[2]) - 1, Number(m4[3]));
      return isNaN(d.getTime()) ? null : d;
    }
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
