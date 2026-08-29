import axios from 'axios';
import * as qs from 'qs';
import * as https from 'https';
import { Logger } from '@nestjs/common';
import { buildNameSearchVariants, fuzzyMatchesByNameTokens } from '../utils/name-normalization.util';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class VeitiekaScraper {
  private readonly logger = new Logger(VeitiekaScraper.name);
  private readonly baseUrl = 'https://api.portal.rdicom.com.br';
  private readonly requestTimeoutMs = parsePositiveInt(
    process.env.SCRAPER_HTTP_TIMEOUT_MS,
    30000,
  );
  private token: string | null = null;
  private cookies: Record<string, string> = {};

  constructor(
    private readonly creds = {
      conReg: 'CRM',
      conRegUf: process.env.VEITIEKA_UF || 'SP',
      conRegNum: process.env.VEITIEKA_NUMBER || '20230731',
      pws: process.env.VEITIEKA_PASSWORD || 'cmso123',
    },
  ) {}

  private getCookieString(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private updateCookies(headers: any) {
    if (headers['set-cookie']) {
      headers['set-cookie'].forEach((c: string) => {
        const parts = c.split(';')[0].split('=');
        if (parts.length === 2) {
          this.cookies[parts[0]] = parts[1];
        }
      });
    }
  }

  async login() {
    this.logger.log(
      `[Veitieka] Iniciando login para ${this.creds.conRegNum}...`,
    );

    const payload = qs.stringify({
      conReg: this.creds.conReg,
      conRegUf: this.creds.conRegUf,
      conRegNum: this.creds.conRegNum,
      pws: this.creds.pws,
    });

    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Origin: 'https://palluda.rdicom.com.br',
          Referer: 'https://palluda.rdicom.com.br/',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: this.requestTimeoutMs,
      });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        this.updateCookies(response.headers);
        this.logger.log('[Veitieka] Login realizado com sucesso.');
        return true;
      }

      throw new Error('Token não encontrado na resposta de login.');
    } catch (error) {
      this.logger.error(`[Veitieka] Erro no login: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calcula a janela de busca a partir da data de agendamento.
   * Retorna -7 dias ~ +1 dia em relação à data informada.
   * Fallback: primeiro dia do ano corrente ~ hoje (busca ampla).
   */
  private buildSearchDateRange(appointmentDate?: string): { start: string; end: string } {
    const today = new Date();

    if (!appointmentDate) {
      return {
        start: `01/01/${today.getFullYear()}`,
        end: today.toLocaleDateString('pt-BR'),
      };
    }

    const parts = appointmentDate.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
    if (!parts) {
      return {
        start: `01/01/${today.getFullYear()}`,
        end: today.toLocaleDateString('pt-BR'),
      };
    }

    const day = Number(parts[1]);
    const month = Number(parts[2]) - 1;
    const year = Number(parts[3]);

    const appointment = new Date(year, month, day);
    const start = new Date(appointment);
    start.setDate(start.getDate() - 7);
    const end = new Date(appointment);
    end.setDate(end.getDate() + 1);

    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    return { start: fmt(start), end: fmt(end) };
  }

  async searchPatient(name: string, context?: {
    appointmentDate?: string;
    schedulingId?: string;
    pendingGroups?: string[];
    pendingExamCodes?: string[];
  }) {
    if (!this.token) await this.login();

    this.logger.log(`[Veitieka] Buscando exames para: ${name}...`);

    const { start, end } = this.buildSearchDateRange(context?.appointmentDate);
    this.logger.log(
      `[Veitieka] Janela de busca: ${start} ~ ${end} (appointmentDate=${context?.appointmentDate ?? 'N/A'})`,
    );

    const searchVariants = buildNameSearchVariants(name);
    const allRows: any[] = [];
    const seenStudyUids = new Set<string>();

    for (const variant of searchVariants) {
      const payload = {
        sort: 'studyDate',
        order: 'desc',
        limit: 20,
        offset: 0,
        filter: [
          { name: 'studyDateStart', value: start },
          { name: 'studyDateEnd', value: end },
          { name: 'patientId', value: '' },
          { name: 'patientName', value: variant },
          { name: 'referringPhysicianname', value: '' },
        ],
      };

      try {
        const response = await axios.post(
          `${this.baseUrl}/studies/doctors/paginate`,
          payload,
          {
            headers: {
              Authorization: `Rdicom-Tk ${this.token}`,
              'Content-Type': 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            timeout: this.requestTimeoutMs,
          },
        );

        if (response.data && response.data.rows) {
          for (const row of response.data.rows) {
            if (!seenStudyUids.has(row.studyUid)) {
              seenStudyUids.add(row.studyUid);
              
              // Verifica se o nome retornado pela API atende ao fuzzy match
              const rowName = String(row.patientName || row.patient?.name || '').trim();
              if (!rowName || fuzzyMatchesByNameTokens(rowName, name)) {
                allRows.push(row);
              } else {
                this.logger.debug(`[Veitieka] Resultado ignorado por fuzzy match falho: ${rowName}`);
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(`[Veitieka] Erro na busca com variante "${variant}": ${error.message}`);
      }
    }

    this.logger.debug(
      `[Veitieka] Busca concluída. Resultados válidos encontrados: ${allRows.length}`,
    );
    return allRows;
  }

  async downloadReport(study: any): Promise<Buffer | null> {
    if (!this.token) await this.login();

    const { studyUid, _id, healthcareBy } = study;
    const hcId = healthcareBy?._id || study.healthcareId;
    const metadataUrl = `${this.baseUrl}/api/medicalreports/pacs/${studyUid}/${hcId}?studyId=${_id}`;

    try {
      // 1. Obter a URL de download
      const metaResponse = await axios.get(metadataUrl, {
        headers: {
          Authorization: `Rdicom-Tk ${this.token}`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: this.requestTimeoutMs,
      });

      if (
        !metaResponse.data ||
        !Array.isArray(metaResponse.data) ||
        metaResponse.data.length === 0
      ) {
        this.logger.warn(`[Veitieka] Nenhum laudo disponível para _id ${_id}`);
        return null;
      }

      // O sistema pode retornar múltiplos laudos, pegamos o primeiro por padrão
      const reportInfo = metaResponse.data[0];
      const downloadUrl = reportInfo.url;

      if (!downloadUrl) {
        this.logger.warn(
          `[Veitieka] URL de download não encontrada para _id ${_id}`,
        );
        return null;
      }

      // 2. Realizar o download do PDF
      const pdfResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: this.requestTimeoutMs,
      });

      const content = Buffer.from(pdfResponse.data);
      if (content.slice(0, 4).toString() === '%PDF') {
        return content;
      }

      this.logger.warn(
        `[Veitieka] O conteúdo baixado não é um PDF válido para _id ${_id}`,
      );
    } catch (error) {
      this.logger.error(
        `[Veitieka] Erro ao baixar laudo para _id ${_id}: ${error.message}`,
      );
    }
    return null;
  }
}
