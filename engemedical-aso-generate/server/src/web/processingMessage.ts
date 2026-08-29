import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import { socgedRegister } from "../soc/exports/socgedRegister";
import { WsResultadoExameAso } from "../soc/webservice/aso/WsResultadoExameAso";
import { savePdf, AsoPrintValidationError, closeWrongAsoPrintPage } from "../tasks/savePdf";
import { generateReportPdf } from "../tasks/reportGenerator";
import { login } from "../tasks/login";
import { searchCertificate } from "../tasks/searchCertificate";
import { asoGenerator } from "../tasks/asoGenerator";
import { AsoProcessingMessage } from "./types";
import path from "node:path";
import fs from "node:fs";
import { WsDownlaodArquivo } from "../soc/webservice/download/WsDownloadArquivo";
import { extractPdfFromZipBuffer, mergePdfFiles } from "../utils/util";
import { appLogs } from "../utils/appLogs";
import { generateDocumentName, generateReportDocumentName } from "../utils/fileNameGenerator";

const puppeteerNavegadorVisible = process.env.NAVEGADOR_INVISIBLE === "true";
const SOC_URL = "https://sistema.soc.com.br/";
const HEARTBEAT_INTERVAL = 10 * 60 * 1000;
const DEFAULT_SELECTOR_TIMEOUT = 10000;
const AUTHENTICATED_SELECTORS = ["#cod_programa", "#socframe"];
const LOGIN_PAGE_SELECTORS = ["#usu", "#senha", "#bt_entrar"];
const SESSION_EXPIRED_SELECTORS = ["#btn_ok", "#modalalertas", "#modalalertasTitulo"];
const SESSION_EXPIRED_TEXT_PATTERN = /sess[a?]o expirada|sequ[e?]ncia de opera[c?][o?]es inv[a?]lidas/i;
const BROWSER_PROFILE_DIR =
  process.env.PUPPETEER_USER_DATA_DIR?.trim() || path.join(process.cwd(), ".puppeteer-profile");
const MAX_ITEM_RECOVERY_ATTEMPTS = 4;
const SOC_TRANSITION_DELAY_MS = 1500;
const SOC_PROGRAM_SWITCH_DELAY_MS = 1800;
const SOC_FRAME_READY_DELAY_MS = 1500;
const TRANSIENT_PAGE_ERROR_PATTERN =
  /Execution context was destroyed|Cannot find context with specified id|Target closed|Session closed|Navigating frame was detached/i;

puppeteer.use(StealthPlugin());

type SessionState = "idle" | "launching" | "authenticating" | "ready" | "recovering" | "broken";

let globalBrowser: Browser | null = null;
let globalPage: Page | null = null;
let isSessionActive = false;
let lastActivityTime = Date.now();
let sessionState: SessionState = "idle";
let initializationPromise: Promise<{ browser: Browser; page: Page }> | null = null;

function setSessionStatus(status: SessionState) {
  sessionState = status;
  isSessionActive = status === "ready";
}

function attachSession(browser: Browser | null, page: Page | null, status: SessionState) {
  globalBrowser = browser;
  globalPage = page;
  setSessionStatus(status);
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientPageError(error: unknown): boolean {
  return error instanceof Error && TRANSIENT_PAGE_ERROR_PATTERN.test(error.message);
}

async function safeClosePage(page: Page | null | undefined): Promise<void> {
  if (!page || page.isClosed()) {
    return;
  }

  try {
    await page.close();
  } catch (err) {
    appLogs.error(err, "Erro ao fechar pagina");
  }
}

async function safeCloseBrowser(browser: Browser | null | undefined): Promise<void> {
  if (!browser) {
    return;
  }

  try {
    await browser.close();
  } catch (err) {
    appLogs.error(err, "Erro ao fechar browser");
  }
}

async function waitForAnySelector(page: Page, selectors: string[], timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      try {
        const handle = await page.$(selector);
        if (handle) {
          return selector;
        }
      } catch (err) {
        if (page.isClosed()) {
          return null;
        }

        if (!isTransientPageError(err)) {
          console.warn(`Falha ao verificar seletor ${selector}:`, err);
        }
      }
    }

    await delay(250);
  }

  return null;
}

async function clickTrocarEmpresaShortcut(page: Page, timeoutMs = 5000): Promise<boolean> {
  const selector = await waitForAnySelector(
    page,
    [
      '#barraIcones a[href*="Empresas()"]',
      'a[href*="Empresas()"]',
      '#barraIcones img[src*="/trocar.png"]',
      'img[src*="/trocar.png"]',
    ],
    timeoutMs,
  );

  if (!selector) {
    return false;
  }

  return await page.evaluate((matchedSelector) => {
    const matchedElement = document.querySelector(matchedSelector);
    const anchor =
      matchedElement instanceof HTMLAnchorElement
        ? matchedElement
        : matchedElement instanceof HTMLElement
          ? matchedElement.closest("a")
          : null;

    if (!(anchor instanceof HTMLElement)) {
      return false;
    }

    anchor.click();
    return true;
  }, selector);
}

async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);
  page.setDefaultTimeout(DEFAULT_SELECTOR_TIMEOUT);
  return page;
}

async function navigateToSoc(page: Page): Promise<void> {
  await page.goto(SOC_URL, { waitUntil: "domcontentloaded" });
  await page
    .evaluate(() => {
      window.location.hash = "";
    })
    .catch(() => null);
  await delay(SOC_TRANSITION_DELAY_MS);
}

async function waitForSocPageState(
  page: Page,
  timeoutMs: number,
): Promise<{
  isAuthenticated: boolean;
  isLoginPage: boolean;
  isSessionExpired: boolean;
  currentUrl: string;
}> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const markers = await getPageMarkers(page);
    if (markers.isAuthenticated || markers.isLoginPage || markers.isSessionExpired) {
      return markers;
    }

    await delay(300);
  }

  return await getPageMarkers(page);
}

async function getPageMarkers(page: Page): Promise<{
  isAuthenticated: boolean;
  isLoginPage: boolean;
  isSessionExpired: boolean;
  currentUrl: string;
}> {
  try {
    if (page.isClosed()) {
      return { isAuthenticated: false, isLoginPage: false, isSessionExpired: false, currentUrl: "" };
    }

    const currentUrl = page.url();
    const authenticatedSelector = await waitForAnySelector(page, AUTHENTICATED_SELECTORS, 1000);

    if (authenticatedSelector) {
      return {
        isAuthenticated: true,
        isLoginPage: false,
        isSessionExpired: false,
        currentUrl,
      };
    }

    const sessionExpiredSelector = await waitForAnySelector(page, SESSION_EXPIRED_SELECTORS, 1000);
    const title = await page.title().catch(() => "");
    const bodyText = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
    const isSessionExpired =
      currentUrl.includes("/nosession/") ||
      (!!sessionExpiredSelector && SESSION_EXPIRED_TEXT_PATTERN.test(`${title}\n${bodyText}`));

    if (isSessionExpired) {
      return {
        isAuthenticated: false,
        isLoginPage: false,
        isSessionExpired: true,
        currentUrl,
      };
    }

    const loginSelector = await waitForAnySelector(page, LOGIN_PAGE_SELECTORS, 1000);

    return {
      isAuthenticated: false,
      isLoginPage: !!loginSelector,
      isSessionExpired: false,
      currentUrl,
    };
  } catch (err) {
    appLogs.error(err, "Erro ao inspecionar pagina do SOC");
    return { isAuthenticated: false, isLoginPage: false, isSessionExpired: false, currentUrl: "" };
  }
}
async function ensureAuthenticatedPage(page: Page): Promise<void> {
  let currentMarkers = await getPageMarkers(page);
  if (currentMarkers.isAuthenticated) {
    return;
  }

  setSessionStatus("authenticating");

  if (currentMarkers.isSessionExpired) {
    throw new Error(
      `Sessao do SOC expirada. E necessario reiniciar completamente o browser. URL atual: ${currentMarkers.currentUrl || "desconhecida"}`,
    );
  }

  if (!currentMarkers.isLoginPage) {
    await navigateToSoc(page);
  }

  let loginScreenMarkers = await waitForSocPageState(page, 15000);
  if (loginScreenMarkers.isSessionExpired) {
    throw new Error(
      `Sessao do SOC expirada durante a autenticacao. E necessario reiniciar completamente o browser. URL atual: ${loginScreenMarkers.currentUrl || "desconhecida"}`,
    );
  }

  if (!loginScreenMarkers.isLoginPage && !loginScreenMarkers.isAuthenticated) {
    await delay(2000);
    loginScreenMarkers = await waitForSocPageState(page, 10000);
  }

  if (loginScreenMarkers.isAuthenticated) {
    return;
  }

  if (!loginScreenMarkers.isLoginPage) {
    throw new Error(
      `Nao foi possivel obter a tela de login do SOC. URL atual: ${loginScreenMarkers.currentUrl || "desconhecida"}`,
    );
  }

  await login(page);

  const finalMarkers = await getPageMarkers(page);
  if (!finalMarkers.isAuthenticated) {
    throw new Error(
      `Login executado, mas a sessao nao ficou autenticada. URL atual: ${finalMarkers.currentUrl || "desconhecida"}`,
    );
  }
}

async function getOrCreatePage(browser: Browser): Promise<Page> {
  if (globalPage && !globalPage.isClosed()) {
    return globalPage;
  }

  const pages = await browser.pages();
  const firstUsablePage = pages.find((page) => !page.isClosed());

  if (firstUsablePage) {
    firstUsablePage.setDefaultNavigationTimeout(0);
    firstUsablePage.setDefaultTimeout(DEFAULT_SELECTOR_TIMEOUT);
    return firstUsablePage;
  }

  return await createPage(browser);
}

async function recoverSessionInCurrentBrowser(browser: Browser): Promise<{ browser: Browser; page: Page }> {
  setSessionStatus("recovering");

  const currentPage = await getOrCreatePage(browser);
  attachSession(browser, currentPage, "recovering");

  try {
    await ensureAuthenticatedPage(currentPage);
    attachSession(browser, currentPage, "ready");
    return { browser, page: currentPage };
  } catch (currentPageError) {
    appLogs.warn(`Falha ao recuperar pagina atual do SOC, tentando nova pagina na mesma instancia... ${currentPageError}`);

    let replacementPage: Page | null = null;
    try {
      if (!browser.connected) {
        throw (currentPageError instanceof Error ? currentPageError : new Error(String(currentPageError)));
      }

      replacementPage = await createPage(browser);
      attachSession(browser, replacementPage, "recovering");
      await ensureAuthenticatedPage(replacementPage);
      attachSession(browser, replacementPage, "ready");

      if (replacementPage !== currentPage) {
        await safeClosePage(currentPage);
      }

      return { browser, page: replacementPage };
    } catch (newPageError) {
      if (replacementPage && replacementPage !== currentPage) {
        await safeClosePage(replacementPage);
      }

      attachSession(browser, currentPage.isClosed() ? null : currentPage, "broken");
      throw (newPageError instanceof Error ? newPageError : new Error(String(newPageError)));
    }
  }
}

async function initializeBrowser(forceRecovery = false): Promise<{ browser: Browser; page: Page }> {
  if (globalBrowser && globalPage && isSessionActive && sessionState === "ready" && !forceRecovery) {
    const isHealthy = await checkSessionHealth(globalBrowser, globalPage);

    if (isHealthy) {
      appLogs.info("Reusando instancia existente do browser");
      return { browser: globalBrowser, page: globalPage };
    }

    appLogs.warn("Instancia marcada como ready, mas a sessao do SOC nao esta autenticada. Forcando recuperacao...");
  }

  if (initializationPromise) {
    appLogs.info("Aguardando inicializacao/recuperacao de sessao em andamento...");
    return await initializationPromise;
  }

  initializationPromise = (async () => {
    let browser = globalBrowser;

    if (forceRecovery && (globalBrowser || globalPage)) {
      appLogs.warn("Forcando reinicializacao completa do browser para recuperar sessao do SOC...");
      await closeBrowserInstance();
      browser = null;
    }

    if (browser && browser.connected) {
      appLogs.info("Recuperando sessao na instancia atual do browser...");
      return await recoverSessionInCurrentBrowser(browser);
    }

    appLogs.info("Inicializando nova instancia do browser...");
    setSessionStatus("launching");

    browser = await puppeteer.launch({
      headless: puppeteerNavegadorVisible,
      userDataDir: BROWSER_PROFILE_DIR,
      args: [
        "--disable-notifications",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-features=site-per-process",
        "--no-zygote",
      ],
    });

    attachSession(browser, null, "launching");

    try {
      const session = await recoverSessionInCurrentBrowser(browser);
      appLogs.info("Browser inicializado e login realizado");
      return session;
    } catch (err) {
      appLogs.error(err, "Falha durante bootstrap da sessao do browser");
      attachSession(browser, globalPage && !globalPage.isClosed() ? globalPage : null, "broken");
      throw (err instanceof Error ? err : new Error(String(err)));
    }
  })().finally(() => {
    initializationPromise = null;
  });

  return await initializationPromise;
}

export async function closeBrowserInstance(): Promise<void> {
  appLogs.info("Encerrando instancia do browser...");

  await safeClosePage(globalPage);
  await safeCloseBrowser(globalBrowser);

  globalBrowser = null;
  globalPage = null;
  initializationPromise = null;
  setSessionStatus("idle");

  appLogs.info("Instancia encerrada com sucesso");
}

async function checkSessionHealth(browser: Browser, page: Page): Promise<boolean> {
  try {
    if (!browser.connected || page.isClosed()) {
      return false;
    }

    const markers = await getPageMarkers(page);
    return markers.isAuthenticated;
  } catch (err) {
    appLogs.error(err, "Session invalid");
    return false;
  }
}

async function ensureSessionActive(browser: Browser, page: Page): Promise<{ browser: Browser; page: Page }> {
  const isHealthy = await checkSessionHealth(browser, page);

  if (!isHealthy) {
    appLogs.warn("Session lost, attempting recovery...");
    return await initializeBrowser(true);
  }

  return { browser, page };
}

async function refreshSession(page: Page) {
  appLogs.debug("Heartbeat: refreshing session to avoid timeout...");

  try {
    const clickedTrocarEmpresa = await clickTrocarEmpresaShortcut(page, 5000);

    if (clickedTrocarEmpresa) {
      appLogs.debug("Heartbeat: session refreshed via shortcut Trocar Empresa");
      return;
    }

    appLogs.debug("Atalho Trocar Empresa nao encontrado para heartbeat, tentando #cod_programa...");

    const input = await page.$("#cod_programa");
    if (input) {
      await input.focus();
      await page.keyboard.press("Enter");
      appLogs.debug("Heartbeat: session refreshed via #cod_programa");
      return;
    }

    appLogs.debug("Heartbeat sem seletor disponivel, realizando reload para manter sessao ativa...");
    await page.reload({ waitUntil: "domcontentloaded" });
  } catch (err) {
    appLogs.error(err, "Erro ao executar heartbeat");
  } finally {
    lastActivityTime = Date.now();
  }
}

function isRecoverableSocError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /sess[a?]o|login|autenticad|n[o?]o foi poss[i?]vel obter a tela de login/i.test(error.message);
}

async function processSingleItem(browser: Browser, page: Page, item: AsoProcessingMessage): Promise<void> {
  const documentName = generateDocumentName(item);
  const reportDocumentName = generateReportDocumentName(item);
  const termName = `TERMO_${item.nomeFuncionario}`;
  const pathSave = path.join(process.cwd(), "temp", `${termName}.zip`);
  const tempDir = path.join(process.cwd(), "temp");
  const documentPath = path.join(tempDir, documentName);
  const reportPath = path.join(tempDir, reportDocumentName);
  const extraPdfPaths: string[] = [];
  let extractedTermPath: string | null = null;

  ({ browser, page } = await ensureSessionActive(browser, page));

  const markers = await getPageMarkers(page);
  if (!markers.isAuthenticated) {
    throw new Error(
      `Sessao do SOC nao autenticada antes de acessar o menu. URL atual: ${markers.currentUrl || "desconhecida"}`,
    );
  }

  await WsResultadoExameAso(item);

  const input = await page.waitForSelector("#cod_programa");
  const currentValue = await page.$eval("#cod_programa", (el) => (el as HTMLInputElement).value);

  await input?.focus();
  await input?.click();
  await delay(SOC_TRANSITION_DELAY_MS);

  lastActivityTime = Date.now();

  if (currentValue === "088") {
    await page.keyboard.press("Enter");
  } else {
    await page.keyboard.type("088", { delay: 120 });
    await delay(600);
    await page.keyboard.press("Enter");
  }

  await delay(SOC_PROGRAM_SWITCH_DELAY_MS);

  await page.waitForSelector("#socframe", { timeout: 20000 });
  const socframe = await page.$("#socframe");
  const socframeSearch = await socframe?.contentFrame();
  await socframeSearch?.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
  await delay(SOC_FRAME_READY_DELAY_MS);

  if (!socframeSearch) {
    throw new Error("Frame do SOC nao foi carregado para o programa 088.");
  }

  await searchCertificate(socframeSearch, item);
  await asoGenerator(page, item);
  await savePdf(browser, documentName, item);

  try {
    await generateReportPdf(browser, item);
    extraPdfPaths.push(reportPath);
    appLogs.info(`Relatorio de atendimento gerado: ${reportDocumentName}`);
  } catch (err) {
    appLogs.warn(`Falha ao gerar relatorio de atendimento para ${item.schedulingId}: ${err}`);
  }

  const termGedCode = await socgedRegister(item);
  appLogs.debug(`Resultado termo: ${termGedCode}`);

  if (termGedCode) {
    try {
      item.socgedCode = termGedCode;

      const zipBuffer = await WsDownlaodArquivo(item, pathSave);

      if (!zipBuffer) {
        appLogs.warn("ArrayBuffer do termo nao gerado...");
        return;
      }

      const tempDir = path.join(process.cwd(), "temp");
      const termPath = path.join(tempDir, "termos");

      await fs.promises.mkdir(termPath, { recursive: true });

      extractedTermPath = await extractPdfFromZipBuffer(zipBuffer, termPath);
      extraPdfPaths.push(extractedTermPath);
    } catch (err) {
      appLogs.error(err, "Erro ao realizar merge");
    }
  }

  if (extraPdfPaths.length > 0) {
    try {
      await mergePdfFiles([documentPath, ...extraPdfPaths], documentPath);
    } catch (err) {
      appLogs.error(err, "Erro ao consolidar PDF final");
    }
  }

  if (extractedTermPath && fs.existsSync(extractedTermPath)) {
    fs.unlinkSync(extractedTermPath);
  }

  if (fs.existsSync(reportPath)) {
    fs.unlinkSync(reportPath);
  }

  if (fs.existsSync(pathSave)) {
    fs.unlinkSync(pathSave);
  }

  appLogs.info(`Certificado processado: ${item.sequencial}`);
}

export async function checkHeartbeat() {
  if (!globalBrowser || !globalPage || !isSessionActive || sessionState !== "ready") {
    return;
  }

  const inactivityTime = Date.now() - lastActivityTime;
  if (inactivityTime > HEARTBEAT_INTERVAL) {
    appLogs.info(`Inatividade detectada: ${Math.floor(inactivityTime / 60000)} min`);
    await refreshSession(globalPage);
  }
}

export async function processingMessage(pendentes: AsoProcessingMessage[], keepAlive = true) {
  let browser: Browser | null = null;
  let page: Page | null = null;
  let hasItemFailure = false;
  let lastItemError: Error | null = null;

  try {
    const session = await initializeBrowser();
    browser = session.browser;
    page = session.page;

    for (const item of pendentes) {
      let itemProcessed = false;

      for (let attempt = 1; attempt <= MAX_ITEM_RECOVERY_ATTEMPTS; attempt++) {
        try {
          await processSingleItem(browser!, page!, item);
          itemProcessed = true;
          break;
        } catch (err) {
          const currentPage = page;
          const markers = currentPage ? await getPageMarkers(currentPage).catch(() => null) : null;
          const isPrintValidationError = err instanceof AsoPrintValidationError;

          const shouldRecover =
            attempt < MAX_ITEM_RECOVERY_ATTEMPTS &&
            (!!markers?.isSessionExpired || !markers?.isAuthenticated || isRecoverableSocError(err));

          const shouldRetryAfterWrongDoc =
            isPrintValidationError && attempt < MAX_ITEM_RECOVERY_ATTEMPTS;

          appLogs.error(err, `Erro interno do item (tentativa ${attempt}/${MAX_ITEM_RECOVERY_ATTEMPTS})`);

          if (shouldRetryAfterWrongDoc) {
            appLogs.warn(
              `Item ${item.sequencial}: pagina de impressao invalida detectada. Fechando abas erradas e tentando gerar ASO novamente...`,
            );
            const closed = await closeWrongAsoPrintPage(browser!, item);
            appLogs.info(`Fechadas ${closed} aba(s) invalida(s). Retomando sessao SOC para retry ${attempt + 1}/${MAX_ITEM_RECOVERY_ATTEMPTS}.`);
            await delay(SOC_TRANSITION_DELAY_MS);
            continue;
          }

          if (shouldRecover) {
            appLogs.warn(`Tentando recuperar sessao do SOC e reprocessar item ${item.sequencial}...`);
            const recoveredSession = await initializeBrowser();
            browser = recoveredSession.browser;
            page = recoveredSession.page;
            continue;
          }

          appLogs.registerLog(err);
          hasItemFailure = true;
          lastItemError = err instanceof Error ? err : new Error(String(err));
          break;
        }
      }

      if (!itemProcessed) {
        continue;
      }
    }

    if (hasItemFailure) {
      throw new Error(
        `Falha ao processar um ou mais itens do lote ASO: ${lastItemError?.message || "erro desconhecido"}`,
      );
    }

    appLogs.info("Processamento concluido!");
  } catch (err) {
    appLogs.error(err, "Erro geral no Puppeteer");
    appLogs.registerLog(err);
    throw (err instanceof Error ? err : new Error(String(err)));
  } finally {
    const shouldCloseBrokenSession = sessionState !== "ready";
    const finalSessionState = sessionState;

    if (!keepAlive || shouldCloseBrokenSession) {
      if (keepAlive && shouldCloseBrokenSession) {
        appLogs.warn(
          `Sessao finalizou em estado ${finalSessionState}. Encerrando instancia para evitar reutilizacao quebrada...`,
        );
      }

      await closeBrowserInstance();
      appLogs.info(`Instancia encerrada (${!keepAlive ? "keepAlive=false" : `estado=${finalSessionState}`})`);
    } else {
      appLogs.info(`Instancia mantida ativa (keepAlive=true) | estado=${sessionState}`);
      appLogs.debug("Para fechar manualmente, chame: closeBrowserInstance()");
    }
  }
}

export async function processBatch(
  pendentes: any[],
  options?: {
    keepAlive?: boolean;
    forceNewSession?: boolean;
  },
) {
  const { keepAlive = true, forceNewSession = false } = options || {};

  if (forceNewSession) {
    await closeBrowserInstance();
    appLogs.info("Forcando nova sessao...");
  }

  await processingMessage(pendentes, keepAlive);
}



