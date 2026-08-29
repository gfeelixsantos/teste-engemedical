import axios from 'axios';
import * as qs from 'qs';
import { Logger } from '@nestjs/common';
import { matchesByNameTokens, fuzzyMatchesByNameTokens, buildNameSearchVariants } from '../utils/name-normalization.util';
import { rankCandidatesByClosestDate } from '../utils/date-ranking.util';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class WorklabScraper {
  private readonly logger = new Logger(WorklabScraper.name);
  private readonly baseUrl = 'https://app2.worklabweb.com.br';
  private readonly requestTimeoutMs = parsePositiveInt(
    process.env.SCRAPER_HTTP_TIMEOUT_MS,
    30000,
  );
  private cookies: Record<string, string> = {};

  constructor(
    private readonly creds = {
      cliente: process.env.WORKLAB_CLIENTE || '2751',
      user: process.env.WORKLAB_USER || 'centro',
      pass: process.env.WORKLAB_PASS || '12345',
    },
  ) {}

  private getCookieString(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private updateCookies(headers: any) {
    if (headers['set-cookie']) {
      headers['set-cookie'].forEach((cookieStr: string) => {
        const parts = cookieStr.split(';')[0].split('=');
        this.cookies[parts[0]] = parts[1];
      });
    }
  }

  async login() {
    this.logger.log('Iniciando login no Worklab...');
    const loginPayload = qs.stringify({
      new_form: 'new_form',
      new_login_cliente: this.creds.cliente,
      new_login_username: this.creds.user,
      new_login_password: this.creds.pass,
    });

    try {
      const loginRes = await axios.post(
        `${this.baseUrl}/index.php`,
        loginPayload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Origin: this.baseUrl,
            Referer: `${this.baseUrl}/index.php`,
          },
          timeout: this.requestTimeoutMs,
          maxRedirects: 0,
          validateStatus: (s) => s < 400,
        },
      );
      this.updateCookies(loginRes.headers);

      // Estabilizar Sessão
      await axios.get(`${this.baseUrl}/welcome.php`, {
        headers: {
          Cookie: this.getCookieString(),
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        timeout: this.requestTimeoutMs,
      });
      this.logger.log('Sessão Worklab estabelecida com sucesso.');
    } catch (error) {
      this.logger.error(`Erro no login Worklab: ${error.message}`);
      throw error;
    }
  }

  async searchPatient(name: string, context?: any): Promise<any[][]> {
    const nameTrimmed = name.trim();
    const nameForQuery = encodeURIComponent(nameTrimmed);
    const query = [
      `draw=1`,
      `columns[0][data]=0`,
      `columns[0][searchable]=true`,
      `columns[1][data]=1`,
      `columns[1][searchable]=true`,
      `columns[2][data]=2`,
      `columns[2][searchable]=true`,
      `columns[2][search][value]=${nameForQuery}`,
      `start=0`,
      `length=10`,
      `bymonth=1`,
    ].join('&');

    try {
      const searchRes = await axios.get(
        `${this.baseUrl}/datatable.php?${query}`,
        {
          headers: {
            Cookie: this.getCookieString(),
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Referer: `${this.baseUrl}/pacientes-data.php`,
          },
          timeout: this.requestTimeoutMs,
        },
      );

      if (
        searchRes.data &&
        searchRes.data.aaData &&
        searchRes.data.aaData.length > 0
      ) {
        let matches = searchRes.data.aaData.filter((row: any) => {
          const rowName = String(row[3] || '').trim();
          return fuzzyMatchesByNameTokens(rowName, nameTrimmed);
        });

        if (matches.length > 0) {
          if (context?.appointmentDate) {
            matches = rankCandidatesByClosestDate(matches, context.appointmentDate, (row: any[]) => {
              for (const col of row) {
                if (typeof col === 'string' && col.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/)) {
                  return col;
                }
              }
              return undefined;
            });
          }

          this.logger.debug(
            `[Worklab] ${matches.length} matches de nome encontrados.`,
          );
        }
        return matches;
      }
    } catch (error) {
      this.logger.error(
        `Erro ao buscar paciente ${name} no Worklab: ${error.message}`,
      );
    }
    return [];
  }

  async downloadReport(patientData: any[]): Promise<Buffer | null> {
    const patientId = patientData[0];
    const patientCode = patientData[1];
    const patientName = patientData[3].trim();

    try {
      // Trigger report generation (MANDATORY)
      await axios.get(`${this.baseUrl}/printLaudo.php?id=${patientId}`, {
        headers: {
          Cookie: this.getCookieString(),
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        timeout: this.requestTimeoutMs,
      });

      // Download PDF
      const codParam = `${patientCode}-${patientName.replace(/ /g, '%20')}%20%20`;
      const viewUrl = `${this.baseUrl}/view.php?cod=${codParam}`;

      const pdfRes = await axios.get(viewUrl, {
        headers: {
          Cookie: this.getCookieString(),
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        },
        responseType: 'arraybuffer',
        timeout: this.requestTimeoutMs,
      });

      if (pdfRes.data.length > 5000) {
        return Buffer.from(pdfRes.data);
      }
    } catch (error) {
      this.logger.error(
        `Erro ao baixar laudo para ${patientName} no Worklab: ${error.message}`,
      );
    }
    return null;
  }
}
