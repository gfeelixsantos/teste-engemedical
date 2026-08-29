/**
 * ============================================================
 *  SCRIPT DE DIAGNÓSTICO — Casos de Erro do Scraper
 * ============================================================
 *
 * Simula o fluxo real do scraper para dois casos problemáticos:
 *
 * Caso 1: VITOR EDUARDO GOMES MIRANDA (ECG, 15/05/2026, CEDASA)
 *   Erro: ECG de 13/05/2025 foi anexado (laudo de ano errado)
 *
 * Caso 2: GUSTAVO CASTRO SANTOS (EEG, 07/05/2026, CEDASA)
 *   Erro: EEG de 27/03/2026 da empresa RUY ROCHA foi anexado
 *
 * Como executar (da pasta engemedical-connect-backend):
 *   chcp 65001 && node -r ts-node/register -r tsconfig-paths/register scripts/test-scraper-casos-erro.ts
 * ============================================================
 */

import 'dotenv/config';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { buildMedicalNameSearchVariants } from '../src/scrapers/utils/name-normalization.util';

// ─── Utilitários ─────────────────────────────────────────────────────────────

function hr(char = '─', len = 70) { return char.repeat(len); }

function parseDateParts(value?: string): { day: number; month: number; year: number } | null {
  if (!value) return null;
  const m = value.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (!m) return null;
  return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
}

function dayDistance(a?: string, b?: string): number | null {
  const pa = parseDateParts(a);
  const pb = parseDateParts(b);
  if (!pa || !pb) return null;
  const da = Date.UTC(pa.year, pa.month - 1, pa.day);
  const db = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

function normalizePersonName(value: string): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function splitNameTokens(value: string): string[] {
  return normalizePersonName(value).split(' ').filter((t) => t.length >= 2);
}

function countMatchedTokens(referenceName: string, candidateName: string): number {
  const refTokens = splitNameTokens(referenceName);
  const candNorm = normalizePersonName(candidateName);
  return refTokens.filter((t) => candNorm.includes(t)).length;
}

// ─── Análise de candidatos ────────────────────────────────────────────────────

interface CandidateAnalysis {
  position: number;
  id: string;
  patientName: string;
  date: string;
  status: string;
  matchedTokens: number;
  totalReferenceTokens: number;
  dayDistance: number | null;
  sameYear: boolean;
  verdict: 'CORRETO' | 'ERRADO' | 'INCERTO';
  verdictReason: string;
}

function analyzeCandidates(
  referenceName: string,
  appointmentDate: string,
  expectedYear: number,
  candidates: any[],
): CandidateAnalysis[] {
  const refTokens = splitNameTokens(referenceName);
  const appt = parseDateParts(appointmentDate);

  return candidates.map((c, i) => {
    const matched = countMatchedTokens(referenceName, c.patientName || '');
    const cDate = parseDateParts(c.date);
    const dist = dayDistance(appointmentDate, c.date);
    const sameYear = !!appt && !!cDate && appt.year === cDate.year;

    let verdict: 'CORRETO' | 'ERRADO' | 'INCERTO' = 'INCERTO';
    let verdictReason = '';

    if (matched === 0) {
      // No Medical, patientName é o nome do exame — matchedTokens=0 é esperado.
      // O filtro por grupo já foi aplicado pelo scraper. Avaliar apenas por data.
      if (cDate && cDate.year !== expectedYear) {
        verdict = 'ERRADO';
        verdictReason = `Exame do grupo correto mas ano do laudo (${cDate.year}) diferente do agendamento (${expectedYear})`;
      } else if (sameYear && dist !== null && dist <= 45) {
        verdict = 'CORRETO';
        verdictReason = `Exame do grupo correto, mesmo ano e data proxima (${dist.toFixed(0)} dias)`;
      } else {
        verdict = 'INCERTO';
        verdictReason = `Exame do grupo correto mas distancia ${dist?.toFixed(0) ?? '?'} dias`;
      }
    } else if (cDate && cDate.year !== expectedYear) {
      verdict = 'ERRADO';
      verdictReason = `Ano do laudo (${cDate.year}) diferente do agendamento (${expectedYear})`;
    } else if (sameYear && dist !== null && dist <= 45) {
      verdict = 'CORRETO';
      verdictReason = `Nome coincide (${matched}/${refTokens.length} tokens) e data proxima (${dist.toFixed(0)} dias, mesmo ano)`;
    } else if (matched >= refTokens.length && sameYear) {
      verdict = 'CORRETO';
      verdictReason = `Nome exato (${matched}/${refTokens.length} tokens) e mesmo ano`;
    } else {
      verdict = 'INCERTO';
      verdictReason = `Nome parcial (${matched}/${refTokens.length} tokens), distancia ${dist?.toFixed(0) ?? '?'} dias`;
    }

    return {
      position: i + 1,
      id: String(c.id || ''),
      patientName: String(c.patientName || ''),
      date: String(c.date || ''),
      status: String(c.status || ''),
      matchedTokens: matched,
      totalReferenceTokens: refTokens.length,
      dayDistance: dist,
      sameYear,
      verdict,
      verdictReason,
    };
  });
}

// ─── Execução de um caso ──────────────────────────────────────────────────────

async function runCase(params: {
  caseNumber: number;
  patientName: string;
  examType: string;
  appointmentDate: string;
  company: string;
  errorDescription: string;
  expectedYear: number;
  pendingGroups: string[];
  scraper: MedicalScraper;
}) {
  const { caseNumber, patientName, examType, appointmentDate, company, errorDescription, expectedYear, pendingGroups, scraper } = params;

  console.log(`\n${hr('=')}`);
  console.log(`CASO ${caseNumber}: ${patientName}`);
  console.log(`Tipo: ${examType} | Agendamento: ${appointmentDate} | Empresa: ${company}`);
  console.log(`Grupos pendentes: ${pendingGroups.join(', ')}`);
  console.log(`Erro identificado: ${errorDescription}`);
  console.log(hr('='));

  const variants = [...new Set(buildMedicalNameSearchVariants(patientName))];
  console.log(`\nVariantes de busca: ${variants.map((v) => `"${v}"`).join(', ')}`);

  let allCandidates: any[] = [];
  let successfulQuery = '';

  for (const query of variants) {
    console.log(`\n  Buscando: "${query}"...`);
    try {
      const results = await (scraper as any).searchPatient(query, {
        appointmentDate,
        schedulingId: `TESTE_CASO_${caseNumber}`,
        pendingGroups,
      });
      if (Array.isArray(results) && results.length > 0) {
        allCandidates = results;
        successfulQuery = query;
        console.log(`  OK: ${results.length} candidato(s) encontrado(s)`);
        break;
      } else {
        console.log(`  Sem resultado para "${query}"`);
      }
    } catch (err: any) {
      console.log(`  ERRO na busca: ${err.message}`);
    }
  }

  if (allCandidates.length === 0) {
    console.log(`\nRESULTADO: Nenhum candidato encontrado — scraper retornaria array vazio`);
    console.log(`Comportamento atual: NAO ANEXARIA nada`);
    return;
  }

  console.log(`\nQuery bem-sucedida: "${successfulQuery}"`);
  console.log(`\n${hr('-')}`);
  console.log(`CANDIDATOS RETORNADOS (ordem original do portal — sem reordenacao por data)`);
  console.log(hr('-'));

  const analyses = analyzeCandidates(patientName, appointmentDate, expectedYear, allCandidates);

  for (const a of analyses) {
    const icon = a.verdict === 'CORRETO' ? '[OK]' : a.verdict === 'ERRADO' ? '[XX]' : '[??]';
    console.log(`\n  [${a.position}] ${icon} ${a.patientName}`);
    console.log(`       ID: ${a.id}`);
    console.log(`       Data laudo: ${a.date || '(sem data)'} | Status: ${a.status || '(sem status)'}`);
    console.log(`       Tokens: ${a.matchedTokens}/${a.totalReferenceTokens} | Distancia: ${a.dayDistance?.toFixed(0) ?? '?'} dias | Mesmo ano: ${a.sameYear ? 'SIM' : 'NAO'}`);
    console.log(`       Veredicto: ${a.verdict} — ${a.verdictReason}`);
  }

  const selected = analyses[0];
  const selectedIcon = selected.verdict === 'CORRETO' ? '[OK]' : selected.verdict === 'ERRADO' ? '[XX]' : '[??]';

  console.log(`\n${hr('-')}`);
  console.log(`CANDIDATO SELECIONADO (posicao 1 — implementacao atual sem ranking):`);
  console.log(`${selectedIcon} "${selected.patientName}" | Data: ${selected.date} | Tokens: ${selected.matchedTokens}/${selected.totalReferenceTokens}`);

  if (selected.verdict === 'CORRETO') {
    console.log(`\n>>> IMPLEMENTACAO ATUAL: ACERTARIA este caso`);
    console.log(`    Razao: ${selected.verdictReason}`);
  } else if (selected.verdict === 'ERRADO') {
    console.log(`\n>>> IMPLEMENTACAO ATUAL: ERRARIA este caso`);
    console.log(`    Razao: ${selected.verdictReason}`);
    const correctCandidate = analyses.find((a, i) => i > 0 && a.verdict === 'CORRETO');
    if (correctCandidate) {
      console.log(`    ATENCAO: Candidato correto existe na posicao ${correctCandidate.position}: "${correctCandidate.patientName}" (${correctCandidate.date})`);
    } else {
      console.log(`    Nenhum candidato claramente correto entre os ${analyses.length} resultados`);
    }
  } else {
    console.log(`\n>>> IMPLEMENTACAO ATUAL: INCERTO — requer analise do PDF`);
    console.log(`    Razao: ${selected.verdictReason}`);
  }

  const corretos = analyses.filter((a) => a.verdict === 'CORRETO').length;
  const errados = analyses.filter((a) => a.verdict === 'ERRADO').length;
  const incertos = analyses.filter((a) => a.verdict === 'INCERTO').length;
  console.log(`\nResumo: ${corretos} correto(s) | ${errados} errado(s) | ${incertos} incerto(s) de ${analyses.length} candidatos`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if ((process.stdout as any).reconfigure) (process.stdout as any).reconfigure({ encoding: 'utf8' });
  if ((process.stderr as any).reconfigure) (process.stderr as any).reconfigure({ encoding: 'utf8' });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`DIAGNOSTICO DE CASOS DE ERRO — SCRAPER MEDICAL`);
  console.log(`Implementacao: sem rankDateAwareCandidates (pos-bugfix)`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\nIniciando login no portal Medical...`);

  const scraper = new MedicalScraper();

  try {
    await scraper.login();
    console.log(`Login realizado com sucesso\n`);
  } catch (err: any) {
    console.error(`FALHA no login: ${err.message}`);
    process.exit(1);
  }

  // Caso 1: ECG de 2025 anexado ao agendamento de 2026
  // Medical processa: EEG, ECG, RAIOX
  await runCase({
    caseNumber: 1,
    patientName: 'VITOR EDUARDO GOMES MIRANDA',
    examType: 'ECG (PERIODICO)',
    appointmentDate: '15/05/2026',
    company: 'CEDASA INDUSTRIA E COMERCIO DE PISOS LTDA',
    errorDescription: 'ECG de 13/05/2025 foi anexado (laudo de ano anterior ao agendamento 2026)',
    expectedYear: 2026,
    pendingGroups: ['ECG'],
    scraper,
  });

  // Caso 2: EEG da empresa RUY ROCHA anexado ao agendamento da CEDASA
  // Medical processa: EEG, ECG, RAIOX
  await runCase({
    caseNumber: 2,
    patientName: 'GUSTAVO CASTRO SANTOS',
    examType: 'EEG (ADMISSIONAL)',
    appointmentDate: '07/05/2026',
    company: 'CEDASA INDUSTRIA E COMERCIO DE PISOS LTDA',
    errorDescription: 'EEG de 27/03/2026 da empresa RUY ROCHA foi anexado (empresa errada)',
    expectedYear: 2026,
    pendingGroups: ['EEG'],
    scraper,
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`DIAGNOSTICO CONCLUIDO`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\nLegenda:`);
  console.log(`  [OK] ACERTARIA  — candidato na posicao 1 e o correto`);
  console.log(`  [XX] ERRARIA    — candidato na posicao 1 e incorreto (ano errado, etc.)`);
  console.log(`  [??] INCERTO    — nao e possivel determinar sem baixar o PDF`);
  console.log(`\nNota: A implementacao atual retorna candidatos na ORDEM ORIGINAL do portal.`);
  console.log(`O primeiro candidato da lista e sempre o selecionado para download.\n`);
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  console.error(err.stack);
  process.exitCode = 1;
});
