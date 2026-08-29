import type { Frame } from "puppeteer";
import type { AsoProcessingMessage } from "../web/types";

const SEARCH_ENTRY_SELECTOR = "#buscaFuncionario_3";
const MEDICAL_RECORD_INPUT_SELECTOR = "#codigoProntuario";
const SEARCH_BUTTON_SELECTOR = "#botoes > table > tbody > tr > td:nth-child(2) > a";
const SEARCH_RESULT_SELECTORS = [
  "#fieldset-resultado-prontuario > table > tbody > tr > td:nth-child(1) > a",
  "#fieldset-resultado-prontuario table tbody tr td a",
  "#fieldset-resultado-prontuario table tr td a",
];
const SEARCH_TIMEOUT_MS = 15000;
const SEARCH_TRANSITION_DELAY_MS = 1500;
const SEARCH_RESULT_DELAY_MS = 2500;
const SEARCH_RETRY_DELAY_MS = 2500;
export const POST_SEARCH_RESULT_STABILIZATION_DELAY_MS = 4000;

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAnySelector(frame: Pick<Frame, "$">, selectors: string[], timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const handle = await frame.$(selector);
      if (handle) {
        return selector;
      }
    }

    await delay(250);
  }

  return null;
}

async function triggerSearch(frame: Frame): Promise<void> {
  const searchButton = await frame.waitForSelector(SEARCH_BUTTON_SELECTOR, {
    visible: true,
    timeout: SEARCH_TIMEOUT_MS,
  });

  await searchButton?.click().catch(() => null);
  await delay(500);

  const stillVisible = await frame.$(SEARCH_BUTTON_SELECTOR);
  if (stillVisible) {
    await frame.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement | null;
      element?.click();
    }, SEARCH_BUTTON_SELECTOR);
  }
}

export async function selectMedicalRecordSearchResult(frame: Frame): Promise<void> {
  let resultSelector = await waitForAnySelector(frame, SEARCH_RESULT_SELECTORS, SEARCH_TIMEOUT_MS);

  if (!resultSelector) {
    await delay(SEARCH_RETRY_DELAY_MS);
    await triggerSearch(frame);
    await delay(SEARCH_RESULT_DELAY_MS);
    resultSelector = await waitForAnySelector(frame, SEARCH_RESULT_SELECTORS, SEARCH_TIMEOUT_MS);
  }

  if (!resultSelector) {
    throw new Error(
      `Resultado do prontuario nao apareceu apos pesquisar a ficha no SOC. Sequencial: resultado nao encontrado dentro de ${SEARCH_TIMEOUT_MS}ms.`,
    );
  }

  const result = await frame.waitForSelector(resultSelector, {
    visible: true,
    timeout: SEARCH_TIMEOUT_MS,
  });

  await delay(POST_SEARCH_RESULT_STABILIZATION_DELAY_MS);
  await result?.click();
}

export async function searchCertificate(socframeSearch: Frame, certificate: AsoProcessingMessage) {
  let entrar = await socframeSearch.waitForSelector(SEARCH_ENTRY_SELECTOR, {
    visible: true,
    timeout: SEARCH_TIMEOUT_MS,
  });
  await entrar?.click();
  await delay(SEARCH_TRANSITION_DELAY_MS);

  entrar = await socframeSearch.waitForSelector(MEDICAL_RECORD_INPUT_SELECTOR, {
    visible: true,
    timeout: SEARCH_TIMEOUT_MS,
  });
  await entrar?.click({ clickCount: 3 });
  await entrar?.type(certificate.sequencial, { delay: 80 });
  await delay(SEARCH_TRANSITION_DELAY_MS);

  await triggerSearch(socframeSearch);
  await delay(SEARCH_RESULT_DELAY_MS);

  await selectMedicalRecordSearchResult(socframeSearch);
  await delay(SEARCH_RESULT_DELAY_MS);
}
