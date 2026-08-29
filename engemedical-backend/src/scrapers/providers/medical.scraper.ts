import axios from 'axios';
import * as qs from 'qs';
import * as https from 'https';
import { Logger } from '@nestjs/common';
import { buildMedicalSearchVariants } from '../utils/name-normalization.util';
import { rankDateAwareCandidates } from '../utils/medical-candidate-ranking.util';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class MedicalScraper {
  private readonly logger = new Logger(MedicalScraper.name);
  private readonly baseUrl = 'https://painel.medicallaudos.com.br';
  private readonly requestTimeoutMs = parsePositiveInt(
    process.env.SCRAPER_HTTP_TIMEOUT_MS,
    30000,
  );
  private cookies: Record<string, string> = {};

  constructor(
    private readonly creds = {
      email: process.env.MEDICAL_USER || 'cmso',
      senha: process.env.MEDICAL_PASSWORD || 'cmso123',
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
    this.logger.log(`[Medical] Iniciando login para ${this.creds.email}...`);

    try {
      // 1. Acessar a home para obter o PHPSESSID inicial
      const homeResponse = await axios.get(`${this.baseUrl}/`, {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        timeout: this.requestTimeoutMs,
      });
      this.updateCookies(homeResponse.headers);

      // 2. Realizar o login no endpoint correto
      const payload = qs.stringify({
        email: this.creds.email,
        senha: this.creds.senha,
      });

      const response = await axios.post(
        `${this.baseUrl}/app_blocos_ed/login/entrar.php`,
        payload,
        {
          headers: {
            Cookie: this.getCookieString(),
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          timeout: this.requestTimeoutMs,
        },
      );

      if (
        response.data === 'sucesso' ||
        JSON.stringify(response.data).includes('sucesso') ||
        (typeof response.data === 'string' && response.data.trim() === '')
      ) {
        this.updateCookies(response.headers);
        this.logger.log('[Medical] Login realizado com sucesso.');
        return true;
      }

      throw new Error(
        `Resposta de login inesperada: ${JSON.stringify(response.data)}`,
      );
    } catch (error) {
      this.logger.error(`[Medical] Erro no login: ${error.message}`);
      throw error;
    }
  }

  private parseYear(value?: string): number | null {
    if (!value) return null;
    const m = value.match(/\b(\d{4})\b/);
    return m ? Number(m[1]) : null;
  }

  /**
   * Retorna se o nome do exame retornado pelo portal Medical corresponde
   * a algum dos grupos pendentes do agendamento.
   *
   * O portal Medical retorna o nome do exame (ex: "EEG: Eletroencefalograma Ocupacional")
   * no campo patientName — não o nome do paciente. Usamos isso para filtrar
   * candidatos pelo grupo correto antes de tentar o download.
   */
  private examNameMatchesPendingGroups(
    examName: string,
    pendingGroups: string[],
  ): boolean {
    if (!pendingGroups || pendingGroups.length === 0) return true;
    const normalized = (examName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    return pendingGroups.some((group) => {
      const g = group.toUpperCase();
      if (g === 'ECG') return /\bECG\b|ELETROCARDIOGRAMA/i.test(normalized);
      if (g === 'EEG') return /\bEEG\b|ELETROENCEFALOGRAMA/i.test(normalized);
      if (g === 'RAIOX') return /\bRX\b|RAIO.?X|TORAX|COLUNA|LOMBO/i.test(normalized);
      if (g === 'LABORATORIO') return /LABORATORIO|HEMOGRAMA|SANGUE/i.test(normalized);
      return normalized.includes(g);
    });
  }

  async searchPatient(name: string, context?: {
    appointmentDate?: string;
    schedulingId?: string;
    pendingGroups?: string[];
    pendingExamCodes?: string[];
  }) {
    if (Object.keys(this.cookies).length === 0) await this.login();

    this.logger.log(`[Medical] Buscando exames para: ${name}...`);

    const searchVariants = buildMedicalSearchVariants(name);
    const allMapped: any[] = [];
    const seenIds = new Set<string>();
    let foundWithStrictVariant = false;

    for (const variant of searchVariants) {
      // Se já encontramos resultado com variante estrita, não tenta variante fraca (firstTwo)
      // para evitar falsos positivos (ex: "andre luiz" captura "ANDRE LUIZ SANTANA CAMARA")
      if (foundWithStrictVariant) {
        this.logger.debug(
          `[Medical] Pulando variante "${variant}" pois já há resultados com variante mais específica.`,
        );
        break;
      }

      const params = {
        draw: 1,
        start: 0,
        length: 20,
        'search[value]': variant,
        'search[regex]': false,
      };

      try {
        const response = await axios.get(
          `${this.baseUrl}/arquivos_ajax/registros/ajax.php`,
          {
            params,
            headers: {
              Cookie: this.getCookieString(),
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            timeout: this.requestTimeoutMs,
          },
        );

        if (response.data && response.data.data) {
          const rows: any[] = response.data.data;
          this.logger.debug(
            `[Medical] Busca com variante "${variant}" retornou ${rows.length} resultado(s).`,
          );

          // Guarda de segurança: se esta é a variante firstTwo (mais fraca) e ela
          // retornou mais de 1 resultado, NÃO inclui — há ambiguidade de pessoa.
          const isLastVariant = variant === searchVariants[searchVariants.length - 1];
          if (isLastVariant && rows.length > 1) {
            this.logger.warn(
              `[Medical] Variante fraca "${variant}" retornou ${rows.length} candidatos — descartada por ambiguidade (risco de vincular laudo de outra pessoa).`,
            );
            continue;
          }

          let addedCount = 0;
          for (const row of rows) {
            const id = Array.isArray(row[0]) ? row[0][0] : row[0];
            if (!seenIds.has(String(id))) {
              seenIds.add(String(id));
              
              // A resposta da API do Medical é estruturada da seguinte forma:
              // - row[1]: Array com informações do paciente. row[1][0] contém o nome (ex: "ELVIS ERIK DOS SANTOS") e row[1][2] contém o CPF.
              // - row[2]: String com o nome do exame (ex: "ECG: Eletrocardiograma").
              const patientName = Array.isArray(row[1]) ? row[1][0] : row[1];
              const examName = Array.isArray(row[2]) ? row[2][0] : row[2];
              const date = Array.isArray(row[4]) ? row[4][0] : row[4];
              const status = Array.isArray(row[5]) ? row[5][0] : row[5];
              
              allMapped.push({ id, patientName, examName, date, status });
              addedCount++;
            }
          }

          if (addedCount > 0) {
            foundWithStrictVariant = true;
          }
        }
      } catch (error) {
        this.logger.error(`[Medical] Erro na busca com variante "${variant}": ${error.message}`);
      }
    }

    if (allMapped.length > 0) {
      const pendingGroups = context?.pendingGroups ?? [];
      const mapped = allMapped;

        if (pendingGroups.length > 0) {
          const filtered = mapped.filter((candidate: any) =>
            this.examNameMatchesPendingGroups(candidate.examName, pendingGroups),
          );
          this.logger.debug(
            `[Medical] Filtro por grupo aplicado: ${mapped.length} -> ${filtered.length} candidatos (pendingGroups=${pendingGroups.join(',')})`,
          );

          // Ao invés de apenas filtrar por ano, aplicamos o rankeamento
          // que pontua a distância de dias e garante o mais próximo no topo
          if (context?.appointmentDate && filtered.length > 1) {
            const ranked = rankDateAwareCandidates(name, context.appointmentDate, filtered);
            this.logger.debug(
              `[Medical] Rankeamento por data aplicado (appointmentDate=${context.appointmentDate}). Candidato principal: ${ranked[0]?.date}`
            );
            return ranked;
          }

          return filtered;
        }

      // Se não tem pendingGroups, também ordena
      if (context?.appointmentDate && mapped.length > 1) {
        return rankDateAwareCandidates(name, context.appointmentDate, mapped);
      }

      return mapped;
    }
    return [];
  }

  async downloadReport(exam: any): Promise<Buffer | null> {
    if (Object.keys(this.cookies).length === 0) await this.login();

    const payload = qs.stringify({
      cod: exam.id,
      tipo: 1,
    });

    try {
      // 1. Obter o HTML que contém o link do S3
      const response = await axios.post(
        `${this.baseUrl}/arquivos_ajax/registros/laudos/view.php`,
        payload,
        {
          headers: {
            Cookie: this.getCookieString(),
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          timeout: this.requestTimeoutMs,
        },
      );

      const match = response.data.match(/src="([^"]+)"/);
      if (!match) {
        this.logger.warn(
          `[Medical] Link do laudo não encontrado no HTML para o exame ${exam.id}`,
        );
        return null;
      }

      const downloadUrl = match[1].startsWith('http')
        ? match[1]
        : `${this.baseUrl}${match[1].startsWith('/') ? '' : '/'}${match[1]}`;

      this.logger.log(`[Medical] Baixando laudo de: ${downloadUrl}`);

      // 2. Baixar o PDF do S3
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
        `[Medical] Conteúdo baixado não é um PDF válido para o exame ${exam.id}`,
      );
    } catch (error) {
      this.logger.error(
        `[Medical] Erro ao baixar laudo para o exame ${exam.id}: ${error.message}`,
      );
    }
    return null;
  }
}
