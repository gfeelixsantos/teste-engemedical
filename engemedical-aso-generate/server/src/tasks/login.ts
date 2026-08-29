import { Page } from "puppeteer";

const user = process.env.SOCLOGIN;
const password = process.env.SOCPASS;
const socid = Array.from(process.env.SOCID || "");

const LOGIN_SUCCESS_SELECTORS = ["#socframe", "#cod_programa"];
const LOGIN_PAGE_SELECTORS = ["#usu", "#senha", "#bt_entrar"];
const CAPTCHA_SELECTORS = [
  "iframe[src*='recaptcha']",
  "iframe[src*='captcha']",
  "iframe[title*='challenge']",
  "iframe[title*='desafio']",
  ".g-recaptcha",
  "#captcha",
  "[name='g-recaptcha-response']",
];
const SESSION_EXPIRED_SELECTORS = ["#btn_ok", "#modalalertas", "#modalalertasTitulo"];
const LOGIN_FIELD_DELAY_MS = 500;
const LOGIN_DIGIT_DELAY_MS = 700;
const LOGIN_SUBMIT_DELAY_MS = 1200;
const LOGIN_AUTOMATIC_TIMEOUT_MS = 15000;
const MANUAL_LOGIN_TIMEOUT_MS = Number(process.env.SOC_MANUAL_LOGIN_TIMEOUT_MS || 300000);
const LOGIN_POLL_INTERVAL_MS = 500;

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientPageError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /Execution context was destroyed|Cannot find context with specified id|Target closed|Session closed|Navigating frame was detached/i.test(
    error.message,
  );
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
      } catch (error) {
        if (page.isClosed()) {
          return null;
        }

        if (!isTransientPageError(error)) {
          console.warn(`[LOGIN] Falha ao verificar seletor ${selector}:`, error);
        }
      }
    }

    await delay(250);
  }

  return null;
}

async function clickIfExists(page: Page, selector: string): Promise<boolean> {
  const handle = await page.$(selector);
  if (!handle) {
    return false;
  }

  await handle.evaluate((element) => {
    (element as HTMLElement).click();
  });

  return true;
}

async function dismissAdminNotice(page: Page): Promise<void> {
  const notice = await page.waitForSelector("#avisoAdmAge", { timeout: 4000 }).catch(() => null);

  if (!notice) {
    console.log("Sem tela de aviso..");
    return;
  }

  const disableWarningClicked = await clickIfExists(page, "#naoMostrarAvisoAdministrador");
  const okClicked = await clickIfExists(page, "#botaoOk");

  console.log(
    `[LOGIN] Aviso administrativo detectado | naoMostrar=${disableWarningClicked} | ok=${okClicked}`,
  );
}

async function isSessionExpired(page: Page): Promise<boolean> {
  if (page.isClosed()) {
    return false;
  }

  if (page.url().includes("/nosession/")) {
    return true;
  }

  const expiredSelector = await waitForAnySelector(page, SESSION_EXPIRED_SELECTORS, 1000);
  if (!expiredSelector) {
    return false;
  }

  const bodyText = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
  return /expirada|inval/i.test(bodyText);
}

async function inspectLoginState(page: Page): Promise<{
  currentUrl: string;
  isAuthenticated: boolean;
  isLoginPage: boolean;
  hasCaptcha: boolean;
  isSessionExpired: boolean;
}> {
  if (page.isClosed()) {
    return {
      currentUrl: "",
      isAuthenticated: false,
      isLoginPage: false,
      hasCaptcha: false,
      isSessionExpired: false,
    };
  }

  const [authenticatedSelector, loginSelector, captchaSelector, sessionExpired] = await Promise.all([
    waitForAnySelector(page, LOGIN_SUCCESS_SELECTORS, 1000),
    waitForAnySelector(page, LOGIN_PAGE_SELECTORS, 1000),
    waitForAnySelector(page, CAPTCHA_SELECTORS, 1000),
    isSessionExpired(page),
  ]);

  return {
    currentUrl: page.url(),
    isAuthenticated: !!authenticatedSelector,
    isLoginPage: !!loginSelector,
    hasCaptcha: !!captchaSelector,
    isSessionExpired: sessionExpired,
  };
}

async function waitForAuthenticatedArea(
  page: Page,
  automaticTimeoutMs = LOGIN_AUTOMATIC_TIMEOUT_MS,
  manualTimeoutMs = MANUAL_LOGIN_TIMEOUT_MS,
): Promise<void> {
  const automaticDeadline = Date.now() + automaticTimeoutMs;
  const manualDeadline = automaticDeadline + manualTimeoutMs;
  let manualInterventionLogged = false;

  while (Date.now() < manualDeadline) {
    if (page.isClosed()) {
      throw new Error("Pagina de login do SOC foi fechada durante a autenticacao.");
    }

    const state = await inspectLoginState(page);

    if (state.isAuthenticated) {
      return;
    }

    if (state.isSessionExpired) {
      throw new Error(
        `Login encontrou uma sessao expirada do SOC. URL atual: ${state.currentUrl || "desconhecida"}`,
      );
    }

    if (!manualInterventionLogged && Date.now() >= automaticDeadline) {
      manualInterventionLogged = true;

      if (state.hasCaptcha || state.isLoginPage) {
        console.log(
          `[LOGIN] Tela de login/captcha ainda ativa. Aguardando resolucao manual por ate ${Math.floor(
            manualTimeoutMs / 1000,
          )}s...`,
        );
      }
    }

    await delay(LOGIN_POLL_INTERVAL_MS);
  }

  if (page.isClosed()) {
    throw new Error("Pagina de login do SOC foi fechada durante a autenticacao.");
  }

  const state = await inspectLoginState(page);
  throw new Error(
    `Login nao confirmou area autenticada do SOC. URL atual: ${state.currentUrl || "desconhecida"}`,
  );
}

export async function login(page: Page) {
  const loginField = await page.waitForSelector("#usu", { timeout: 10000 });
  await loginField?.type(`${user}`, { delay: 125 });
  await delay(LOGIN_FIELD_DELAY_MS);

  const passwordField = await page.waitForSelector("#senha", { timeout: 10000 });
  await passwordField?.type(`${password}`, { delay: 135 });
  await delay(LOGIN_FIELD_DELAY_MS);

  let enterButton = await page.waitForSelector(`[type=button][value="${socid[0]}"]`, { timeout: 521 });
  await enterButton?.focus();
  await enterButton?.click();
  await delay(LOGIN_DIGIT_DELAY_MS);

  enterButton = await page.waitForSelector(`[type=button][value="${socid[1]}"]`, { timeout: 493 });
  await enterButton?.focus();
  await enterButton?.click();
  await delay(LOGIN_DIGIT_DELAY_MS);

  enterButton = await page.waitForSelector(`[type=button][value="${socid[2]}"]`, { timeout: 567 });
  await enterButton?.focus();
  await enterButton?.click();
  await delay(LOGIN_DIGIT_DELAY_MS);

  enterButton = await page.waitForSelector(`[type=button][value="${socid[3]}"]`, { timeout: 431 });
  await enterButton?.focus();
  await enterButton?.click();
  await delay(LOGIN_SUBMIT_DELAY_MS);

  enterButton = await page.waitForSelector("#bt_entrar", { timeout: 2300 });
  await enterButton?.focus();
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: LOGIN_AUTOMATIC_TIMEOUT_MS }),
    enterButton?.click(),
  ]);

  await waitForAuthenticatedArea(page);
  await dismissAdminNotice(page);
  await waitForAuthenticatedArea(page, 10000, 0);
}
