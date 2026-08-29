/**
 * SCRIPT DE DIAGNÓSTICO — WORKLAB SCRAPER
 * =====================================================================
 * Objetivo: Investigar por que o resultado de laboratório do funcionário
 * ARTHUR JARDIM OLIVEIRA (Worklab/Laborqualy) não está sendo vinculado
 * ao documento de agendamento no CMSO360.
 *
 * Caso analisado:
 *   - Nome: ARTHUR JARDIM OLIVEIRA
 *   - CPF: 483.062.018-84
 *   - Agendamento: 20/04/2026
 *   - Prontuário: 1013593-4011-1-20042026
 *   - Exames pendentes (AGUARDANDO_RESULTADO):
 *       28100239 — Cultura nas fezes (Salmonela, Shigellae...) / Laboratório
 *       28030141 — Parasitológico de fezes / Laboratório
 *   - Profissional/Sala: Athos Laborqualy / SALA 1
 *
 * Como usar:
 *   node src/scripts/test-worklab-scraper.js
 *   (ou: node src/scripts/test-worklab-scraper.js --verbose)
 *
 * O script imprime cada etapa do scraper com diagnóstico detalhado,
 * simulando exatamente o que o ScraperService faz em produção.
 * =====================================================================
 */

'use strict';

require('dotenv').config({ path: '.env' });

const axios = require('axios');
const qs = require('qs');
const pdfParse = require('pdf-parse');

// ─── CONFIGURAÇÃO DO CASO ─────────────────────────────────────────────────────

const PATIENT = {
  nome: 'ARTHUR JARDIM OLIVEIRA',
  cpf: '48306201884',
  dataAgendamento: '20/04/2026',
  dataNascimento: '09/11/2005',
};

const PENDING_EXAMS = [
  {
    codigoExame: '28100239',
    nomeExame: 'Cultura nas fezes: salmonela, shigellae e esc. Coli enteropatogênicas, enteroinvasora (sorol. Incluída) + campylobacter SP. + E. Coli enterohemorrágica (Cód. eSocial - 0472)',
    status: 'AGUARDANDO_RESULTADO',
    grupo: 'Laboratório',
    profissional: 'Athos Laborqualy',
    sequencialResultadoExame: '701358074',
  },
  {
    codigoExame: '28030141',
    nomeExame: 'Parasitológico de fezes (Cód. eSocial - 0974)',
    status: 'AGUARDANDO_RESULTADO',
    grupo: 'Laboratório',
    profissional: 'Athos Laborqualy',
    sequencialResultadoExame: '701358075',
  },
];

// ─── CONFIGURAÇÃO DO WORKLAB ──────────────────────────────────────────────────

const WORKLAB_CONFIG = {
  baseUrl: 'https://app2.worklabweb.com.br',
  cliente: process.env.WORKLAB_CLIENTE || '2751',
  user: process.env.WORKLAB_USER || 'centro',
  pass: process.env.WORKLAB_PASS || '12345',
};

const VERBOSE = process.argv.includes('--verbose');

// ─── UTILIDADES DE LOG ────────────────────────────────────────────────────────

const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';
const DIM    = '\x1b[2m';

function section(title) {
  console.log(`\n${BOLD}${CYAN}${'═'.repeat(70)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${'═'.repeat(70)}${RESET}`);
}

function ok(msg, extra) {
  console.log(`${GREEN}  ✓ ${msg}${RESET}${extra ? ` ${DIM}${extra}${RESET}` : ''}`);
}

function warn(msg, extra) {
  console.log(`${YELLOW}  ⚠ ${msg}${RESET}${extra ? ` ${DIM}${extra}${RESET}` : ''}`);
}

function fail(msg, extra) {
  console.log(`${RED}  ✗ ${msg}${RESET}${extra ? ` ${DIM}${extra}${RESET}` : ''}`);
}

function info(msg, extra) {
  console.log(`${CYAN}  ℹ ${msg}${RESET}${extra ? ` ${DIM}${extra}${RESET}` : ''}`);
}

function verbose(msg) {
  if (VERBOSE) console.log(`${DIM}    ${msg}${RESET}`);
}

// ─── GERENCIAMENTO DE COOKIES ─────────────────────────────────────────────────

let cookies = {};

function getCookieString() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

function updateCookies(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return;
  setCookie.forEach((c) => {
    const parts = c.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0]] = parts.slice(1).join('=');
    }
  });
}

// ─── UTILIDADES DE ANÁLISE ────────────────────────────────────────────────────

function normalizeString(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getPatientNameTokens(name) {
  const stopwords = new Set(['da', 'de', 'do', 'dos', 'das', 'e', 'di', 'du', 'del', 'della']);
  return normalizeString(name || '')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function matchesByNameTokens(candidate, query) {
  const candidateNorm = normalizeString(candidate);
  const queryTokens = normalizeString(query).split(' ').filter((t) => t.length >= 2);
  if (queryTokens.length === 0) return false;
  return queryTokens.every((token) => candidateNorm.includes(token));
}

function buildNameSearchVariants(name) {
  const original = (name || '').replace(/\s+/g, ' ').trim();
  const normalized = normalizeString(original).replace(/\s+/g, ' ').trim();
  const tokens = normalizeString(original).split(' ').filter((t) => t.length >= 2);
  const firstLast = tokens.length >= 2 ? `${tokens[0]} ${tokens[tokens.length - 1]}` : '';
  const variants = [original, normalized, firstLast].map((v) => v.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return [...new Set(variants)];
}

function normalizeGroupValue(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeScraperGroup(value) {
  const normalized = normalizeGroupValue(value);
  if (!normalized) return '';
  if (normalized === 'RX' || normalized.startsWith('RAIOX')) return 'RAIOX';
  if (normalized.startsWith('LABORATORIO')) return 'LABORATORIO';
  if (normalized.startsWith('ELETROENCEFALOGRAMA')) return 'EEG';
  if (normalized.startsWith('EEG')) return 'EEG';
  if (normalized.startsWith('ELETROCARDIOGRAMA')) return 'ECG';
  if (normalized.startsWith('ECG')) return 'ECG';
  return normalized;
}

function isWorklabLaboratoryContext(reportText, pendingExams) {
  const hasLabPending = pendingExams.some(
    (exam) => normalizeScraperGroup(exam.grupo || '') === 'LABORATORIO',
  );
  if (!hasLabPending) return false;
  return /\bworklab\b/.test(normalizeString(reportText));
}

function hasMinimumIdentityEvidence(reportText, patientInfo) {
  const normalizedReport = normalizeString(reportText);
  const nameTokens = getPatientNameTokens(patientInfo.nome);
  const matchedNameTokens = nameTokens.filter((token) => normalizedReport.includes(token)).length;
  const minNameTokens = Math.min(2, nameTokens.length);
  const hasMinimumName = matchedNameTokens >= minNameTokens;

  const cpfDigits = (patientInfo.cpf || '').replace(/\D/g, '');
  const reportDigits = reportText.replace(/\D/g, '');
  const hasCpf = cpfDigits.length >= 11 && reportDigits.includes(cpfDigits);

  // Data de nascimento
  const dn = patientInfo.dataNascimento;
  let hasBirthDate = false;
  if (dn) {
    const parts = dn.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (parts) {
      const day = parts[1].padStart(2, '0');
      const month = parts[2].padStart(2, '0');
      const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
      const candidates = [
        `${day}/${month}/${year}`,
        `${day}-${month}-${year}`,
        `${Number(day)}/${Number(month)}/${year}`,
      ];
      hasBirthDate = candidates.some((c) => reportText.includes(c));
    }
  }

  // Data de agendamento
  const da = patientInfo.dataAgendamento;
  let hasAppointmentDate = false;
  if (da) {
    const parts = da.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (parts) {
      const day = parts[1].padStart(2, '0');
      const month = parts[2].padStart(2, '0');
      const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
      const candidates = [
        `${day}/${month}/${year}`,
        `${day}-${month}-${year}`,
      ];
      hasAppointmentDate = candidates.some((c) => reportText.includes(c));
    }
  }

  const strongIdentity = hasMinimumName && (hasCpf || hasBirthDate);
  const fallbackIdentity = matchedNameTokens >= nameTokens.length && nameTokens.length >= 2 && hasAppointmentDate;

  // WORKLAB: Laudos de laboratório muitas vezes não contêm CPF, data de nascimento exata.
  const worklabIdentity = nameTokens.length >= 2 && matchedNameTokens >= nameTokens.length;

  return {
    nameTokens,
    matchedNameTokens,
    minNameTokens,
    hasMinimumName,
    hasCpf,
    hasBirthDate,
    hasAppointmentDate,
    strongIdentity,
    fallbackIdentity,
    worklabIdentity,
    passed: strongIdentity || fallbackIdentity || worklabIdentity,
  };
}

function getYearEvidenceDecision(text, appointmentDate) {
  function extractYear(value) {
    if (!value) return null;
    const full = value.trim().match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
    if (full) return Number(full[3]);
    const yearOnly = value.trim().match(/\b(20\d{2})\b/);
    if (yearOnly) return Number(yearOnly[1]);
    return null;
  }

  function collectReportYears(text) {
    const years = new Set();
    for (const m of text.match(/\b20\d{2}\b/g) || []) years.add(Number(m));
    for (const m of text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/g) || []) {
      const p = m.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/);
      if (p) years.add(2000 + Number(p[3]));
    }
    return Array.from(years).sort((a, b) => a - b);
  }

  const expectedYear = extractYear(appointmentDate);
  const foundYears = collectReportYears(text);

  if (!expectedYear) return { shouldReject: false, reason: 'no_expected_year', expectedYear, foundYears };
  if (foundYears.length === 0) return { shouldReject: false, reason: 'no_years_in_report', expectedYear, foundYears };
  if (foundYears.includes(expectedYear)) return { shouldReject: false, reason: 'expected_year_present', expectedYear, foundYears };
  if (foundYears.length > 1) return { shouldReject: false, reason: 'multiple_years_without_expected', expectedYear, foundYears };
  return { shouldReject: true, reason: 'missing_expected_year', expectedYear, foundYears };
}

function getSignificantLabTokens(name) {
  const mainName = (name || '').split(':')[0];
  const GENERIC_EXAM_TOKENS = new Set(['exame', 'exames', 'com', 'sem', 'de', 'do', 'da', 'dos', 'das', 'ou', 'e', 'para', 'total', 'cod', 'codigo', 'esocial', 'inclui']);
  const LAB_NOISE_TOKENS = new Set(['exame', 'exames', 'laboratorio', 'laboratorial', 'material', 'amostra', 'soro', 'plasma', 'serico', 'serica', 'coleta', 'completo', 'painel', 'perfil', 'metodo', 'resultado', 'valores', 'referencia', 'jejum', 'rotina', 'cod', 'codigo', 'esocial', 'transferase']);
  return [...new Set(
    normalizeString(mainName)
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((token) =>
        token.length >= 3 &&
        !/^\d+$/.test(token) &&
        !GENERIC_EXAM_TOKENS.has(token) &&
        !LAB_NOISE_TOKENS.has(token)
      )
  )];
}

function hasMinimumLabTextEvidence(reportText, examName) {
  const normalizedReport = ` ${normalizeString(reportText).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const reportTokenSet = new Set(normalizedReport.trim().split(/\s+/));
  const tokens = getSignificantLabTokens(examName);
  if (tokens.length === 0) return false;

  const matchedTokens = tokens.filter((token) => {
    return reportTokenSet.has(token) || normalizedReport.includes(` ${token} `);
  });

  const minRequired = Math.max(1, Math.ceil(tokens.length * 0.5));
  return { matched: matchedTokens.length >= minRequired, matchedTokens, tokens, minRequired };
}

// ─── ETAPA 1: LOGIN NO WORKLAB ────────────────────────────────────────────────

async function doLogin() {
  section('ETAPA 1: LOGIN NO WORKLAB');
  info(`URL: ${WORKLAB_CONFIG.baseUrl}/index.php`);
  info(`Cliente: ${WORKLAB_CONFIG.cliente} | Usuário: ${WORKLAB_CONFIG.user}`);

  const loginPayload = qs.stringify({
    new_form: 'new_form',
    new_login_cliente: WORKLAB_CONFIG.cliente,
    new_login_username: WORKLAB_CONFIG.user,
    new_login_password: WORKLAB_CONFIG.pass,
  });

  try {
    const loginRes = await axios.post(
      `${WORKLAB_CONFIG.baseUrl}/index.php`,
      loginPayload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Origin: WORKLAB_CONFIG.baseUrl,
          Referer: `${WORKLAB_CONFIG.baseUrl}/index.php`,
        },
        timeout: 30000,
        maxRedirects: 0,
        validateStatus: (s) => s < 400,
      },
    );

    updateCookies(loginRes.headers);
    ok(`Resposta HTTP: ${loginRes.status}`);
    verbose(`Cookies recebidos: ${getCookieString().substring(0, 80)}...`);

    // Estabilizar sessão
    const welcomeRes = await axios.get(`${WORKLAB_CONFIG.baseUrl}/welcome.php`, {
      headers: {
        Cookie: getCookieString(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    updateCookies(welcomeRes.headers);

    if (welcomeRes.status === 200) {
      ok(`Sessão Worklab estabelecida (welcome.php: ${welcomeRes.status})`);
      const cookieCount = Object.keys(cookies).length;
      ok(`Cookies de sessão: ${cookieCount} cookies`);
      return true;
    } else {
      warn(`welcome.php retornou status ${welcomeRes.status}. Sessão pode ser inválida.`);
      return false;
    }
  } catch (error) {
    fail(`Erro no login: ${error.message}`);
    if (error.response) {
      fail(`Status HTTP: ${error.response.status}`);
    }
    return false;
  }
}

// ─── ETAPA 2: BUSCA DO PACIENTE ───────────────────────────────────────────────

async function doSearchPatient(name) {
  section(`ETAPA 2: BUSCA DO PACIENTE — "${name}"`);

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

  const url = `${WORKLAB_CONFIG.baseUrl}/datatable.php?${query}`;
  info(`URL de busca: ${url.substring(0, 100)}...`);

  try {
    const searchRes = await axios.get(url, {
      headers: {
        Cookie: getCookieString(),
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: `${WORKLAB_CONFIG.baseUrl}/pacientes-data.php`,
      },
      timeout: 30000,
    });

    const data = searchRes.data;

    if (!data || !data.aaData) {
      warn('Resposta não contém campo aaData — formato inesperado.');
      verbose(`Resposta bruta: ${JSON.stringify(data).substring(0, 300)}`);
      return [];
    }

    info(`Total de registros na resposta: ${data.aaData.length}`);
    info(`Total geral (iTotalRecords): ${data.iTotalRecords ?? 'N/A'}`);

    if (data.aaData.length === 0) {
      fail('Nenhum registro retornado — paciente não encontrado no portal Worklab.');
      console.log(`\n  ${YELLOW}POSSÍVEIS CAUSAS:${RESET}`);
      console.log(`    1. Resultado ainda não liberado no portal Worklab`);
      console.log(`    2. Resultado cadastrado com nome diferente (ex: abreviado ou com erro)`);
      console.log(`    3. O parâmetro bymonth=1 pode estar filtrando resultados antigos`);
      console.log(`    4. Credenciais de acesso diferentes das necessárias para este cliente`);
      return [];
    }

    // Exibir todos os registros retornados antes do filtro de nome
    if (VERBOSE) {
      console.log(`\n  ${DIM}Registros brutos antes do filtro de nome:${RESET}`);
      data.aaData.forEach((row, i) => {
        const id = row[0] ?? '?';
        const code = row[1] ?? '?';
        const date = row[2] ?? '?';
        const rowName = String(row[3] || '').trim();
        console.log(`    [${i}] id=${id} code=${code} date=${date} name="${rowName}"`);
      });
    }

    // Aplicar filtro de nome (mesmo algoritmo do scraper)
    const matches = data.aaData.filter((row) => {
      const rowName = String(row[3] || '').trim();
      return matchesByNameTokens(rowName, nameTrimmed);
    });

    if (matches.length > 0) {
      ok(`${matches.length} candidato(s) passaram no filtro de nome:`);
      matches.forEach((row, i) => {
        const id = row[0] ?? '?';
        const code = row[1] ?? '?';
        const date = row[2] ?? '?';
        const rowName = String(row[3] || '').trim();
        console.log(`    [${i}] id=${id} | code=${code} | date=${date} | name="${rowName}"`);
      });
    } else {
      fail(`0 candidatos passaram no filtro de nome para "${nameTrimmed}"`);
      console.log(`\n  ${YELLOW}Registros retornados que NÃO passaram no filtro:${RESET}`);
      data.aaData.forEach((row, i) => {
        const rowName = String(row[3] || '').trim();
        const queryTokens = normalizeString(nameTrimmed).split(' ').filter((t) => t.length >= 2);
        const candidateNorm = normalizeString(rowName);
        const matched = queryTokens.filter((t) => candidateNorm.includes(t));
        const missed = queryTokens.filter((t) => !candidateNorm.includes(t));
        console.log(`    [${i}] name="${rowName}"`);
        console.log(`         tokens matches: [${matched.join(', ')}] | missed: [${missed.join(', ')}]`);
      });
    }

    return matches;
  } catch (error) {
    fail(`Erro na busca: ${error.message}`);
    if (error.response) {
      fail(`Status HTTP: ${error.response.status}`);
    }
    return [];
  }
}

// ─── ETAPA 3: DOWNLOAD DO LAUDO ──────────────────────────────────────────────

async function doDownloadReport(patientRow) {
  const patientId = patientRow[0];
  const patientCode = patientRow[1];
  const patientName = String(patientRow[3] || '').trim();

  section(`ETAPA 3: DOWNLOAD DO LAUDO — id=${patientId}`);
  info(`PatientId: ${patientId} | Code: ${patientCode} | Name: "${patientName}"`);

  try {
    // Trigger geração do laudo
    const triggerUrl = `${WORKLAB_CONFIG.baseUrl}/printLaudo.php?id=${patientId}`;
    info(`Disparando geração: ${triggerUrl}`);
    const triggerRes = await axios.get(triggerUrl, {
      headers: {
        Cookie: getCookieString(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 30000,
      validateStatus: () => true,
    });
    ok(`printLaudo.php status: ${triggerRes.status}`);

    // Download do PDF
    const codParam = `${patientCode}-${patientName.replace(/ /g, '%20')}%20%20`;
    const viewUrl = `${WORKLAB_CONFIG.baseUrl}/view.php?cod=${codParam}`;
    info(`Baixando PDF: ${viewUrl.substring(0, 100)}`);

    const pdfRes = await axios.get(viewUrl, {
      headers: {
        Cookie: getCookieString(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      responseType: 'arraybuffer',
      timeout: 30000,
      validateStatus: () => true,
    });

    const contentType = pdfRes.headers['content-type'] || '';
    const size = pdfRes.data.length;
    info(`Resposta: status=${pdfRes.status} content-type="${contentType}" size=${size} bytes`);

    // Verificação do threshold de 5000 bytes (mesmo que o scraper original)
    const THRESHOLD = 5000;
    if (size > THRESHOLD) {
      ok(`Tamanho ${size} bytes > ${THRESHOLD} bytes → buffer válido para processamento`);
      return Buffer.from(pdfRes.data);
    } else {
      fail(`Tamanho ${size} bytes ≤ ${THRESHOLD} bytes → buffer REJEITADO pelo scraper`);
      console.log(`\n  ${YELLOW}DIAGNÓSTICO DO THRESHOLD:${RESET}`);
      console.log(`    O scraper usa: if (pdfRes.data.length > 5000) → retorna buffer`);
      console.log(`    Tamanho recebido: ${size} bytes`);
      console.log(`    Conteúdo parcial (texto): ${Buffer.from(pdfRes.data).toString('utf-8', 0, 200)}`);

      if (contentType.includes('html')) {
        console.log(`\n  ${RED}⚠ PROBLEMA IDENTIFICADO: Resposta é HTML (não PDF)${RESET}`);
        console.log(`    Content-Type indica HTML, possivelmente uma mensagem de erro ou redirect.`);
        const htmlSnippet = Buffer.from(pdfRes.data).toString('utf-8', 0, 500);
        console.log(`    HTML snippet: ${htmlSnippet.replace(/\s+/g, ' ').substring(0, 300)}`);
      }
      return null;
    }
  } catch (error) {
    fail(`Erro no download: ${error.message}`);
    return null;
  }
}

// ─── ETAPA 4: ANÁLISE DO CONTEÚDO DO LAUDO ───────────────────────────────────

async function doAnalyzePdf(pdfBuffer) {
  section('ETAPA 4: ANÁLISE DO CONTEÚDO DO LAUDO (PDF)');

  let text = '';
  try {
    const data = await pdfParse(pdfBuffer);
    text = data?.text ?? '';
    ok(`Texto extraído com sucesso: ${text.trim().length} caracteres`);
    if (VERBOSE) {
      console.log(`\n  ${DIM}Preview do texto (primeiros 500 chars):${RESET}`);
      console.log(`  ${DIM}${text.replace(/\s+/g, ' ').trim().substring(0, 500)}${RESET}`);
    }
  } catch (error) {
    // Tentar como HTML
    const firstBytes = pdfBuffer.slice(0, 10).toString('utf-8');
    if (firstBytes.trimStart().startsWith('<') || firstBytes.includes('<!')) {
      warn('Buffer é HTML, não PDF — extração como texto...');
      const html = pdfBuffer.toString('utf-8');
      text = html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      ok(`Texto extraído de HTML: ${text.length} chars`);
    } else {
      fail(`Erro ao extrair texto: ${error.message}`);
      return '';
    }
  }

  console.log('');

  // ─── Verificação 1: Ano do documento ─────────────────────────────────────
  console.log(`  ${BOLD}[Verificação 1] Evidência de Ano${RESET}`);
  const yearDecision = getYearEvidenceDecision(text, PATIENT.dataAgendamento);
  const yearIcon = yearDecision.shouldReject ? `${RED}✗ REJEITADO` : `${GREEN}✓ OK`;
  console.log(`    ${yearIcon}${RESET} reason=${yearDecision.reason} expected=${yearDecision.expectedYear} found=[${yearDecision.foundYears.join(',')}]`);
  if (yearDecision.shouldReject) {
    fail('MATCH REJEITADO por falta de evidência de ano!');
    console.log(`    ${YELLOW}Este é um dos motivos mais comuns para falha. O laudo não contém o ano ${yearDecision.expectedYear}.${RESET}`);
  }

  // ─── Verificação 2: Identidade do paciente ────────────────────────────────
  console.log(`\n  ${BOLD}[Verificação 2] Identidade do Paciente${RESET}`);
  const identity = hasMinimumIdentityEvidence(text, PATIENT);
  const idIcon = identity.passed ? `${GREEN}✓ OK` : `${RED}✗ REJEITADO`;
  console.log(`    ${idIcon}${RESET}`);
  console.log(`    Tokens do nome: [${identity.nameTokens.join(', ')}]`);
  console.log(`    Tokens encontrados no laudo: ${identity.matchedNameTokens}/${identity.nameTokens.length} (mínimo: ${identity.minNameTokens})`);
  console.log(`    hasMinimumName: ${identity.hasMinimumName}`);
  console.log(`    hasCpf: ${identity.hasCpf}`);
  console.log(`    hasBirthDate: ${identity.hasBirthDate}`);
  console.log(`    hasAppointmentDate: ${identity.hasAppointmentDate}`);
  console.log(`    strongIdentity (name + CPF/nasc): ${identity.strongIdentity}`);
  console.log(`    fallbackIdentity (all tokens + data agend.): ${identity.fallbackIdentity}`);
  console.log(`    worklabIdentity (all tokens): ${identity.worklabIdentity}`);
  if (!identity.passed) {
    fail('MATCH REJEITADO por insuficiência de identidade!');
  }

  // ─── Verificação 3: Worklab context + acordo ─────────────────────────────
  console.log(`\n  ${BOLD}[Verificação 3] Contexto Worklab no Laudo${RESET}`);
  const isWorklab = isWorklabLaboratoryContext(text, PENDING_EXAMS);
  if (isWorklab) {
    ok('Palavra "worklab" encontrada no laudo — verificação de convênio será feita');
  } else {
    warn('Palavra "worklab" NÃO encontrada no laudo — verificação de convênio IGNORADA');
    console.log(`    ${DIM}Nota: Isso não bloqueia o match, apenas pula a checagem de convênio${RESET}`);
  }

  // ─── Verificação 4: Evidência textual de cada exame ──────────────────────
  console.log(`\n  ${BOLD}[Verificação 4] Evidência Textual por Exame${RESET}`);
  for (const exam of PENDING_EXAMS) {
    console.log(`\n    Exame: "${exam.nomeExame.substring(0, 80)}..."`);
    console.log(`    Código: ${exam.codigoExame} | Grupo: ${exam.grupo} → ${normalizeScraperGroup(exam.grupo)}`);

    const result = hasMinimumLabTextEvidence(text, exam.nomeExame);
    const evIcon = result.matched ? `${GREEN}✓ OK` : `${RED}✗ REJEITADO`;
    console.log(`    Tokens significativos: [${result.tokens.join(', ')}]`);
    console.log(`    Tokens encontrados: [${result.matchedTokens.join(', ')}] (${result.matchedTokens.length}/${result.tokens.length}, mínimo: ${result.minRequired})`);
    console.log(`    Evidência textual: ${evIcon}${RESET}`);
    if (!result.matched) {
      fail(`Exame "${exam.codigoExame}" seria REJEITADO por falta de evidência textual`);
    }
  }

  return text;
}

// ─── ETAPA 5: DIAGNÓSTICO DE PARÂMETROS DO SCRAPER ───────────────────────────

function doDiagnoseScraperParams() {
  section('ETAPA 5: DIAGNÓSTICO DE PARÂMETROS DO SCRAPER');

  // 1. Variantes de busca geradas
  console.log(`\n  ${BOLD}[Config 1] Variantes de nome para busca${RESET}`);
  const variants = buildNameSearchVariants(PATIENT.nome);
  ok(`${variants.length} variante(s) serão tentadas:`);
  variants.forEach((v, i) => console.log(`    [${i}] "${v}"`));

  // 2. Filtro bymonth
  console.log(`\n  ${BOLD}[Config 2] Parâmetro bymonth=1${RESET}`);
  warn('bymonth=1 → Filtra resultados do MÊS ATUAL no Worklab');
  console.log(`    ${DIM}O agendamento é 20/04/2026 (Abril/2026).${RESET}`);
  console.log(`    ${DIM}Se o scraper rodar em outro mês, bymonth=1 pode excluir resultados antigos!${RESET}`);
  console.log(`    ${RED}⚠ RISCO: Se o resultado foi liberado em abril mas o scraper está rodando em julho,${RESET}`);
  console.log(`    ${RED}   o filtro bymonth=1 pode fazer o portal retornar 0 resultados.${RESET}`);
  console.log(`    Solução: adicionar bymonth=0 como fallback ou tentar sem filtro de mês.`);

  // 3. Threshold do PDF
  console.log(`\n  ${BOLD}[Config 3] Threshold de tamanho do PDF (> 5000 bytes)${RESET}`);
  info('O scraper rejeita PDFs com ≤ 5000 bytes. PDFs válidos de laboratório geralmente têm > 20KB.');

  // 4. Campo de busca no datatable
  console.log(`\n  ${BOLD}[Config 4] Campo de busca no datatable.php${RESET}`);
  info('columns[2][search][value] = nome do paciente');
  info('column[2] corresponde ao campo de texto livre da busca');
  info('A API retorna aaData com arrays: [id, code, date, name, ...]');

  // 5. Estrutura do downloadReport
  console.log(`\n  ${BOLD}[Config 5] Estrutura de downloadReport${RESET}`);
  info('O scraper lê: patientData[0]=id, patientData[1]=code, patientData[3]=name');
  warn('Se a estrutura das colunas da resposta mudou no portal, os índices podem estar errados');
  console.log(`    ${DIM}Verificar: o campo name está mesmo em row[3]?${RESET}`);

  // 6. Integração com a fila de exames pendentes
  console.log(`\n  ${BOLD}[Config 6] Integração do resultado com o documento${RESET}`);
  info('Após download, o scraper chama ExamMatcherService.matchExams()');
  info('Se matchedCodigos.length === 0, nenhuma atualização é feita no MongoDB');
  info('Os exames do caso têm grupo "Laboratório" → normaliza para "LABORATORIO"');
  info('O scraper Worklab busca por allowedGroups: ["Laboratório", "LABORATORIO"]');
}

// ─── PONTO DE ENTRADA PRINCIPAL ───────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${CYAN}`);
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║      DIAGNÓSTICO WORKLAB SCRAPER — CMSO360                          ║');
  console.log('║      Caso: ARTHUR JARDIM OLIVEIRA (Laborqualy / Exames fezes)       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}`);

  console.log(`  ${BOLD}Paciente:${RESET} ${PATIENT.nome}`);
  console.log(`  ${BOLD}CPF:${RESET} ${PATIENT.cpf}`);
  console.log(`  ${BOLD}Agendamento:${RESET} ${PATIENT.dataAgendamento}`);
  console.log(`  ${BOLD}Nascimento:${RESET} ${PATIENT.dataNascimento}`);
  console.log(`\n  ${BOLD}Exames aguardando resultado:${RESET}`);
  PENDING_EXAMS.forEach((e) => {
    console.log(`    • ${e.codigoExame} — ${e.nomeExame.substring(0, 70)}... [${e.grupo}]`);
  });

  // Diagnóstico estático dos parâmetros
  doDiagnoseScraperParams();

  // Tentar conectar com o Worklab
  section('INICIANDO CONEXÃO COM O WORKLAB');
  const loggedIn = await doLogin();
  if (!loggedIn) {
    fail('Não foi possível fazer login. Verifique as credenciais WORKLAB_* no .env');
    console.log('\n');
    return;
  }

  // Buscar o paciente com todas as variantes
  const variants = buildNameSearchVariants(PATIENT.nome);
  let allCandidates = [];

  for (const variant of variants) {
    const matches = await doSearchPatient(variant);
    if (matches.length > 0) {
      allCandidates = matches;
      break; // Parar na primeira variante que encontrar resultados (mesmo comportamento do scraper)
    }
  }

  if (allCandidates.length === 0) {
    section('RESULTADO FINAL');
    fail('Nenhum candidato encontrado no Worklab para este paciente.');

    console.log(`\n  ${BOLD}${RED}CONCLUSÃO: O resultado não está sendo vinculado porque o Worklab${RESET}`);
    console.log(`  ${RED}não retorna o paciente na busca. Causas prováveis:${RESET}`);
    console.log('');
    console.log(`    ${YELLOW}1. BYMONTH FILTER:${RESET} O parâmetro bymonth=1 filtra apenas resultados do`);
    console.log(`       mês atual. Como o agendamento é 20/04/2026 e já estamos em outro mês,`);
    console.log(`       o resultado pode estar sendo filtrado pelo portal.`);
    console.log(`       → CORREÇÃO: Adicionar fallback com bymonth=0 quando bymonth=1 retornar vazio.`);
    console.log('');
    console.log(`    ${YELLOW}2. RESULTADO NÃO LIBERADO:${RESET} O laboratório Laborqualy pode ainda não ter`);
    console.log(`       liberado/enviado o resultado para o portal Worklab.`);
    console.log('');
    console.log(`    ${YELLOW}3. CREDENCIAIS:${RESET} As credenciais atuais podem ser de outra filial/cliente,`);
    console.log(`       que não tem acesso a este resultado.`);
    console.log('');
    console.log(`    ${YELLOW}4. NOME DIFERENTE:${RESET} O resultado pode estar cadastrado com nome diferente`);
    console.log(`       no portal (abreviado, com erro de digitação, etc.).`);
    console.log('');

    // Tentar busca sem filtro de mês (bymonth=0)
    await doSearchWithoutMonthFilter();

    return;
  }

  // Tentar download de cada candidato
  let anySuccess = false;
  for (const candidate of allCandidates) {
    const pdfBuffer = await doDownloadReport(candidate);
    if (pdfBuffer) {
      anySuccess = true;
      const text = await doAnalyzePdf(pdfBuffer);

      section('RESULTADO FINAL');
      if (text.trim().length > 0) {
        ok('Pipeline completa: login → busca → download → análise');
        console.log('\n  Verifique as verificações acima para identificar o ponto de falha.');
      }
      break;
    }
  }

  if (!anySuccess) {
    section('RESULTADO FINAL');
    fail('Download do laudo falhou para todos os candidatos encontrados.');
    console.log(`    ${YELLOW}O paciente foi encontrado no portal mas o download retornou buffer vazio/inválido.${RESET}`);
  }

  console.log('\n');
}

// ─── BUSCA SEM FILTRO DE MÊS (DIAGNÓSTICO ADICIONAL) ─────────────────────────

async function doSearchWithoutMonthFilter() {
  section('DIAGNÓSTICO ADICIONAL: BUSCA SEM FILTRO DE MÊS (bymonth=0)');
  info('Testando se o resultado aparece sem o filtro mensal...');

  const nameTrimmed = PATIENT.nome.trim();
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
    `length=25`,
    `bymonth=0`,   // ← diferença: sem filtro de mês
  ].join('&');

  const url = `${WORKLAB_CONFIG.baseUrl}/datatable.php?${query}`;
  info(`URL (bymonth=0): ${url.substring(0, 100)}...`);

  try {
    const res = await axios.get(url, {
      headers: {
        Cookie: getCookieString(),
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: `${WORKLAB_CONFIG.baseUrl}/pacientes-data.php`,
      },
      timeout: 30000,
    });

    const data = res.data;
    if (!data || !data.aaData) {
      warn('Resposta inesperada sem aaData');
      return;
    }

    info(`Total de registros sem filtro mensal: ${data.aaData.length}`);
    const matches = data.aaData.filter((row) => matchesByNameTokens(String(row[3] || '').trim(), nameTrimmed));

    if (matches.length > 0) {
      ok(`${matches.length} candidato(s) encontrado(s) SEM filtro de mês!`);
      console.log(`\n  ${RED}${BOLD}⚠ PROBLEMA CONFIRMADO: O parâmetro bymonth=1 está bloqueando os resultados!${RESET}`);
      console.log(`  O scraper usa bymonth=1 mas os resultados só aparecem com bymonth=0.`);
      console.log(`\n  ${BOLD}SOLUÇÃO RECOMENDADA:${RESET}`);
      console.log(`    Modificar o WorklabScraper para tentar bymonth=0 quando bymonth=1 retornar vazio.`);
      matches.forEach((row, i) => {
        const id = row[0] ?? '?';
        const code = row[1] ?? '?';
        const date = row[2] ?? '?';
        const rowName = String(row[3] || '').trim();
        console.log(`    [${i}] id=${id} | code=${code} | date=${date} | name="${rowName}"`);
      });
    } else {
      warn('Nenhum candidato encontrado mesmo sem filtro de mês.');
      if (data.aaData.length > 0) {
        console.log(`\n  Registros retornados (sem match de nome):`);
        data.aaData.slice(0, 5).forEach((row, i) => {
          console.log(`    [${i}] name="${String(row[3] || '').trim()}" date=${row[2] ?? '?'}`);
        });
      }
    }
  } catch (error) {
    fail(`Erro na busca sem filtro de mês: ${error.message}`);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Erro inesperado: ${err.message}${RESET}`);
  if (VERBOSE) console.error(err.stack);
  process.exit(1);
});
