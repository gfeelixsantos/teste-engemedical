import axios from 'axios';
import * as qs from 'qs';
import { Logger } from '@nestjs/common';
import { matchesByNameTokens, fuzzyMatchesByNameTokens, buildCedillNameSearchVariants } from '../utils/name-normalization.util';
import { rankCandidatesByClosestDate } from '../utils/date-ranking.util';

// puppeteer-extra types are incompatible with TS strict mode — use require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteerExtra = require('puppeteer-extra');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class CedillScraper {
  private readonly logger = new Logger(CedillScraper.name);
  private readonly baseUrl = 'https://www.veusserver.com';
  private readonly requestTimeoutMs = parsePositiveInt(
    process.env.CEDILL_HTTP_TIMEOUT_MS || process.env.SCRAPER_HTTP_TIMEOUT_MS,
    8000,
  );
  private cookies: Record<string, string> = {};
  private sessionId: string | null = null;
  private searchPageLoaded = false;
  private defaultVetorLaudoT: string[] = [];
  private principalCache: any[] | null = null;
  private archiveCache: Map<number, any[]> = new Map();
  private readonly dadosCicPosto: string;
  private browser: any = null;
  private page: any = null;
  private useBrowser = true; // Puppeteer para POST (Cloudflare bloqueia axios POST)

  // User-Agent padrao — headers como sec-ch-ua e Sec-Fetch-* causam 403 no Cloudflare
  // quando enviados por Node.js (fingerprint TLS diferente do browser real).
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  constructor(
    private readonly creds = {
      company: process.env.CEDILL_COMPANY || 'labcenter',
      post: process.env.CEDILL_POST || 'CMSO',
      password: process.env.CEDILL_PASSWORD || '70432356',
    },
  ) {
    this.dadosCicPosto = `${this.creds.post} - CENTRO MÉDICO SAUDE OCUPACIONAL||${this.creds.post}||`;
  }

  private async launchBrowser(): Promise<any> {
    if (this.browser && this.browser.connected) return this.browser;

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    this.browser = await puppeteerExtra.launch({
      headless: 'new' as any,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--no-first-run',
      ],
    });
    this.logger.log('[Cedill][BROWSER] Puppeteer launched');
    return this.browser;
  }

  private async closeBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  private async convertHtmlToPdf(html: string, browser: any): Promise<Buffer | null> {
    try {
      // Validate existing page is still usable — if closed/errored, create fresh
      if (this.page) {
        try { await this.page.evaluate(() => 1); } catch { this.page = null; }
      }
      if (!this.page) {
        this.page = await browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
      }
      const page = this.page;
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 8000 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`[Cedill][HTML_TO_PDF] Error: ${error.message}`);
      return null;
    }
  }

  private async downloadWithBrowser(
    metadata: any,
    isPdf: boolean,
  ): Promise<Buffer | null> {
    const browser = await this.launchBrowser();
    // Validate existing page is still usable — if closed/errored, create fresh
    if (this.page) {
      try { await this.page.evaluate(() => 1); } catch { this.page = null; }
    }
    if (!this.page) {
      this.page = await browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
    }
    const page = this.page;

    try {
      const { nic, visita, date, posto, crm, seqEnvio, optHistT, sttLaudoImagem, vetorLaudoT, searchName, grupo } = metadata;
      const seqEnvioVal = seqEnvio || '1';
      const optHistTVal = optHistT || '0';
      const endpoint = isPdf ? 'mostra_laudo_pdf' : 'mostra_laudo_lamina';
      const extraParam = isPdf ? '&volta=2' : '&opt=0';

      const pdfUrl = `${this.baseUrl}/veus_laudo/${endpoint}.php?sessao_id=${this.sessionId}&nic=${nic}&visita=${visita}&data_atendimento=${date}&posto=${posto}&crm=${seqEnvioVal}&opt_hist_t=${optHistTVal}&seq_envio=1${extraParam}`;

      const dadosCicUrl = this.dadosCicPosto.replace(/ /g, '%20');
      const referer = `${this.baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php?sessao_id=${this.sessionId}&dados_cic_posto_t=${dadosCicUrl}&totem=`;

      await page.setViewport({ width: 1920, height: 1080 });

      const cookieList = Object.entries(this.cookies).map(([name, value]) => ({
        name,
        value,
        domain: '.veusserver.com',
        path: '/',
      }));
      if (cookieList.length > 0) await page.setCookie(...cookieList);

      // Navigate to portal first so fetch() runs on the correct origin
      const initUrl = `${this.baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php?sessao_id=${this.sessionId}&dados_cic_posto_t=${dadosCicUrl}&totem=`;
      await page.goto(initUrl, { waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs });

      // Build form data — include grupo from the search result
      const formData = qs.stringify({
        dados_cic_posto_t: this.dadosCicPosto,
        nic, visita,
        crm: seqEnvioVal,
        conselho: '', uf_conselho: '',
        data_atendimento: date, posto,
        asc_desc_ordem: 'DESC', campo_ordem: 'DATA_ATENDIMENTO',
        pagina: '1', grupo: grupo || '', laudos_grupo: '',
        por: searchName || '', em: 'NOME_PACIENTE',
        procura_gr: '', procura: '2', seq_envio: '1',
        ...(vetorLaudoT && vetorLaudoT.length > 0 ? { vetor_laudo_t: vetorLaudoT } : {}),
        procura_por: '', procura_em: 'NOME_PACIENTE', grupo_procura: '',
      }, { format: 'RFC1738', arrayFormat: 'brackets' });

      // Use page.evaluate to make fetch with form data (real browser TLS)
      const result = await page.evaluate(
        async (url: string, body: string, referer: string, responseType: string) => {
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': referer,
            },
            body,
          });
          if (responseType === 'arraybuffer') {
            const ab = await resp.arrayBuffer();
            return { status: resp.status, data: Array.from(new Uint8Array(ab)), contentType: resp.headers.get('content-type') };
          }
          return { status: resp.status, data: await resp.text(), contentType: resp.headers.get('content-type') };
        },
        pdfUrl,
        formData,
        referer,
        isPdf ? 'arraybuffer' : 'text',
      );

      if (result.status !== 200) {
        this.logger.error(`[Cedill][BROWSER][DOWNLOAD] status=${result.status}`);
        return null;
      }

      const content = isPdf ? Buffer.from(result.data) : Buffer.from(result.data, 'utf-8');
      
      // Se não é PDF, converter HTML para PDF usando Puppeteer
      if (!isPdf) {
        const htmlContent = content.toString('utf-8');
        if (htmlContent.includes('<!') || htmlContent.includes('<html')) {
          this.logger.log(`[Cedill][BROWSER][DOWNLOAD] Converting HTML lamina to PDF for nic=${nic}`);
          const pdfBuffer = await this.convertHtmlToPdf(htmlContent, browser);
          if (pdfBuffer) {
            this.logger.log(
              `[Cedill][BROWSER][DOWNLOAD][SUCCESS] nic=${nic} bytes=${pdfBuffer.length} type=PDF (converted from HTML)`,
            );
            return pdfBuffer;
          }
        }
      }
      
      this.logger.log(
        `[Cedill][BROWSER][DOWNLOAD][SUCCESS] nic=${nic} bytes=${content.length} type=${isPdf ? 'PDF' : 'HTML'}`,
      );
      return content;
    } catch (error) {
      this.logger.error(`[Cedill][BROWSER][DOWNLOAD] Error: ${error.message}`);
      return null;
    } finally {
      await page.close();
    }
  }

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
      `[Cedill] Iniciando login para posto ${this.creds.post}...`,
    );

    const payload = qs.stringify({
      empresa: this.creds.company,
      posto: this.creds.post,
      senha: this.creds.password,
    }, { format: 'RFC1738' });

    try {
      const response = await axios.post(
        `${this.baseUrl}/veus_geral/valida_usuario_novo.php`,
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Origin: 'https://www.veus.com.br',
            Referer: 'https://www.veus.com.br/',
          },
          timeout: this.requestTimeoutMs,
          maxRedirects: 5,
          validateStatus: (s) => s < 500,
        },
      );

      this.updateCookies(response.headers);
      const finalUrl = response.request.res.responseUrl || '';

      if (finalUrl.includes('sessao_id=')) {
        this.sessionId = finalUrl.split('sessao_id=')[1].split('&')[0];
      } else {
        const match = response.data.match(/sessao_id=([a-zA-Z0-9]+)/);
        if (match) this.sessionId = match[1];
      }

      if (!this.sessionId) {
        throw new Error('Falha ao capturar sessao_id no login Cedill.');
      }

      this.logger.log(
        `[Cedill] Sessao estabelecida: ${this.sessionId.substring(0, 8)}...`,
      );
      return true;
    } catch (error) {
      this.logger.error(`[Cedill] Erro no login: ${error.message}`);
      throw error;
    }
  }

  private async initSearchPage(): Promise<void> {
    if (this.useBrowser || this.searchPageLoaded || !this.sessionId) return;

    // HAR GET: URL inclui dados_cic_posto_t com %20 para espacos, | cru (nao codificado)
    const dadosCicUrl = this.dadosCicPosto.replace(/ /g, '%20');
    const searchPageUrl = `${this.baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php`;
    const url = `${searchPageUrl}?sessao_id=${this.sessionId}&dados_cic_posto_t=${dadosCicUrl}&totem=`;
    // HAR GET: Referer aponta para a pagina de login (valida_usuario_novo.php)
    const referer = `${this.baseUrl}/veus_geral/valida_usuario_novo.php`;

    this.logger.log(`[Cedill][INIT] Carregando pagina de busca...`);

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          Cookie: this.getCookieString(),
          Referer: referer,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: this.requestTimeoutMs,
      });

      // Capturar cookies setados pelo servidor na resposta do GET
      this.updateCookies(response.headers);

      const html = String(response.data || '');

      // Extrair vetor_laudo_t[] default da pagina inicial (hidden fields)
      const vetorRegex = /NAME='vetor_laudo_t\[\]'\s+value='([^']+)'/g;
      let match;
      while ((match = vetorRegex.exec(html)) !== null) {
        this.defaultVetorLaudoT.push(match[1]);
      }

      this.searchPageLoaded = true;
      this.logger.log(
        `[Cedill][INIT] Pagina de busca carregada. status=${response.status} size=${html.length} defaultVetorLaudoT=${this.defaultVetorLaudoT.length}`,
      );
    } catch (error) {
      this.logger.error(`[Cedill][INIT] Erro ao carregar pagina de busca: ${error.message}`);
      // Nao lancar — busca pode funcionar sem GET previo em alguns casos
    }
  }

  private filterByName(records: any[], query: string): any[] {
    return records.filter((r: any) => {
      const rowName = String(r.name || '').trim();
      if (!rowName || rowName === '0') return false;
      const matched = fuzzyMatchesByNameTokens(rowName, query);
      return matched;
    });
  }

  private async loadGroupPages(page: any, groupName: string): Promise<any[]> {
    const allRecords: any[] = [];
    const seenNics = new Set<string>();
    let totalLaudos = 0;
    let pageNum = 1;

    while (true) {
      const html = await page.content();

      if (pageNum === 1) {
        const totalMatch = html.match(/(\d+)\s*Laudo\(s\)\s*disponível/);
        if (totalMatch) totalLaudos = parseInt(totalMatch[1]);
      }

      const parsed = this.parseSearchResults(html);
      for (const r of parsed) {
        r.grupo = groupName;
        if (!seenNics.has(r.nic)) {
          seenNics.add(r.nic);
          allRecords.push(r);
        }
      }

      const totalPages = Math.ceil(totalLaudos / 20);
      if (pageNum >= totalPages) break;

      pageNum++;
      await page.evaluate((p: number, sid: string) => {
        const form = (document as any).forms['corpo_conectado_posto'];
        if (!form) return;
        form.pagina.value = String(p);
        form.action = `corpo_conectado_posto_lamina.php?sessao_id=${sid}`;
        form.target = '';
        form.method = 'POST';
        (window as any).__cfRLUnblockHandlers = true;
        form.submit();
      }, pageNum, this.sessionId);

      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs }).catch(() => {});
      await page.waitForSelector('input[name="procura_por"]', { timeout: 5000 }).catch(() => {});
      try {
        await page.waitForFunction(() => {
          const html = document.documentElement.innerHTML;
          return html.includes('aciona_evento(event,') || html.includes('Laudo(s)');
        }, { timeout: 8000 });
      } catch {}
      await new Promise(r => setTimeout(r, 200));

      const curUrl = page.url();
      const sessaoMatch = curUrl.match(/sessao_id=([a-f0-9]+)/);
      if (sessaoMatch) this.sessionId = sessaoMatch[1];
    }

    this.logger.log(`[Cedill][CACHE] ${groupName}: ${allRecords.length}/${totalLaudos} records (${Math.ceil(totalLaudos / 20)} pages)`);
    return allRecords;
  }

  private async fetchPrincipalCandidates(): Promise<any[]> {
    try {
      const browser = await this.launchBrowser();
      if (this.page) {
        try { await this.page.evaluate(() => 1); } catch { this.page = null; }
      }
      if (!this.page) {
        this.page = await browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
      }
      const page = this.page;

      const cookieList = Object.entries(this.cookies).map(([name, value]) => ({
        name, value, domain: '.veusserver.com', path: '/',
      }));
      if (cookieList.length > 0) await page.setCookie(...cookieList);

      const dadosCicUrl = this.dadosCicPosto.replace(/ /g, '%20');
      const initUrl = `${this.baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php?sessao_id=${this.sessionId}&dados_cic_posto_t=${dadosCicUrl}&totem=`;
      this.logger.log(`[Cedill][CACHE] Loading Principal group...`);
      await page.goto(initUrl, { waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs });
      await page.waitForSelector('input[name="procura_por"]', { timeout: 5000 }).catch(() => {});

      return await this.loadGroupPages(page, 'Principal');
    } catch (error: any) {
      this.logger.error(`[Cedill][CACHE] fetchPrincipalCandidates error: ${error.message}`);
      return [];
    }
  }

  private async fetchArchiveCandidates(year: number): Promise<any[]> {
    const group = `ARQUIVO ${year}`;

    try {
      const browser = await this.launchBrowser();
      if (this.page) {
        try { await this.page.evaluate(() => 1); } catch { this.page = null; }
      }
      if (!this.page) {
        this.page = await browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
      }
      const page = this.page;

      const cookieList = Object.entries(this.cookies).map(([name, value]) => ({
        name, value, domain: '.veusserver.com', path: '/',
      }));
      if (cookieList.length > 0) await page.setCookie(...cookieList);

      const dadosCicUrl = this.dadosCicPosto.replace(/ /g, '%20');
      const initUrl = `${this.baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php?sessao_id=${this.sessionId}&dados_cic_posto_t=${dadosCicUrl}&totem=`;
      await page.goto(initUrl, { waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs });
      await page.waitForSelector('input[name="procura_por"]', { timeout: 5000 }).catch(() => {});

      // Switch to archive group
      this.logger.log(`[Cedill][CACHE] Switching to archive group "${group}"...`);
      await page.evaluate((g: string, sid: string) => {
        const form = (document as any).forms['corpo_conectado_posto'];
        if (!form) return;
        form.grupo.value = g;
        form.action = `corpo_conectado_posto_lamina.php?sessao_id=${sid}&troca_grupo=1`;
        form.target = '';
        form.method = 'POST';
        (window as any).__cfRLUnblockHandlers = true;
        form.submit();
      }, group, this.sessionId);
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs }).catch(() => {});
      await page.waitForSelector('input[name="procura_por"]', { timeout: 5000 }).catch(() => {});
      try {
        await page.waitForFunction(() => {
          const html = document.documentElement.innerHTML;
          return html.includes('aciona_evento(event,') || html.includes('Laudo(s)');
        }, { timeout: 8000 });
      } catch {}
      await new Promise(r => setTimeout(r, 200));

      return await this.loadGroupPages(page, group);
    } catch (error: any) {
      this.logger.error(`[Cedill][CACHE] fetchArchiveCandidates error: ${error.message}`);
      return [];
    }
  }

  async searchPatient(name: string, context?: any) {
    // Garantir que a pagina de busca foi carregada (inicializa sessao no servidor)
    await this.initSearchPage();

    // Mantemos compatibilidade: se o segundo parâmetro for string, tratamos como group
    const group = typeof context === 'string' ? context : (context?.pendingGroups?.[0] || '');
    const nameTrimmed = name.trim();

    // Extract exam year from appointment date (format: DD/MM/YYYY) for archive group search
    const appointmentDate = context?.appointmentDate || '';
    let examYear = new Date().getFullYear();
    if (appointmentDate) {
      const parts = appointmentDate.split('/');
      if (parts.length === 3) {
        const year = Number(parts[2]);
        if (Number.isFinite(year) && year > 2000) examYear = year;
      }
    }

    // Try cache: Principal first, then specific archive year
    if (this.useBrowser) {
      // 1. Principal cache
      if (this.principalCache === null) {
        this.principalCache = await this.fetchPrincipalCandidates();
      }
      const principalMatch = this.filterByName(this.principalCache, nameTrimmed);
      if (principalMatch.length > 0) {
        this.logger.log(`[Cedill][CACHE][PRINCIPAL] name="${name}" matched=${principalMatch.length}`);
        return principalMatch.slice(0, 3);
      }

      // 2. Archive cache for the specific exam year
      const archiveGroup = `ARQUIVO ${examYear}`;
      if (!this.archiveCache.has(examYear)) {
        const archiveRecords = await this.fetchArchiveCandidates(examYear);
        this.archiveCache.set(examYear, archiveRecords);
      }
      const archiveRecords = this.archiveCache.get(examYear) || [];
      const archiveMatch = this.filterByName(archiveRecords, nameTrimmed);

      this.logger.log(
        `[Cedill][CACHE] name="${name}" principal=${this.principalCache.length} archive[${examYear}]=${archiveRecords.length} matched=${archiveMatch.length}`,
      );
      if (archiveMatch.length > 0) return archiveMatch.slice(0, 3);

      // Not found in either cache
      this.logger.warn(`[Cedill][CACHE][NO_MATCH] name="${name}" not found in Principal (${this.principalCache.length}) or ARQUIVO ${examYear} (${archiveRecords.length})`);
      return [];
    }

    // Usar termo recebido — outer loop (searchPatientWithNameFallback) já fornece variantes bem construídas
    const searchVariants = [nameTrimmed];
    const searchField = 'NOME_PACIENTE';
    this.logger.log(
      `[Cedill][SEARCH][START] name="${name}" group="${group || 'NONE'}" hasSession=${Boolean(this.sessionId)}`,
    );

    // Usar Puppeteer para bypass do Cloudflare (POST retorna 403 via axios)
    if (this.useBrowser) {
      // Portal groups: '' (Principal/today), 'ARQUIVO', 'ARQUIVO 2021-2026', 'RESULTADOS PARCIAIS', 'LIXEIRA'
      // Search strategy: default (no group) → exam year archive (from DATAAGENDAMENTO)
      const searchGroups = ['', `ARQUIVO ${examYear}`];

      const browser = await this.launchBrowser();
      // Validate existing page is still usable — if closed/errored, create fresh
      if (this.page) {
        try { await this.page.evaluate(() => 1); } catch { this.page = null; }
      }
      if (!this.page) {
        this.page = await browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
      }
      const page = this.page;
      try {
        const cookieList = Object.entries(this.cookies).map(([name, value]) => ({
          name, value, domain: '.veusserver.com', path: '/',
        }));
        if (cookieList.length > 0) await page.setCookie(...cookieList);

        const dadosCicUrl = this.dadosCicPosto.replace(/ /g, '%20');
        const initUrl = `${this.baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php?sessao_id=${this.sessionId}&dados_cic_posto_t=${dadosCicUrl}&totem=`;
        this.logger.log(`[Cedill][BROWSER] Navigating to search page...`);
        await page.goto(initUrl, { waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs });
        await page.waitForSelector('input[name="procura_por"]', { timeout: 5000 }).catch(() => {});

        let currentGroup = '';

        for (const searchGroup of searchGroups) {
          // Switch group if needed
          if (searchGroup !== currentGroup) {
            if (searchGroup) {
              this.logger.log(`[Cedill][BROWSER] Switching to group "${searchGroup}"...`);
              await page.evaluate((grupo: string, sessaoId: string) => {
                const form = (document as any).forms['corpo_conectado_posto'];
                if (!form) return;
                form.grupo.value = grupo;
                form.action = `corpo_conectado_posto_lamina.php?sessao_id=${sessaoId}&troca_grupo=1`;
                form.target = '';
                form.method = 'POST';
                (window as any).__cfRLUnblockHandlers = true;
                form.submit();
              }, searchGroup, this.sessionId);
              await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs }).catch(() => {});
              await page.waitForSelector('input[name="procura_por"]', { timeout: 5000 }).catch(() => {});
              try {
                await page.waitForFunction(() => {
                  const html = document.documentElement.innerHTML;
                  return html.includes('aciona_evento(event,') || html.includes('Laudo(s)');
                }, { timeout: 8000 });
              } catch (_t) {}
              await new Promise(r => setTimeout(r, 200));

              const groupHtml = await page.content();
              const groupVetorMatches = groupHtml.match(/name=['"]vetor_laudo_t\[[\]]*['"][^>]*value=['"]([^'"]+)['"]/gi) || [];
              if (groupVetorMatches.length > 0) {
                this.defaultVetorLaudoT = [];
                for (const m of groupVetorMatches) {
                  const valMatch = m.match(/value=['"]([^'"]+)['"]/i);
                  if (valMatch) this.defaultVetorLaudoT.push(valMatch[1]);
                }
                this.logger.log(`[Cedill][BROWSER] Group "${searchGroup}" loaded: ${this.defaultVetorLaudoT.length} vetor_laudo_t entries`);
              }
              const curUrl = page.url();
              const sessaoMatch = curUrl.match(/sessao_id=([a-f0-9]+)/);
              if (sessaoMatch) this.sessionId = sessaoMatch[1];
              currentGroup = searchGroup;
            } else {
              // Re-navigate to default group (Principal) by reloading the search page
              this.logger.log(`[Cedill][BROWSER] Navigating back to Principal group...`);
              await page.goto(initUrl, { waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs });
              await page.waitForSelector('input[name="procura_por"]', { timeout: 5000 }).catch(() => {});
              try {
                await page.waitForFunction(() => {
                  const html = document.documentElement.innerHTML;
                  return html.includes('aciona_evento(event,') || html.includes('Laudo(s)');
                }, { timeout: 8000 });
              } catch (_t) {}
              await new Promise(r => setTimeout(r, 200));
              const defHtml = await page.content();
              const defVetorMatches = defHtml.match(/name=['"]vetor_laudo_t\[[\]]*['"][^>]*value=['"]([^'"]+)['"]/gi) || [];
              if (defVetorMatches.length > 0) {
                this.defaultVetorLaudoT = [];
                for (const m of defVetorMatches) {
                  const valMatch = m.match(/value=['"]([^'"]+)['"]/i);
                  if (valMatch) this.defaultVetorLaudoT.push(valMatch[1]);
                }
              }
              currentGroup = '';
            }
          }

          // Search each variant in the current group
          for (const searchName of searchVariants) {
            try {
              const navPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: this.requestTimeoutMs }).catch(() => {});

              await page.evaluate((searchTerm: string, field: string, grupo: string, vetorLaudoT: string[]) => {
                const form = (document as any).forms['corpo_conectado_posto'];
                if (!form) return;
                form.procura_por.value = searchTerm;
                if (grupo) form.grupo.value = grupo;
                const existingVetorInputs = form.querySelectorAll('input[name="vetor_laudo_t[]"]');
                existingVetorInputs.forEach((el: any) => el.remove());
                for (const val of vetorLaudoT) {
                  const input = document.createElement('input');
                  input.type = 'hidden';
                  input.name = 'vetor_laudo_t[]';
                  input.value = val;
                  form.appendChild(input);
                }
                (window as any).__cfRLUnblockHandlers = true;
              }, searchName, searchField, searchGroup, this.defaultVetorLaudoT);

              await page.click('button[title*="procurar"]').catch(async () => {
                await page.evaluate(() => {
                  const buttons = document.querySelectorAll('button');
                  for (const btn of buttons) {
                    if (btn.textContent?.trim() === 'OK') { btn.click(); break; }
                  }
                });
              });

              await navPromise;
              await page.waitForSelector('input[name="procura_por"]', { timeout: 5000 }).catch(() => {});
              try {
                await page.waitForFunction(() => {
                  const html = document.documentElement.innerHTML;
                  return html.includes('aciona_evento(event,') || html.includes('Nenhum resultado') || html.includes('Laudo(s)') || html.includes('Erro exectando');
                }, { timeout: 8000 });
              } catch (_t) {}

              const html = await page.content();
              const results = this.parseSearchResults(html);
              for (const r of results) r.grupo = searchGroup;

              const missingNames = results.filter(r => !r.name || r.name === '0').length;
              if (missingNames > 0) {
                this.logger.warn(
                  `[Cedill][SEARCH][NAME_MISSING] ${missingNames}/${results.length} results have no extracted name - will be rejected by filter`,
                );
              }

              const filteredResults = results.filter((row: { name?: string }) => {
                  const rowName = String(row.name || '').trim();
                  if (!rowName || rowName === '0') return false;
                  const matched = fuzzyMatchesByNameTokens(rowName, nameTrimmed);
                  if (!matched) {
                    this.logger.warn(
                      `[Cedill][SEARCH][FILTER_DEBUG] candidate="${rowName}" query="${nameTrimmed}" rejected by fuzzy match`,
                    );
                  }
                  return matched;
                });

              this.logger.log(
                `[Cedill][SEARCH][RESULT] name="${name}" variant="${searchName}" group="${searchGroup || 'Principal'}" results=${results.length} filtered=${filteredResults.length}`,
              );

              if (filteredResults.length > 0) {
                // Ordenar por data mais próxima do agendamento para evitar laudos antigos
                const rankedResults = context?.appointmentDate
                  ? rankCandidatesByClosestDate(filteredResults, context.appointmentDate, (r: any) => r.date)
                  : filteredResults;

                // Limit to top 3 candidates per variant to avoid downloading dozens of wrong reports
                const limitedResults = rankedResults.slice(0, 3);
                this.logger.log(
                  `[Cedill][SEARCH][LIMIT] variant="${searchName}" total=${filteredResults.length} downloading=${limitedResults.length}`,
                );
                for (const r of limitedResults) r.searchName = searchName;
                return limitedResults;
              }
            } catch (error) {
              this.logger.error(`[Cedill][SEARCH][BROWSER_ERROR] search="${searchName}" group="${searchGroup || 'Principal'}": ${error.message}`);
            }
          }
        }

        this.logger.warn(`[Cedill][SEARCH][NO_RESULT] name="${name}" reason=empty_result_across_groups`);
        return [];
      } catch (error) {
        this.logger.error(`[Cedill][BROWSER] Fatal search error: ${error.message}`);
        return [];
      }
    }

    // Fallback: axios POST (funciona apenas se Cloudflare nao bloquear)
    for (const searchName of searchVariants) {
      // Usar this.dadosCicPosto (consistente)
      const dadosCicPosto = this.dadosCicPosto;

      // Montar body conforme HAR — browser usa qs.stringify (espaços = '+')
      // POST não inclui procura_por/procura_em/grupo_procura (estão na URL final do HAR truncada)
      const formData = qs.stringify({
        dados_cic_posto_t: dadosCicPosto,
        nic: '',
        visita: '',
        crm: '',
        conselho: '',
        uf_conselho: '',
        data_atendimento: '',
        posto: '',
        asc_desc_ordem: 'DESC',
        campo_ordem: 'DATA_ATENDIMENTO',
        pagina: '1',
        grupo: '',
        laudos_grupo: '',
        por: searchName,
        em: searchField,
        procura_gr: '',
        procura: '1',
        seq_envio: '',
        ...(this.defaultVetorLaudoT.length > 0
          ? { vetor_laudo_t: this.defaultVetorLaudoT }
          : {}),
        procura_por: searchName,
        procura_em: searchField,
        grupo_procura: '',
      }, { format: 'RFC1738', arrayFormat: 'brackets' });

      // Montar URL conforme HAR: POST vai APENAS com sessao_id na URL
      const searchUrl = `${this.baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php`;
      const url = `${searchUrl}?sessao_id=${this.sessionId}`;
      // HAR POST: Referer inclui dados_cic_posto_t e totem= (mas a URL do POST nao inclui)
      const dadosCicUrl = dadosCicPosto.replace(/ /g, '%20');
      const referer = `${searchUrl}?sessao_id=${this.sessionId}&dados_cic_posto_t=${dadosCicUrl}&totem=`;

      // Log do payload para diagnóstico (primeira busca apenas)
      if (searchName === searchVariants[0]) {
        this.logger.warn(
          `[Cedill][SEARCH][PAYLOAD] name="${searchName}" payloadSize=${formData.length} payload="${formData.substring(0, 500)}"`,
        );
      }

      try {
        const response = await axios.post(url, formData, {
          headers: {
            'User-Agent': this.userAgent,
            Cookie: this.getCookieString(),
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': this.baseUrl,
            'Cache-Control': 'max-age=0',
            Referer: referer,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          timeout: this.requestTimeoutMs,
        });

        const html = String(response.data || '');
        const hasAcionaEvento = html.includes('aciona_evento');
        // Extrair snippet ao redor da primeira ocorrencia de aciona_evento
        const acionaIdx = html.indexOf('aciona_evento(event,');
        const acionaSnippet = acionaIdx > -1
          ? html.substring(acionaIdx, acionaIdx + 300)
          : 'NOT_FOUND';
        const acionaEventCount = (html.match(/aciona_evento\(event,/g) || []).length;
        this.logger.warn(
          `[Cedill][SEARCH][RESPONSE] name="${searchName}" responseSize=${html.length} acionaEventCount=${acionaEventCount} acionaSnippet="${acionaSnippet}"`,
        );

        const parsedResults = this.parseSearchResults(html);

        const filteredResults = parsedResults.filter((row: { name?: string }) => {
            const rowName = String(row.name || '').trim();
            if (!rowName || rowName === '0') return false;
            const matched = fuzzyMatchesByNameTokens(rowName, nameTrimmed);
            if (!matched) {
              this.logger.warn(
                `[Cedill][SEARCH][FILTER_DEBUG] candidate="${rowName}" query="${nameTrimmed}" rejected by fuzzy match`,
              );
            }
            return matched;
          });

        this.logger.log(
          `[Cedill][SEARCH][RESULT] name="${name}" group="${group || 'NONE'}" status=${response.status} results=${parsedResults.length} filtered=${filteredResults.length} localNameFilter=true`,
        );

        if (parsedResults.length > 0 && filteredResults.length === 0) {
          this.logger.warn(
            `[Cedill][SEARCH][FILTERED_OUT] name="${name}" group="${group || 'NONE'}" reason=name_mismatch`,
          );
        }

        if (filteredResults.length > 0) {
          // Adicionar searchName a cada resultado para uso no download
          for (const r of filteredResults) {
            r.searchName = searchName;
          }
          return filteredResults;
        }
      } catch (error) {
        // Capturar body e headers do 403 para diagnostico
        if (error?.response) {
          const body = String(error.response.data || '').substring(0, 2000);
          const respHeaders = JSON.stringify(error.response.headers || {});
          this.logger.error(`[Cedill] ${error.response.status} na busca por ${searchName}: body="${body}" respHeaders=${respHeaders}`);
        } else {
          this.logger.error(`[Cedill] Erro na busca por ${searchName}: ${error.message}`);
        }
      }
    }

    this.logger.warn(
      `[Cedill][SEARCH][NO_RESULT] name="${name}" group="${group || 'NONE'}" reason=empty_result`,
    );

    return [];
  }

  private parseSearchResults(html: string) {
    const results: any[] = [];
    const seenNics = new Set<string>();
    // Regex captura parâmetros do aciona_evento — tolera espaços extras no HTML
    // event, nic, visita, date, posto, crm, opt_hist_t, seq_envio, empty, stt_laudo_imagem
    const regex =
      /aciona_evento\(event,'([^']+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']+)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;
    let match;

    // Pre-extract patient names per row: map nic -> name from the HTML
    // Each <tr> contains the patient name in a "Nome Paciente" td
    const nicNameMap = new Map<string, string>();
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(html)) !== null) {
      const rowHtml = trMatch[1];
      // Find aciona_evento nic in this row
      const nicMatch = rowHtml.match(/aciona_evento\(event,'(\d+)'/);
      // Find patient name in this row — multiple fallback patterns
      let nameMatch = rowHtml.match(
        /<!--\s*Nome\s+Paciente\s*-->[\s\S]*?<a[^>]*>\s*([A-Z][^<]+?)\s*<\/a>/i,
      );
      // Fallback 1: name in td with class containing "nome" or "paciente"
      if (!nameMatch) {
        nameMatch = rowHtml.match(
          /<(?:td|span|div)[^>]*class=["'][^"']*(?:nome|paciente)[^"']*["'][^>]*>\s*(?:<a[^>]*>)?\s*([A-Z][^<]{2,}?)\s*(?:<\/a>)?\s*<\/(?:td|span|div)>/i,
        );
      }
      // Fallback 2: any link text that looks like a full uppercase name (2+ words)
      if (!nameMatch) {
        nameMatch = rowHtml.match(
          /<a[^>]*>\s*([A-Z]{2,}(?:\s+[A-Z]{2,}){1,5})\s*<\/a>/,
        );
      }
      if (nicMatch && nameMatch) {
        const name = nameMatch[1].trim();
        if (name && name.length > 1) {
          nicNameMap.set(nicMatch[1], name);
        }
      } else if (nicMatch && !nameMatch) {
        // Log first 500 chars of row HTML for diagnosis
        this.logger.warn(
          `[Cedill][PARSE] nic=${nicMatch[1]} name extraction failed. rowHtml="${rowHtml.substring(0, 500)}"`,
        );
      }
    }

    while ((match = regex.exec(html)) !== null) {
      const nic = match[1];
      // Dedup by nic — each exam appears multiple times (one per action button)
      if (seenNics.has(nic)) continue;
      seenNics.add(nic);

      const patientName = nicNameMap.get(nic);

      results.push({
        nic: match[1],
        visita: match[2],
        date: match[3],
        posto: match[4],
        crm: match[5],
        optHistT: match[6],
        seqEnvio: match[7],
        sttLaudoImagem: match[9],
        name: patientName,
        id: match[1],
        patientName: patientName,
        status: undefined,
        score: undefined,
      });
    }

    // Extrair vetor_laudo_t[] do HTML (hidden fields do form) — handles both single/double quotes
    const vetorRegex = /(?:NAME|name)=['"]vetor_laudo_t\[[\]]*['"][^>]*(?:value|VALUE)=['"]([^'"]+)['"]/g;
    const vetorLaudoT: string[] = [];
    const seenVetor = new Set<string>();
    while ((match = vetorRegex.exec(html)) !== null) {
      if (!seenVetor.has(match[1])) {
        seenVetor.add(match[1]);
        vetorLaudoT.push(match[1]);
      }
    }
    if (vetorLaudoT.length > 0) {
      // Anexar vetorLaudoT a TODOS os resultados (usado no download)
      for (const r of results) {
        r.vetorLaudoT = vetorLaudoT;
      }
    }

    return results;
  }

  async downloadReport(metadata: any): Promise<Buffer | null> {
    const { nic, visita, date, posto, crm, seqEnvio, optHistT, sttLaudoImagem, vetorLaudoT, searchName, grupo } = metadata;
    const seqEnvioVal = seqEnvio || '1';
    const optHistTVal = optHistT || '0';
    // Portal usa PDF quando stt_laudo_imagem==3, lamina caso contrário
    const isPdf = String(sttLaudoImagem) === '3';

    this.logger.log(
      `[Cedill][DOWNLOAD][START] nic=${nic} visita=${visita} date="${date}" posto="${posto}" crm=${seqEnvioVal} isPdf=${isPdf} vetorLaudoT=${vetorLaudoT?.length || 0}`,
    );

    // Usar Puppeteer para download (Cloudflare bloqueia axios POST)
    if (this.useBrowser) {
      return this.downloadWithBrowser(metadata, isPdf);
    }

    // Fallback: axios POST
    const endpoint = isPdf ? 'mostra_laudo_pdf' : 'mostra_laudo_lamina';
    const extraParam = isPdf ? '&volta=2' : '&opt=0';
    const pdfUrl = `${this.baseUrl}/veus_laudo/${endpoint}.php?sessao_id=${this.sessionId}&nic=${nic}&visita=${visita}&data_atendimento=${date}&posto=${posto}&crm=${seqEnvioVal}&opt_hist_t=${optHistTVal}&seq_envio=1${extraParam}`;

    try {
      // POST exato conforme HAR: qs.stringify (espaços = '+'), com vetor_laudo_t[]
      const formData = qs.stringify({
        dados_cic_posto_t: this.dadosCicPosto,
        nic,
        visita,
        crm: seqEnvioVal,
        conselho: '',
        uf_conselho: '',
        data_atendimento: date,
        posto,
        asc_desc_ordem: 'DESC',
        campo_ordem: 'DATA_ATENDIMENTO',
        pagina: '1',
        grupo: grupo || '',
        laudos_grupo: '',
        por: searchName || '',
        em: 'NOME_PACIENTE',
        procura_gr: '',
        procura: '2',
        seq_envio: '1',
        ...(vetorLaudoT && vetorLaudoT.length > 0
          ? { vetor_laudo_t: vetorLaudoT }
          : {}),
        procura_por: '',
        procura_em: 'NOME_PACIENTE',
        grupo_procura: '',
      }, { format: 'RFC1738', arrayFormat: 'brackets' });

      const dadosCicUrl = this.dadosCicPosto.replace(/ /g, '%20');
      const referer = `${this.baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php?sessao_id=${this.sessionId}&dados_cic_posto_t=${dadosCicUrl}&totem=`;

      const response = await axios.post(pdfUrl, formData, {
        headers: {
          'User-Agent': this.userAgent,
          Cookie: this.getCookieString(),
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: referer,
        },
        responseType: 'arraybuffer',
        timeout: this.requestTimeoutMs,
        validateStatus: (s) => s === 200,
      });

      const content = Buffer.from(response.data);
      if (content.slice(0, 4).toString() === '%PDF') {
        this.logger.log(
          `[Cedill][DOWNLOAD][SUCCESS] nic=${nic} bytes=${content.length} type=PDF`,
        );
        return content;
      }

      // Cedill lamina retorna HTML com o laudo (não PDF)
      const htmlContent = content.toString('utf-8');
      if (htmlContent.includes('Paciente') && (htmlContent.includes('Laudo') || htmlContent.includes('laudo'))) {
        this.logger.log(
          `[Cedill][DOWNLOAD][SUCCESS] nic=${nic} bytes=${content.length} type=HTML_LAMINA`,
        );
        return content;
      }

      this.logger.warn(
        `[Cedill][DOWNLOAD][NO_PDF] nic=${nic} reason=invalid_response`,
      );
    } catch (error) {
      this.logger.error(
        `[Cedill] Erro ao baixar laudo ${nic}: ${error.message}`,
      );
    }
    return null;
  }

  async cleanup(): Promise<void> {
    await this.closeBrowser();
  }
}

