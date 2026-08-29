import type { Browser, PDFOptions, Page } from "puppeteer";
import path from "node:path";
import fs from "node:fs/promises";
import { appLogs } from "../utils/appLogs";
import type { AsoProcessingMessage } from "../web/types";

export class AsoPrintValidationError extends Error {
  readonly diagnostic: unknown;

  constructor(message: string, diagnostic: unknown) {
    super(message);
    this.name = "AsoPrintValidationError";
    this.diagnostic = diagnostic;
  }
}

const DEFAULT_PDF_OPTIONS: PDFOptions = {
  format: "A4",
  printBackground: true,
  margin: {
    top: "12mm",
    right: "12mm",
    bottom: "12mm",
    left: "12mm",
  },
};

type AsoPrintPageSnapshot = {
  url: string;
  title: string;
  html: string;
  text: string;
};

export type AsoPrintCandidateScore = {
  score: number;
  matchedMarkers: string[];
  rejectedMarkers: string[];
  requiredMarkers: string[];
  blockedMarkers: string[];
  isValid: boolean;
};

type AsoPrintValidationContext = Pick<
  AsoProcessingMessage,
  "nomeFuncionario" | "nomeEmpresa" | "tipoExameNome" | "sequencial" | "codFuncionario"
>;

type AsoPrintCandidate = {
  page: Page;
  snapshot: AsoPrintPageSnapshot;
  score: AsoPrintCandidateScore;
};

function getTempDir() {
  return path.join(process.cwd(), "temp");
}

async function ensureTempDir() {
  const tempDir = getTempDir();
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

function normalizeForMatch(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesNormalized(haystack: string, needle: string | null | undefined) {
  const normalizedNeedle = normalizeForMatch(needle);
  if (!normalizedNeedle) {
    return false;
  }

  return normalizeForMatch(haystack).includes(normalizedNeedle);
}

export function scoreAsoPrintCandidate(
  snapshot: AsoPrintPageSnapshot,
  item: AsoPrintValidationContext,
): AsoPrintCandidateScore {
  const combinedText = `${snapshot.title}\n${snapshot.text}\n${snapshot.html}`;
  const matchedMarkers: string[] = [];
  const rejectedMarkers: string[] = [];
  const requiredMarkers: string[] = [];
  const blockedMarkers: string[] = [];
  let score = 0;

  const structuralMarkers = [
    { marker: "codigoSequencialFichaBiometria", weight: 3 },
    { marker: "codigoFuncionarioBiometria", weight: 2 },
    { marker: "botaoGerarPdf", weight: 2 },
  ];

  for (const { marker, weight } of structuralMarkers) {
    if (snapshot.html.includes(marker)) {
      matchedMarkers.push(`html:${marker}`);
      score += weight;
    }
  }

  const requiredAsoMarkers = [
    { label: "titulo-aso", value: "ASO - ATESTADO DE SAUDE OCUPACIONAL", weight: 5 },
    { label: "atestado-saude-ocupacional", value: "ATESTADO DE SAUDE OCUPACIONAL", weight: 5 },
  ];

  for (const { label, value, weight } of requiredAsoMarkers) {
    if (includesNormalized(combinedText, value)) {
      requiredMarkers.push(`text:${label}`);
      matchedMarkers.push(`text:${label}`);
      score += weight;
    }
  }

  const expectedTextMarkers = [
    { label: "avaliacao-clinica", value: "AVALIACAO CLINICA OCUPACIONAL", weight: 4 },
    { label: "anamnese-exame-fisico", value: "ANAMNESE E EXAME FISICO", weight: 3 },
    { label: "funcionario", value: item.nomeFuncionario, weight: 4 },
    { label: "empresa", value: item.nomeEmpresa, weight: 3 },
    { label: "tipo-exame", value: item.tipoExameNome, weight: 2 },
    { label: "sequencial", value: item.sequencial, weight: 1 },
    { label: "codigo-funcionario", value: item.codFuncionario, weight: 1 },
  ];

  for (const { label, value, weight } of expectedTextMarkers) {
    if (includesNormalized(combinedText, value)) {
      matchedMarkers.push(`text:${label}`);
      score += weight;
    }
  }

  const suspiciousMarkers = [
    { label: "beta-banner", value: "TESTAR VERSAO BETA", penalty: 4 },
    { label: "incluido-por", value: "INCLUIDO POR", penalty: 3 },
    { label: "data-criacao", value: "DATA CRIACAO", penalty: 2 },
    { label: "alterado-por", value: "ALTERADO POR", penalty: 2 },
    { label: "ultima-alteracao", value: "DT.ULT.ALTERACAO", penalty: 2 },
  ];

  for (const { label, value, penalty } of suspiciousMarkers) {
    if (includesNormalized(combinedText, value)) {
      rejectedMarkers.push(`text:${label}`);
      score -= penalty;
    }
  }

  const blockedReportMarkers = [
    { label: "ficha-clinica", value: "FICHA CLINICA", penalty: 12 },
    { label: "rel009br", value: "rel009br.jsp", penalty: 12 },
  ];

  for (const { label, value, penalty } of blockedReportMarkers) {
    if (includesNormalized(combinedText, value)) {
      blockedMarkers.push(`text:${label}`);
      rejectedMarkers.push(`text:${label}`);
      score -= penalty;
    }
  }

  const isValid = requiredMarkers.length > 0 && blockedMarkers.length === 0;

  return {
    score,
    matchedMarkers,
    rejectedMarkers,
    requiredMarkers,
    blockedMarkers,
    isValid,
  };
}

async function takeAsoPrintSnapshot(page: Page): Promise<AsoPrintPageSnapshot> {
  const [title, html, text] = await Promise.all([
    page.title().catch(() => ""),
    page.content().catch(() => ""),
    page.evaluate(() => document.body?.innerText || "").catch(() => ""),
  ]);

  return {
    url: page.url(),
    title,
    html,
    text,
  };
}

async function findBestAsoPrintPage(
  browser: Browser,
  item: AsoPrintValidationContext,
  options: {
    timeoutMs?: number;
    minScore?: number;
  } = {},
) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const minScore = options.minScore ?? 10;
  const startedAt = Date.now();
  let bestCandidate: AsoPrintCandidate | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    const pages = await browser.pages();

    for (const page of pages) {
      const snapshot = await takeAsoPrintSnapshot(page);
      const score = scoreAsoPrintCandidate(snapshot, item);

      if (!bestCandidate || score.score > bestCandidate.score.score) {
        bestCandidate = { page, snapshot, score };
      }
    }

    if (bestCandidate && bestCandidate.score.score >= minScore && bestCandidate.score.isValid) {
      return bestCandidate;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!bestCandidate) {
    throw new Error("Nenhuma pagina do browser estava disponivel para validar a impressao do ASO.");
  }

  const resolvedCandidate: AsoPrintCandidate = bestCandidate;
  const diagnostic = {
    score: resolvedCandidate.score.score,
    isValid: resolvedCandidate.score.isValid,
    url: resolvedCandidate.snapshot.url,
    title: resolvedCandidate.snapshot.title,
    matched: resolvedCandidate.score.matchedMarkers,
    rejected: resolvedCandidate.score.rejectedMarkers,
    required: resolvedCandidate.score.requiredMarkers,
    blocked: resolvedCandidate.score.blockedMarkers,
  };

  throw new AsoPrintValidationError(
    `Nao foi possivel validar a pagina de impressao do ASO antes do upload. Diagnostico: ${JSON.stringify(diagnostic)}`,
    diagnostic,
  );
}

export async function closeWrongAsoPrintPage(
  browser: Browser,
  item: AsoPrintValidationContext,
): Promise<number> {
  const pages = await browser.pages();
  let closedCount = 0;

  for (const page of pages) {
    if (page.isClosed()) {
      continue;
    }

    const snapshot = await takeAsoPrintSnapshot(page).catch(() => null);
    if (!snapshot) {
      continue;
    }

    const score = scoreAsoPrintCandidate(snapshot, item);
    if (!score.isValid) {
      appLogs.info(
        `Fechando aba invalida para ASO (score ${score.score}, isValid=${score.isValid}): ${snapshot.title}`,
      );
      await page.close().catch(() => null);
      closedCount++;
    }
  }

  return closedCount;
}

export async function savePdfFromPage(
  page: Page,
  documentName: string,
  options: PDFOptions = {},
) {
  const tempDir = await ensureTempDir();

  await page.waitForSelector("body", { visible: true });
  await new Promise(resolve => setTimeout(resolve, 5000));

  const outputPath = path.join(tempDir, documentName);
  await page.pdf({
    ...DEFAULT_PDF_OPTIONS,
    ...options,
    path: outputPath,
  });

  appLogs.info(`PDF salvo: ${documentName}`);
  return outputPath;
}

export async function savePdf(
  browser: Browser,
  documentName: string,
  item: AsoPrintValidationContext,
) {
  const pages = await browser.pages();
  appLogs.debug(`savePdf encontrou ${pages.length} paginas abertas antes da selecao.`);

  const candidate = await findBestAsoPrintPage(browser, item);
  const printTab = candidate.page;

  appLogs.info(
    `Pagina de impressao do ASO validada com score ${candidate.score.score}: ${candidate.snapshot.title || printTab.url()}`,
  );
  appLogs.debug(
    `Marcadores encontrados: ${candidate.score.matchedMarkers.join(", ") || "nenhum"} | rejeicoes: ${candidate.score.rejectedMarkers.join(", ") || "nenhuma"}`,
  );

  const outputPath = await savePdfFromPage(printTab, documentName);

  const currentPages = await browser.pages();
  if (currentPages.length > 1) {
    appLogs.debug(`Fechando aba de impressao: ${printTab.url()}`);
    await printTab.close().catch(() => null);
  }

  return outputPath;
}

export async function savePdfFromHtml(
  browser: Browser,
  html: string,
  documentName: string,
  options: {
    baseUrl?: string;
    pdfOptions?: PDFOptions;
  } = {},
) {
  const page = await browser.newPage();

  try {
    if (options.baseUrl) {
      await page.goto(options.baseUrl, { waitUntil: "domcontentloaded" });
    }

    await page.setContent(html, { waitUntil: "networkidle0" });
    return await savePdfFromPage(page, documentName, options.pdfOptions);
  } finally {
    await page.close();
  }
}
