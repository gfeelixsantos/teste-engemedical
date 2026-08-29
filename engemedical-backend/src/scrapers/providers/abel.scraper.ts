import axios from 'axios';
import * as qs from 'qs';
import { Logger } from '@nestjs/common';
import { matchesByNameTokens } from '../utils/name-normalization.util';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class AbelScraper {
  private readonly logger = new Logger(AbelScraper.name);
  private readonly baseUrl = 'https://portal.worklabweb.com.br';
  private readonly requestTimeoutMs = parsePositiveInt(
    process.env.SCRAPER_HTTP_TIMEOUT_MS,
    30000,
  );
  private cookies: Record<string, string> = {};

  constructor(
    private readonly creds = {
      codigo: process.env.ABEL_CODIGO || 'CM',
      senha: process.env.ABEL_SENHA || 'CMS',
      opcao: 'convenio',
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
    this.logger.log('Iniciando login no portal Abel (Worklab)...');
    try {
      // Obter os cookies iniciais
      const initialRes = await axios.get(`${this.baseUrl}/resultados-on-line/301`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        timeout: this.requestTimeoutMs,
      });
      this.updateCookies(initialRes.headers);

      const loginPayload = qs.stringify({
        tbCodigo: this.creds.codigo,
        tbSenha: this.creds.senha,
        rdbOpcao: this.creds.opcao,
      });

      const loginRes = await axios.post(
        `${this.baseUrl}/resultados-on-line/301`,
        loginPayload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Cookie: this.getCookieString(),
            Origin: this.baseUrl,
            Referer: `${this.baseUrl}/resultados-on-line/301`,
          },
          timeout: this.requestTimeoutMs,
          maxRedirects: 5,
        },
      );
      this.updateCookies(loginRes.headers);
      this.logger.log('Sessão Abel estabelecida com sucesso.');
    } catch (error) {
      this.logger.error(`Erro no login Abel: ${error.message}`);
      throw error;
    }
  }

  async searchPatient(name: string, _context?: any): Promise<any[]> {
    const nameTrimmed = name.trim();
    const query = encodeURIComponent(JSON.stringify({ nompac: nameTrimmed }));
    
    let startPeriod = '';
    let endPeriod = '';
    
    if (_context?.appointmentDate) {
      try {
        const appointmentDate = _context.appointmentDate;
        let baseDate: Date;
        if (appointmentDate.includes('/')) {
          const parts = appointmentDate.split('/');
          baseDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          baseDate = new Date(appointmentDate);
        }
        
        if (!isNaN(baseDate.getTime())) {
          const start = new Date(baseDate);
          start.setDate(start.getDate() - 15);
          const end = new Date(baseDate);
          end.setDate(end.getDate() + 15);
          
          startPeriod = start.toISOString().split('T')[0];
          endPeriod = end.toISOString().split('T')[0];
        }
      } catch (e) {
        this.logger.warn(`Erro ao processar data de agendamento: ${e.message}`);
      }
    }
    
    if (!startPeriod || !endPeriod) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const end = new Date(now);
      end.setDate(end.getDate() + 15);
      
      startPeriod = start.toISOString().split('T')[0];
      endPeriod = end.toISOString().split('T')[0];
    }
    
    const listUrl = `${this.baseUrl}/resultados-on-line/convenio/listar?query=${query}&limit=10&ascending=0&page=1&byColumn=1&orderBy=codficha&filtroPeriodoInicio=${startPeriod}&filtroPeriodoFim=${endPeriod}&filtroStatus=resultado_disponivel&filtroConvenioVisualizado=`;

    let xsrfHeader: Record<string, string> = {};
    if (this.cookies['XSRF-TOKEN']) {
      xsrfHeader['X-XSRF-TOKEN'] = decodeURIComponent(this.cookies['XSRF-TOKEN']);
    }

    try {
      const searchRes = await axios.get(listUrl, {
        headers: {
          Cookie: this.getCookieString(),
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: `${this.baseUrl}/resultados-on-line/301`,
          ...xsrfHeader,
        },
        timeout: this.requestTimeoutMs,
      });

      if (searchRes.data && Array.isArray(searchRes.data.data)) {
        const matches = searchRes.data.data
          .filter((row: any) => {
            const rowName = String(row.nompac || '').trim();
            return matchesByNameTokens(rowName, nameTrimmed);
          })
          .map((row: any) => ({
            id: String(row.pacienteid),
            patientName: row.nompac.trim(),
            date: row.datarec,
            status: 'Resultado Disponível',
            score: 1.0,
          }));

        if (matches.length > 0) {
          this.logger.debug(
            `[Abel] ${matches.length} matches de nome encontrados para "${nameTrimmed}".`,
          );
        }
        return matches;
      }
    } catch (error) {
      this.logger.error(
        `Erro ao buscar paciente ${name} no Abel: ${error.message}`,
      );
    }
    return [];
  }

  async downloadReport(patientData: any): Promise<Buffer | null> {
    const { id, patientName } = patientData;
    const pdfUrl = `${this.baseUrl}/resultados-on-line/convenio/print/${id}?download=1`;

    this.logger.log(`[Abel] Baixando laudo para ${patientName} (id: ${id})...`);

    try {
      const pdfRes = await axios.get(pdfUrl, {
        headers: {
          Cookie: this.getCookieString(),
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: `${this.baseUrl}/resultados-on-line/301`,
        },
        responseType: 'arraybuffer',
        timeout: this.requestTimeoutMs,
      });

      const buffer = Buffer.from(pdfRes.data);
      if (buffer.slice(0, 4).toString() === '%PDF') {
        this.logger.log(`[Abel] Laudo baixado com sucesso (${buffer.length} bytes).`);
        return buffer;
      }
      this.logger.warn(`[Abel] O download não retornou um PDF válido.`);
    } catch (error) {
      this.logger.error(
        `Erro ao baixar laudo para ${patientName} no Abel: ${error.message}`,
      );
    }
    return null;
  }
}
