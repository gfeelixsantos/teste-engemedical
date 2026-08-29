import { fetchExames, type IExame } from '@/lib/exames/services/exames.service';
import { FALLBACK_EXAMES_GROUPED } from './fallback-exames';

export type ExamsCatalogGrouped = Record<string, ExamToogle[]>;

export type ExamToogle = {
  codigos: string[];
  nome: string;
};

const CACHE_TTL_MS = 60_000;
const SESSION_KEY = 'exames_catalog_cache';

let cachedCatalog: ExamsCatalogGrouped | null = null;
let cachedAt: number | null = null;
let inFlightPromise: Promise<ExamsCatalogGrouped> | null = null;

function toGrouped(exames: IExame[]): ExamsCatalogGrouped {
  const grouped: ExamsCatalogGrouped = {};
  for (const exame of exames) {
    if (!grouped[exame.grupo]) grouped[exame.grupo] = [];
    grouped[exame.grupo].push({
      codigos: exame.codigos,
      nome: exame.nome,
    });
  }
  return grouped;
}

function isValidExamsArray(data: unknown): data is IExame[] {
  return Array.isArray(data) && data.length > 0;
}

function saveToSession(data: ExamsCatalogGrouped): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded - ignorar */
  }
}

function loadFromSession(): ExamsCatalogGrouped | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchFromApi(): Promise<ExamsCatalogGrouped> {
  const exames = await fetchExames();
  if (!isValidExamsArray(exames)) {
    throw new Error('Lista de exames vazia ou invalida');
  }
  return toGrouped(exames);
}

async function doFetch(): Promise<ExamsCatalogGrouped> {
  try {
    const grouped = await fetchFromApi();
    cachedCatalog = grouped;
    cachedAt = Date.now();
    saveToSession(grouped);
    return grouped;
  } catch {
    if (cachedCatalog) return cachedCatalog;
    const fromSession = loadFromSession();
    if (fromSession) {
      cachedCatalog = fromSession;
      cachedAt = Date.now();
      return fromSession;
    }
    cachedCatalog = FALLBACK_EXAMES_GROUPED;
    cachedAt = Date.now();
    return FALLBACK_EXAMES_GROUPED;
  }
}

export async function getExamsCatalog(options?: {
  forceRefresh?: boolean;
}): Promise<ExamsCatalogGrouped> {
  const now = Date.now();
  const isFresh = cachedAt && now - cachedAt < CACHE_TTL_MS;

  if (options?.forceRefresh) {
    inFlightPromise = null;
    cachedAt = null;
    cachedCatalog = null;
  }

  if (cachedCatalog && isFresh) {
    return cachedCatalog;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  if (!cachedCatalog) {
    const fromSession = loadFromSession();
    if (fromSession) {
      cachedCatalog = fromSession;
      cachedAt = Date.now();
      return fromSession;
    }
  }

  if (cachedCatalog && !isFresh) {
    inFlightPromise = doFetch().finally(() => {
      inFlightPromise = null;
    });
    return cachedCatalog;
  }

  inFlightPromise = doFetch().finally(() => {
    inFlightPromise = null;
  });
  return inFlightPromise;
}

export function invalidateExamsCatalog(): void {
  cachedCatalog = null;
  cachedAt = null;
  inFlightPromise = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
