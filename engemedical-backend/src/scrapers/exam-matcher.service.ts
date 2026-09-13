import { Injectable, Logger } from '@nestjs/common';
import { AzureOpenAI, OpenAI } from 'openai';
import * as pdfParse from 'pdf-parse';
import { ExamsScheduled } from 'src/mongo/types/scheduling';
import { normalizeScraperGroup } from './utils/group-normalization.util';
import { buildIdentityDiagnosticSummary } from './utils/scraper-diagnostics.util';
import { fuzzyTokenMatchInText } from './utils/name-normalization.util';

export type MatchClassification = 'RESULT' | 'REQUESTED_ONLY' | 'UNKNOWN';

export type AiMatchItem = {
  index: number;
  confidence?: number;
  evidence?: string;
  classification?: MatchClassification;
};

type AiMatchResponse = {
  matches?: number[] | AiMatchItem[];
  reasoning?: string;
};

export function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function extractDigits(value?: string): string {
  return (value || '').replace(/\D/g, '');
}

const NAME_STOPWORDS = new Set([
  'da',
  'de',
  'do',
  'dos',
  'das',
  'e',
  'di',
  'du',
  'del',
  'della',
]);

export function getPatientNameTokens(name?: string): string[] {
  return normalizeString(name || '')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !NAME_STOPWORDS.has(token));
}

function parseDateParts(
  value?: string,
): { day: string; month: string; year: string; yearShort: string } | null {
  if (!value) return null;
  const fullDate = value.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (!fullDate) return null;
  const year = fullDate[3].length === 2 ? `20${fullDate[3]}` : fullDate[3];
  return {
    day: fullDate[1].padStart(2, '0'),
    month: fullDate[2].padStart(2, '0'),
    year,
    yearShort: year.slice(-2),
  };
}

function hasDateEvidence(reportText: string, value?: string): boolean {
  const parts = parseDateParts(value);
  if (!parts) return false;
  const yearVariants = [parts.year, parts.yearShort];
  const variants: string[] = [];
  for (const y of yearVariants) {
    variants.push(
      `${parts.day}/${parts.month}/${y}`,
      `${parts.day}-${parts.month}-${y}`,
      `${Number(parts.day)}/${Number(parts.month)}/${y}`,
      `${Number(parts.day)}-${Number(parts.month)}-${y}`,
    );
  }
  return variants.some((date) => reportText.includes(date));
}

export function hasMinimumIdentityEvidence(
  reportText: string,
  patientInfo: {
    nome: string;
    cpf: string;
    dataAgendamento: string;
    dataNascimento: string;
  },
  grupo?: string,
): boolean {
  const normalizedReport = normalizeString(reportText);
  const nameTokens = getPatientNameTokens(patientInfo.nome);
  const reportTokens = normalizedReport.split(/\s+/);
  const matchedNameTokens = nameTokens.filter((token) =>
    fuzzyTokenMatchInText(token, reportTokens)
  ).length;

  const minNameTokens = Math.min(2, nameTokens.length);
  const hasMinimumName = matchedNameTokens >= minNameTokens;

  const cpfDigits = extractDigits(patientInfo.cpf);
  const reportDigits = extractDigits(reportText);
  const hasCpf = cpfDigits.length >= 11 && reportDigits.includes(cpfDigits);

  const hasBirthDate = hasDateEvidence(reportText, patientInfo.dataNascimento);
  const hasAppointmentDate = hasDateEvidence(
    reportText,
    patientInfo.dataAgendamento,
  );

  const strongIdentity = hasMinimumName && (hasCpf || hasBirthDate);
  // Fallback: ALL available name tokens matched + appointment date present
  // This handles short names (2 tokens like "AWDERCLAYBER DO NASCIMENTO") where
  // the old >= 3 threshold was impossible to reach
  const fallbackIdentity =
    matchedNameTokens >= nameTokens.length && nameTokens.length >= 2 && hasAppointmentDate;

  // RAIOX: Laudos radiológicos podem ter erros de OCR no nome
  // Aceita 75% dos tokens + qualquer evidência adicional (CPF, data nascimento, data agendamento)
  if (isRaioxGroup(grupo)) {
    const nameRatio = nameTokens.length > 0 ? matchedNameTokens / nameTokens.length : 0;
    if (nameRatio >= 0.75 && (hasCpf || hasBirthDate || hasAppointmentDate)) {
      return true;
    }
    // Fallback: 100% dos tokens sem evidência adicional
    if (matchedNameTokens >= nameTokens.length) return true;
  }

  // ECG/EEG (Medical): Permite correspondência com alta confiança no nome (75% ou mais dos tokens significativos)
  // em conjunto com a data de agendamento correta, mesmo na ausência de CPF cadastrado no MongoDB ou data de nascimento inconsistente.
  if (grupo === 'ECG' || grupo === 'EEG') {
    const nameRatio = nameTokens.length > 0 ? matchedNameTokens / nameTokens.length : 0;
    if (nameRatio >= 0.75 && hasAppointmentDate) {
      return true;
    }
  }

  // WORKLAB: Laudos de laboratório muitas vezes não contêm CPF, data de nascimento, 
  // e a data de cadastro pode diferir da data de agendamento original.
  if (grupo === 'WORKLAB') {
    if (nameTokens.length >= 2 && matchedNameTokens >= nameTokens.length) {
      return true;
    }
  }

  return strongIdentity || fallbackIdentity;
}

const GENERIC_EXAM_TOKENS = new Set([
  'exame',
  'exames',
  'com',
  'sem',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'ou',
  'e',
  'para',
  'total',
  'sanguineo',
  'sanguinea',
  'urinario',
  'urinaria',
  'contagem',
  'fracoes',
  'fator',
  'inclui',
  'hepatite',
  'hepatitis',
  'anti',
  'igm',
  'igg',
  'iga',
  'ige',
  'cod',
  'codigo',
  'esocial',
]);

const LAB_NOISE_TOKENS = new Set([
  'exame',
  'exames',
  'laboratorio',
  'laboratorial',
  'material',
  'amostra',
  'soro',
  'plasma',
  'serico',
  'serica',
  'coleta',
  'completo',
  'painel',
  'perfil',
  'metodo',
  'metodologia',
  'resultado',
  'valores',
  'referencia',
  'jejum',
  'rotina',
  'cod',
  'codigo',
  'esocial',
  'amino',
  'transferase',
]);

const LAB_QUALIFIER_TOKENS = new Set([
  'glicada',
  'hdl',
  'ldl',
  'vldl',
  'total',
  'livre',
  'direto',
  'indireto',
  'qualitativo',
  'quantitativo',
]);

const LAB_TOKEN_ALIASES: Record<string, string[]> = {
  glicemia: ['glicose', 'glucose'],
  oxalacetica: ['tgo', 'ast'],
  aspartato: ['tgo', 'ast'],
  piruvica: ['tgp', 'alt'],
  alanina: ['tgp', 'alt'],
  hcv: ['hvc', 'anti hcv', 'hepatite c'],
  hvc: ['hcv', 'anti hcv', 'hepatite c'],
  hbsac: ['hbs', 'anti hbs', 'hbsag', 'hepatite b'],
  hbs: ['hbsac', 'anti hbs', 'hbsag', 'hepatite b'],
  hbsag: ['hbs', 'anti hbs', 'hbsac', 'hepatite b'],
  hav: ['hva', 'anti hav', 'hepatite a'],
  hva: ['hav', 'anti hav', 'hepatite a'],
};

function extractYear(value?: string): number | null {
  if (!value) return null;
  const fullDate = value
    .trim()
    .match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (fullDate) return Number(fullDate[3]);
  const yearOnly = value.trim().match(/\b(20\d{2})\b/);
  if (yearOnly) return Number(yearOnly[1]);
  return null;
}

function hasExpectedYearInReport(
  text: string,
  expectedYear: number | null,
): boolean {
  if (!expectedYear) return true;
  const found = collectReportYears(text);
  if (found.length === 0) return true;
  return found.includes(expectedYear);
}

type YearEvidenceDecision = {
  expectedYear: number | null;
  foundYears: number[];
  hasExactAppointmentDate: boolean;
  shouldReject: boolean;
  reason:
    | 'missing_expected_year'
    | 'no_expected_year'
    | 'no_years_in_report'
    | 'exact_appointment_date_found'
    | 'expected_year_present'
    | 'multiple_years_without_expected';
};

function collectReportYears(text: string): number[] {
  const years = new Set<number>();
  // 4-digit years: 2000, 2026, etc.
  for (const m of text.match(/\b20\d{2}\b/g) || []) {
    years.add(Number(m));
  }
  // 2-digit years inside date patterns: DD/MM/YY, DD-MM-YY, etc.
  for (const m of text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/g) || []) {
    const parts = m.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/);
    if (parts) {
      const yy = Number(parts[3]);
      if (yy >= 0 && yy <= 99) {
        years.add(2000 + yy);
      }
    }
  }
  return Array.from(years).sort((a, b) => a - b);
}

export function getYearEvidenceDecision(
  reportText: string,
  appointmentDate?: string,
): YearEvidenceDecision {
  const expectedYear = extractYear(appointmentDate);
  const foundYears = collectReportYears(reportText);
  const hasExactAppointmentDate = hasDateEvidence(reportText, appointmentDate);

  if (!expectedYear) {
    return {
      expectedYear,
      foundYears,
      hasExactAppointmentDate,
      shouldReject: false,
      reason: 'no_expected_year',
    };
  }

  if (hasExactAppointmentDate) {
    return {
      expectedYear,
      foundYears,
      hasExactAppointmentDate,
      shouldReject: false,
      reason: 'exact_appointment_date_found',
    };
  }

  if (foundYears.length === 0) {
    return {
      expectedYear,
      foundYears,
      hasExactAppointmentDate,
      shouldReject: false,
      reason: 'no_years_in_report',
    };
  }

  if (foundYears.includes(expectedYear)) {
    return {
      expectedYear,
      foundYears,
      hasExactAppointmentDate,
      shouldReject: false,
      reason: 'expected_year_present',
    };
  }

  if (foundYears.length > 1) {
    // Se o maior ano encontrado no PDF ainda for anterior ao esperado, o documento
    // pertence claramente a um período anterior (ex: laudo de 2025 assinado
    // digitalmente em 2026, atualizando o studyDate do PACS sem mudar o PDF).
    const maxFoundYear = Math.max(...foundYears);
    if (maxFoundYear < expectedYear) {
      return {
        expectedYear,
        foundYears,
        hasExactAppointmentDate,
        shouldReject: true,
        reason: 'missing_expected_year',
      };
    }
    return {
      expectedYear,
      foundYears,
      hasExactAppointmentDate,
      shouldReject: false,
      reason: 'multiple_years_without_expected',
    };
  }

  return {
    expectedYear,
    foundYears,
    hasExactAppointmentDate,
    shouldReject: true,
    reason: 'missing_expected_year',
  };
}

export function getSignificantExamTokens(name?: string): string[] {
  const normalized = normalizeString(name || '')
    .replace(/-/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');
  return normalized
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 5 &&
        !/^\d+$/.test(token) &&
        !GENERIC_EXAM_TOKENS.has(token),
    );
}

const RAIOX_BODY_ALIASES: Record<string, string[]> = {
  lombo: ['lombar', 'lombosacra', 'lombo-sacra'],
  torax: ['toracica', 'toracico', 'toracica'],
  coluna: ['vertebral', 'espinha'],
  costofrenico: ['costofrenicos', 'costofrenica'],
  parenquima: ['parenquimatoso', 'parenquimatosa'],
  mediastino: ['mediastinal'],
  cardiaca: ['cardiaco', 'cardiaca', 'cardio'],
  pulmonar: ['pulmonares', 'pulmonar', 'pulmao'],
};

function normalizeRaioxToken(token: string): string[] {
  const alts = [token, token.replace(/-/g, ''), token.replace(/-/g, ' ')];
  for (const [key, values] of Object.entries(RAIOX_BODY_ALIASES)) {
    if (token === key || values.includes(token)) {
      alts.push(key, ...values);
    }
  }
  return [...new Set(alts)];
}

/**
 * Indicadores de exame radiológico (RX) presentes em laudos do portal.
 * Inclui termos de laudos OIT, radiografia convencional e TC.
 */
const RAIOX_REPORT_INDICATORS = [
  'radiograf',
  'raio',
  'oit',
  'pneumoconiose',
  'leitura',
  'folha',
  'classificacao',
  'coluna',
  'torax',
  'lombo',
  'costela',
  'dorsal',
  'costofrenico',
  'parede toracica',
] as const;

/**
 * Tokens fortes que indicam que o laudo é de TÓRAX (não de coluna).
 * Usado para detectar incompatibilidade quando o exame é de coluna.
 */
const TORAX_STRONG_INDICATORS = [
  'arvore bronsquica',
  'arvore bronquica',
  'arvore brônquica',
  'hilar',
  'hilus',
  'pulmao',
  'pulmonar',
  'cardiaca',
  'cardiaco',
  'mediastino',
  'diafragma',
  'costofrenico',
  'apice',
  'base pulmonar',
] as const;

/**
 * Tokens fortes que indicam que o laudo é de COLUNA.
 */
const COLUNA_STRONG_INDICATORS = [
  'coluna',
  'vertebra',
  'vertebral',
  'lombo',
  'lombar',
  'lombosacra',
  'cervical',
  'toracica',
  'sacra',
  'disco',
  'intervertebral',
  'forame',
  'processo espinhoso',
] as const;

/**
 * Detecta se o laudo é incompatível com o exame solicitado.
 * Ex: exame de COLUNA mas laudo é de TORAX.
 */
function detectExamIncompatibility(
  normalizedReport: string,
  examName: string,
): { incompatible: boolean; reportType: string; examType: string } {
  const reportHasTorax = TORAX_STRONG_INDICATORS.some((t) => normalizedReport.includes(t));
  const reportHasColuna = COLUNA_STRONG_INDICATORS.some((t) => normalizedReport.includes(t));

  const normalizedExam = normalizeString(examName);
  const examIsColuna = ['coluna', 'vertebral', 'lombo', 'lombar', 'lombosacra', 'cervical', 'sacra'].some(
    (t) => normalizedExam.includes(t),
  );
  const examIsTorax = ['torax', 'toracico', 'toracica', 'pulmao', 'pulmonar'].some(
    (t) => normalizedExam.includes(t),
  );

  if (examIsColuna && reportHasTorax && !reportHasColuna) {
    return { incompatible: true, reportType: 'TORAX', examType: 'COLUNA' };
  }
  if (examIsTorax && reportHasColuna && !reportHasTorax) {
    return { incompatible: true, reportType: 'COLUNA', examType: 'TORAX' };
  }

  return { incompatible: false, reportType: reportHasTorax ? 'TORAX' : reportHasColuna ? 'COLUNA' : 'OUTRO', examType: examIsColuna ? 'COLUNA' : examIsTorax ? 'TORAX' : 'OUTRO' };
}

export function hasRaioxTextEvidence(
  reportText: string,
  examName: string,
): boolean {
  const normalizedReport = ` ${normalizeString(reportText)} `;
  const normalizedExamName = normalizeString(examName);

  // 1. Verificar indicador RX
  const hasRxIndicator = RAIOX_REPORT_INDICATORS.some((indicator) =>
    normalizedReport.includes(indicator),
  );
  if (!hasRxIndicator) return false;

  // 2. Verificar incompatibilidade (ex: exame COLUNA mas laudo TORAX)
  const incompatibility = detectExamIncompatibility(normalizedReport, examName);
  if (incompatibility.incompatible) {
    return false;
  }

  // 3. Extrair tokens significativos do nome do exame
  const bodyTokens = normalizedExamName
    .replace(/[\(\)\[\]]/g, ' ')
    .split(/\s+/)
    .filter(
      (t) =>
        t.length >= 3 &&
        !/^\d+$/.test(t) &&
        !['radiografia', 'padrao', 'cod', 'esocial', 'mais', 'recente', 'pelo', 'menos', 'leitor', 'habilitado'].includes(t) &&
        !GENERIC_EXAM_TOKENS.has(t),
    );

  if (bodyTokens.length === 0) return true;

  // 4. Verificar se tokens do exame estão no laudo
  const matched = bodyTokens.filter((t) => {
    const variants = normalizeRaioxToken(t);
    return variants.some((v) => normalizedReport.includes(v));
  });

  const minRequired = Math.max(1, Math.ceil(bodyTokens.length * 0.3));
  return matched.length >= minRequired;
}

export function hasMinimumTextEvidence(
  reportText: string,
  examName: string,
): boolean {
  const normalizedReport = normalizeString(reportText);
  const significantTokens = getSignificantExamTokens(examName);
  if (significantTokens.length === 0) return false;

  const matchedTokensCount = significantTokens.filter((token) =>
    normalizedReport.includes(token),
  ).length;

  // Require at least 60% of significant tokens to be present
  // For 1 token: requires 1
  // For 2 tokens (e.g. "hemoglobina", "glicada"): requires 2
  // For 3 tokens: requires 2
  const minRequired = Math.ceil(significantTokens.length * 0.6);
  return matchedTokensCount >= minRequired;
}

function normalizeTokenizedText(value?: string): string {
  return ` ${normalizeString(value || '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function getCanonicalShortExamType(exam: ExamsScheduled): 'ECG' | 'EEG' | null {
  const normalizedGroup = normalizeScraperGroup(exam.grupo || '');
  if (normalizedGroup === 'ECG' || normalizedGroup === 'EEG') {
    return normalizedGroup;
  }

  const normalizedName = normalizeTokenizedText(exam.nomeExame);
  if (
    normalizedName.includes(' ecg ') ||
    normalizedName.includes(' eletrocardiograma ')
  ) {
    return 'ECG';
  }

  if (
    normalizedName.includes(' eeg ') ||
    normalizedName.includes(' eletroencefalograma ')
  ) {
    return 'EEG';
  }

  return null;
}

export function hasShortExamTextEvidence(
  exam: ExamsScheduled,
  reportText: string,
) {
  const shortExamType = getCanonicalShortExamType(exam);
  if (!shortExamType) return false;

  const normalizedReport = normalizeTokenizedText(reportText);
  const aliases =
    shortExamType === 'ECG'
      ? [' ecg ', ' eletrocardiograma ']
      : [' eeg ', ' eletroencefalograma '];

  return aliases.some((alias) => normalizedReport.includes(alias));
}

type AgreementEvidence = {
  matched: boolean;
  rule: string | null;
  source: 'agreement_field' | 'fallback_alias';
};

function normalizeAgreementText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[-:\/\\|]+/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasTokenWindow(
  tokens: string[],
  required: string[],
  windowSize: number,
): boolean {
  if (required.length === 0 || tokens.length === 0) return false;
  if (windowSize < required.length) return false;

  for (let start = 0; start < tokens.length; start++) {
    const window = tokens.slice(start, start + windowSize);
    if (window.length < required.length) break;
    const windowSet = new Set(window);
    if (required.every((term) => windowSet.has(term))) return true;
  }
  return false;
}

function extractAgreementFieldSnippet(reportText: string): string | null {
  if (!reportText) return null;

  const inlineMatch = reportText.match(
    /conv[eê]nio\s*[:\-\/]?\s*([^\r\n]{1,140})/i,
  );
  if (inlineMatch?.[1]?.trim()) {
    return inlineMatch[1].trim();
  }

  const lines = reportText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const normalizedLine = normalizeAgreementText(line);
    if (!/\bCONVENIO\b/.test(normalizedLine)) continue;

    const valueOnSameLine = line
      .replace(/conv[eê]nio\s*[:\-\/]?\s*/i, '')
      .trim();
    if (valueOnSameLine) return valueOnSameLine;

    const nextLine = lines[index + 1]?.trim();
    if (nextLine) return nextLine;
  }

  return null;
}

function detectAgreementFromText(
  sourceText: string,
  source: 'agreement_field' | 'fallback_alias',
  allowWindowRules: boolean,
): AgreementEvidence {
  const normalized = normalizeAgreementText(sourceText);
  if (!normalized) return { matched: false, rule: null, source };

  const tokens = normalized.split(' ').filter(Boolean);
  const tokenSet = new Set(tokens);

  if (tokenSet.has('CONTROMED')) {
    return { matched: true, rule: 'alias:CONTROMED', source };
  }

  if (tokenSet.has('CMSO')) {
    return { matched: true, rule: 'alias:CMSO', source };
  }

  if (allowWindowRules) {
    if (hasTokenWindow(tokens, ['CENTRO', 'MEDICO', 'OCUPACIONAL'], 6)) {
      return {
        matched: true,
        rule: 'window:CENTRO+MEDICO+OCUPACIONAL',
        source,
      };
    }

    if (hasTokenWindow(tokens, ['CENTRO', 'MEDICO'], 4)) {
      return { matched: true, rule: 'window:CENTRO+MEDICO', source };
    }
  }

  return { matched: false, rule: null, source };
}

function detectClinicAgreementEvidence(reportText: string): AgreementEvidence {
  const agreementSnippet = extractAgreementFieldSnippet(reportText);
  if (agreementSnippet) {
    return detectAgreementFromText(agreementSnippet, 'agreement_field', true);
  }

  return detectAgreementFromText(reportText, 'fallback_alias', false);
}

function isWorklabLaboratoryContext(
  reportText: string,
  pendingExams: ExamsScheduled[],
): boolean {
  const hasLaboratoryPendingExam = pendingExams.some(
    (exam) => normalizeScraperGroup(exam.grupo || '') === 'LABORATORIO',
  );
  if (!hasLaboratoryPendingExam) return false;

  const normalizedReport = normalizeString(reportText);
  return /\bworklab\b/.test(normalizedReport);
}

function normalizeComparableText(value?: string): string {
  return normalizeString(value || '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeComparableText(value?: string): string[] {
  return normalizeComparableText(value).split(/\s+/).filter(Boolean);
}

function buildLabTokenAlternatives(token: string): string[] {
  const alternatives = new Set<string>([
    token,
    ...(LAB_TOKEN_ALIASES[token] || []),
  ]);

  if (token.endsWith('s') && token.length > 4) {
    alternatives.add(token.slice(0, -1));
  } else if (token.length > 4) {
    alternatives.add(`${token}s`);
  }

  if (token.endsWith('es') && token.length > 5) {
    alternatives.add(token.slice(0, -2));
  } else if (token.length > 5) {
    alternatives.add(`${token}es`);
  }

  if (token.endsWith('ico')) alternatives.add(`${token.slice(0, -1)}a`);
  if (token.endsWith('ica')) alternatives.add(`${token.slice(0, -1)}o`);

  return [...alternatives];
}

function tokenMatchesLabReport(
  reportTokens: Set<string>,
  normalizedReport: string,
  token: string,
): boolean {
  return buildLabTokenAlternatives(token).some(
    (alternative) =>
      reportTokens.has(alternative) ||
      normalizedReport.includes(` ${alternative} `) ||
      normalizedReport.startsWith(`${alternative} `) ||
      normalizedReport.endsWith(` ${alternative}`) ||
      normalizedReport === alternative,
  );
}

function getSignificantLabTokens(name?: string): string[] {
  // Ignorar detalhamentos longos após ':' para exames como "Cultura nas fezes: salmonela..."
  const mainName = (name || '').split(':')[0];

  return [
    ...new Set(
      tokenizeComparableText(mainName).filter(
        (token) =>
          token.length >= 3 &&
          !/^\d+$/.test(token) &&
          !GENERIC_EXAM_TOKENS.has(token) &&
          !LAB_NOISE_TOKENS.has(token),
      ),
    ),
  ];
}

export function isLaboratoryExamGroup(group?: string): boolean {
  return normalizeScraperGroup(group || '') === 'LABORATORIO';
}

export function isRaioxGroup(group?: string): boolean {
  return normalizeScraperGroup(group || '') === 'RAIOX';
}

export function hasMinimumLabTextEvidence(
  reportText: string,
  examName: string,
): boolean {
  const normalizedReport = ` ${normalizeComparableText(reportText)} `;
  const reportTokens = new Set(tokenizeComparableText(reportText));
  const significantTokens = getSignificantLabTokens(examName);

  if (significantTokens.length === 0) return false;

  const normalizedExam = significantTokens.join('');
  const compactReport = normalizedReport.replace(/\s+/g, '');
  if (normalizedExam.length >= 8 && compactReport.includes(normalizedExam)) {
    return true;
  }

  const matchedTokens = significantTokens.filter((token) =>
    tokenMatchesLabReport(reportTokens, normalizedReport, token),
  );
  const qualifierTokens = significantTokens.filter((token) =>
    LAB_QUALIFIER_TOKENS.has(token),
  );

  if (
    qualifierTokens.some(
      (token) => !tokenMatchesLabReport(reportTokens, normalizedReport, token),
    )
  ) {
    return false;
  }

  let minRequired = Math.max(1, Math.ceil(significantTokens.length * 0.5));
  if (qualifierTokens.length > 0) {
    minRequired = Math.max(
      minRequired,
      Math.min(significantTokens.length, qualifierTokens.length + 1),
    );
  }

  return matchedTokens.length >= minRequired;
}

export function getTextEvidenceEvaluator(
  exam: ExamsScheduled,
): (reportText: string, examName: string) => boolean {
  if (getCanonicalShortExamType(exam)) {
    return (reportText: string) => hasShortExamTextEvidence(exam, reportText);
  }
  if (isRaioxGroup(exam.grupo)) return hasRaioxTextEvidence;
  return isLaboratoryExamGroup(exam.grupo)
    ? hasMinimumLabTextEvidence
    : hasMinimumTextEvidence;
}

export function getMinimumConfidence(_exam: ExamsScheduled): number {
  // Padronizado em 0.70 para todos os grupos — decisão operacional 28/04/2026
  // Antes: laboratório = 0.70, demais = 0.85
  return 0.7;
}

export function hasAcceptedClassification(
  exam: ExamsScheduled,
  classification?: MatchClassification,
): boolean {
  if (isLaboratoryExamGroup(exam.grupo)) {
    return classification !== 'UNKNOWN';
  }

  return classification !== 'REQUESTED_ONLY' && classification !== 'UNKNOWN';
}

@Injectable()
export class ExamMatcherService {
  private readonly logger = new Logger(ExamMatcherService.name);
  private readonly client?: AzureOpenAI;
  private readonly groqClient?: OpenAI;

  constructor() {
    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(
      /\/openai\/v1\/?$/,
      '',
    );

    if (process.env.AZURE_OPENAI_API_KEY) {
      this.client = new AzureOpenAI({
        endpoint,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1-mini',
        apiVersion: '2025-01-01-preview',
      });
    }

    if (process.env.GROQ_API_KEY) {
      this.groqClient = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      });
    }

    if (!this.groqClient && !this.client) {
      this.logger.warn(
        '[AI] Nenhuma chave de IA configurada. Matching de exames iniciara em modo degradado.',
      );
    }
  }

  private async callWithFallback(messages: any[], options: any) {
    if (this.groqClient) {
      try {
        this.logger.debug('[GROQ] Tentando Groq...');
        return await this.groqClient.chat.completions.create({
          model: process.env.GROQ_MODEL || 'qwen/qwen3.6-27b',
          ...options,
        });
      } catch (groqError) {
        this.logger.warn(
          `[GROQ] Falhou, fallback Azure: ${groqError?.message || groqError}`,
        );
      }
    }

    if (this.client) {
      return await this.client.chat.completions.create({
        //@ts-ignore
        model:
          process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1-mini',
        ...options,
      });
    }

    throw new Error(
      'Nenhum provedor de IA configurado. Defina GROQ_API_KEY ou AZURE_OPENAI_API_KEY.',
    );
  }

  async extractText(pdfBuffer: Buffer): Promise<string> {
    try {
      const firstBytes = pdfBuffer.slice(0, 4).toString('utf-8');

          // Laudos HTML — extrair texto removendo tags
      if (firstBytes.trimStart().startsWith('<') || firstBytes.includes('<!')) {
        const html = pdfBuffer.toString('utf-8');
        return html
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&[a-z]+;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const pdfParseFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default || require('pdf-parse');
      const data = await pdfParseFn(pdfBuffer);
      let text = data?.text ?? '';
      
      if (text) {
        // Insere espaço entre palavras coladas que começam com maiúsculas para termos de dados comuns
        text = text
          .replace(/([a-zA-Z])(Data|Nascimento|Empresa|Funcao|Função|Tipo|Exame|CPF|RG|Nome|FC|Ritmo|Eixo|ECG|EEG|OBS)/g, '$1 $2')
          .replace(/([a-zA-Z])(de Nascimento|do Exame)/g, '$1 $2');
      }
      return text;
    } catch (error) {
      this.logger.error('Erro ao extrair texto do PDF/HTML', error);
      throw error;
    }
  }

  async matchExams(
    text: string,
    pendingExams: ExamsScheduled[],
    patientInfo: {
      nome: string;
      cpf: string;
      dataAgendamento: string;
      dataNascimento: string;
    },
    provider?: string,
  ): Promise<Array<{ codigoExame: string; confidence: number }>> {
    if (pendingExams.length === 0) return [];

    const yearDecision = getYearEvidenceDecision(
      text,
      patientInfo.dataAgendamento,
    );
    const identitySummary = buildIdentityDiagnosticSummary({
      patientName: patientInfo.nome,
      patientCpf: patientInfo.cpf,
      patientBirthDate: patientInfo.dataNascimento,
      appointmentDate: patientInfo.dataAgendamento,
      reportText: text,
    });
    this.logger.debug(
      `[MATCH][INPUT_SUMMARY] patient="${patientInfo.nome}" pendingExams=${pendingExams.length} textLength=${text.trim().length} matchedNameTokens=${identitySummary.matchedNameTokens}/${identitySummary.minimumNameTokens} hasCpf=${identitySummary.hasCpf} hasBirthDate=${identitySummary.hasBirthDate} hasAppointmentDate=${identitySummary.hasAppointmentDate} yearReason=${identitySummary.yearReason} yearRejected=${identitySummary.yearRejected}`,
    );
    if (yearDecision.shouldReject) {
      this.logger.warn(
        `[MATCH][REJECT][YEAR] patient="${patientInfo.nome}" ` +
        `expectedYear=${yearDecision.expectedYear ?? 'n/a'} ` +
        `foundYears=[${yearDecision.foundYears.join(',')}] ` +
        `reason=${yearDecision.reason} ` +
        `hasExactDate=${yearDecision.hasExactAppointmentDate} ` +
        `textPreview="${text.replace(/\s+/g, ' ').trim().slice(0, 120)}"`,
      );
      return [];
    }
    const anyRaiox = pendingExams.some((ex) => isRaioxGroup(ex.grupo));
    const anyEcg = pendingExams.some((ex) => normalizeScraperGroup(ex.grupo) === 'ECG');
    const anyEeg = pendingExams.some((ex) => normalizeScraperGroup(ex.grupo) === 'EEG');

    const identityGrupo = anyRaiox
      ? 'RAIOX'
      : anyEcg
        ? 'ECG'
        : anyEeg
          ? 'EEG'
          : provider === 'Worklab'
            ? 'WORKLAB'
            : undefined;

    if (!hasMinimumIdentityEvidence(text, patientInfo, identityGrupo)) {
      const normalizedReport = normalizeString(text);
      const reportTokens = normalizedReport.split(/\s+/);
      const allNameTokens = getPatientNameTokens(patientInfo.nome);
      const matchedTokens = allNameTokens.filter((t) => fuzzyTokenMatchInText(t, reportTokens));
      const missedTokens = allNameTokens.filter((t) => !fuzzyTokenMatchInText(t, reportTokens));
      this.logger.warn(
        `[MATCH][REJECT][IDENTITY] patient="${patientInfo.nome}" ` +
        `matchedTokens=[${matchedTokens.join(',')}] ` +
        `missedTokens=[${missedTokens.join(',')}] ` +
        `(${matchedTokens.length}/${allNameTokens.length}) ` +
        `hasCpf=${identitySummary.hasCpf} ` +
        `hasBirthDate=${identitySummary.hasBirthDate} ` +
        `hasAppointmentDate=${identitySummary.hasAppointmentDate}`,
      );
      return [];
    }

    const worklabLaboratoryContext = isWorklabLaboratoryContext(
      text,
      pendingExams,
    );
    const agreementEvidence = worklabLaboratoryContext
      ? detectClinicAgreementEvidence(text)
      : { matched: false, rule: null, source: 'fallback_alias' as const };

    if (worklabLaboratoryContext) {
      this.logger.debug(
        `[WORKLAB][LAB][AGREEMENT] agreementEvidence=${agreementEvidence.matched} rule=${agreementEvidence.rule ?? 'none'} source=${agreementEvidence.source}`,
      );
    }

    const referenceTable = pendingExams.map((ex, index) => ({
      index,
      codigoExame: ex.codigoExame,
      nomeExame: ex.nomeExame,
      grupo: ex.grupo,
    }));

    const messages: any[] = [
      {
        role: 'system',
        content:
          'You are a strict medical-report matcher. Output ONLY a valid JSON object following this schema: {"matches": [{"index": number, "confidence": number, "evidence": string, "classification": "RESULT" | "REQUESTED_ONLY" | "UNKNOWN"}], "reasoning": string}. Do NOT include patient info or literal test values in the JSON. Pay extreme attention to partial matches of test names! "Hemoglobin" is strictly different from "Glycated Hemoglobin" or "Hemoglobina glicada". Reject partial name matches.',
      },
      {
        role: 'user',
        content: `Patient: ${patientInfo.nome} | CPF: ${patientInfo.cpf} | Birth Date: ${patientInfo.dataNascimento} | Appt: ${patientInfo.dataAgendamento}
Pending: ${JSON.stringify(referenceTable)}
Report: <text>${text}</text>`,
      },
    ];

    try {
      const response = await this.callWithFallback(messages, {
        messages,
        temperature: 0,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      let result: AiMatchResponse;
      try {
        result = JSON.parse(rawContent) as AiMatchResponse;
      } catch (parseError) {
        this.logger.error(
          `Erro ao parsear JSON do OpenAI. Conteúdo (primeiros 200 caracteres): ${rawContent.substring(0, 200)}`,
        );
        this.logger.error(
          `Conteúdo (últimos 200 caracteres): ${rawContent.substring(Math.max(0, rawContent.length - 200))}`,
        );
        return [];
      }

      if (!Array.isArray(result.matches)) return [];
      this.logger.debug(
        `[MATCH][AI_RESPONSE] patient="${patientInfo.nome}" rawMatches=${result.matches.length}`,
      );

      const acceptedMatches: Array<{ codigoExame: string; confidence: number }> = [];
      for (const rawMatch of result.matches) {
        const item: AiMatchItem =
          typeof rawMatch === 'number'
            ? { index: rawMatch, confidence: 0.85 }
            : rawMatch;
        const exam = pendingExams[item.index];
        if (!exam) continue;
        const minimumConfidence = getMinimumConfidence(exam);
        const hasConfidence = (item.confidence ?? 0) >= minimumConfidence;
        const hasClassification = hasAcceptedClassification(
          exam,
          item.classification,
        );
        const hasTextEvidence = getTextEvidenceEvaluator(exam)(
          text,
          exam.nomeExame,
        );

        if (!hasConfidence) {
          this.logger.warn(
            `[MATCH][REJECT][CONFIDENCE] patient="${patientInfo.nome}" ` +
            `exam="${exam.nomeExame}" ` +
            `group=${normalizeScraperGroup(exam.grupo)} ` +
            `confidence=${item.confidence ?? 0} ` +
            `minimum=${minimumConfidence}`,
          );
          continue;
        }

        if (!hasClassification) {
          this.logger.warn(
            `[MATCH][REJECT][CLASSIFICATION] patient="${patientInfo.nome}" ` +
            `exam="${exam.nomeExame}" ` +
            `group=${normalizeScraperGroup(exam.grupo)} ` +
            `classification=${item.classification ?? 'undefined'} ` +
            `expected=RESULT confidence=${item.confidence ?? 0}`,
          );
          continue;
        }

        if (!hasTextEvidence) {
          this.logger.warn(
            `[MATCH][REJECT][TEXT_EVIDENCE] patient="${patientInfo.nome}" ` +
            `exam="${exam.nomeExame}" ` +
            `group=${normalizeScraperGroup(exam.grupo)} ` +
            `classification=${item.classification ?? 'undefined'} ` +
            `confidence=${item.confidence ?? 0}`,
          );
          continue;
        }

        acceptedMatches.push({
          codigoExame: exam.codigoExame,
          confidence: item.confidence ?? 0,
        });
        this.logger.debug(
          `[MATCH][ACCEPT] patient="${patientInfo.nome}" ` +
          `exam="${exam.nomeExame}" ` +
          `group=${normalizeScraperGroup(exam.grupo)} ` +
          `confidence=${item.confidence ?? 0} ` +
          `classification=${item.classification ?? 'undefined'}`,
        );
      }

      return acceptedMatches;
    } catch (error) {
      this.logger.error('Erro na chamada ao OpenAI', error);
      return [];
    }
  }
}
