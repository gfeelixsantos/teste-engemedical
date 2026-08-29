/**
 * ============================================================
 *  SCRIPT DE DIAGNÓSTICO — RAIO-X / Coluna / Tórax
 * ============================================================
 *
 * Funcionalidades:
 *   --scheduling-id=ID   Testar um agendamento específico pelo _id do MongoDB
 *   --provider=NAME      Testar um provider específico (Medical, Veitieka, ou ambos)
 *   (sem parâmetros)     Busca os 5 primeiros agendamentos RAIOX pendentes
 *
 * 1. Busca no MongoDB schedulings com exames RAIOX AGUARDANDO_RESULTADO
 * 2. Loga no(s) provider(s) e busca o paciente
 * 3. Baixa o PDF e extrai texto
 * 4. Testa cada gate: year, identity, text evidence, classification, confidence
 * 5. NADA é persistido
 *
 * Executar (da pasta cmso360-backend):
 *   chcp 65001 && node -r ts-node/register -r tsconfig-paths/register scripts/test-scraper-raiox.ts
 *   chcp 65001 && node -r ts-node/register -r tsconfig-paths/register scripts/test-scraper-raiox.ts --scheduling-id=69cd13e2beb977ee9b8f029e
 *   chcp 65001 && node -r ts-node/register -r tsconfig-paths/register scripts/test-scraper-raiox.ts --provider=Veitieka
 * ============================================================
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { VeitiekaScraper } from '../src/scrapers/providers/veitieka.scraper';
import {
  buildMedicalNameSearchVariants,
  buildNameSearchVariants,
} from '../src/scrapers/utils/name-normalization.util';
import { normalizeScraperGroup } from '../src/scrapers/utils/group-normalization.util';
import {
  getYearEvidenceDecision,
  hasMinimumIdentityEvidence,
  getSignificantExamTokens,
  hasRaioxTextEvidence,
  hasAcceptedClassification,
  getMinimumConfidence,
  getTextEvidenceEvaluator,
  normalizeString,
} from '../src/scrapers/exam-matcher.service';
import { getPatientNameTokens, extractDigits } from '../src/scrapers/exam-matcher.service';

// ─── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs(): { schedulingId?: string; provider?: string } {
  const args = process.argv.slice(2);
  let schedulingId: string | undefined;
  let provider: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--scheduling-id=')) {
      schedulingId = arg.split('=')[1];
    } else if (arg.startsWith('--provider=')) {
      provider = arg.split('=')[1];
    }
  }

  return { schedulingId, provider };
}

const { schedulingId: ARG_SCHEDULING_ID, provider: ARG_PROVIDER } = parseArgs();

// ─── Config ──────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URL || 'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/';
const MONGO_DB = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';

const RAIOX_PENDING_GROUPS = ['RAIOX'];
const MAX_SCHEDULINGS = ARG_SCHEDULING_ID ? 1 : 5;

// ─── Utilitários ────────────────────────────────────────────────────────────

function hr(char = '─', len = 80) { return char.repeat(len); }

function parseDateParts(value?: string): { day: number; month: number; year: number } | null {
  if (!value) return null;
  const m = value.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (!m) return null;
  return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
}

function extractYear(value?: string): number | null {
  const p = parseDateParts(value);
  return p ? p.year : null;
}

// ─── Provider wrappers ───────────────────────────────────────────────────────

type ProviderScraper = {
  name: string;
  login: () => Promise<void>;
  searchPatient: (name: string, context?: any) => Promise<any[]>;
  downloadReport: (result: any) => Promise<Buffer | null>;
};

function createScrapers(): ProviderScraper[] {
  const providers: ProviderScraper[] = [];

  if (!ARG_PROVIDER || ARG_PROVIDER.toLowerCase() === 'medical') {
    providers.push({
      name: 'Medical',
      login: async () => { await new MedicalScraper().login(); },
      searchPatient: async (name, ctx) => {
        const scraper = new MedicalScraper();
        return scraper.searchPatient(name, ctx);
      },
      downloadReport: async (result) => {
        const scraper = new MedicalScraper();
        return scraper.downloadReport(result);
      },
    });
  }

  if (!ARG_PROVIDER || ARG_PROVIDER.toLowerCase() === 'veitieka') {
    providers.push({
      name: 'Veitieka',
      login: async () => { await new VeitiekaScraper().login(); },
      searchPatient: async (name, ctx) => {
        const scraper = new VeitiekaScraper();
        return scraper.searchPatient(name, ctx);
      },
      downloadReport: async (result) => {
        const scraper = new VeitiekaScraper();
        return scraper.downloadReport(result);
      },
    });
  }

  return providers;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if ((process.stdout as any).reconfigure) (process.stdout as any).reconfigure({ encoding: 'utf8' });

  console.log(`\n${hr('=')}`);
  console.log(`DIAGNÓSTICO RAIO-X — SCRAPER`);
  console.log(`${hr('=')}`);

  if (ARG_SCHEDULING_ID) {
    console.log(`Modo: agendamento específico (${ARG_SCHEDULING_ID})`);
  }
  if (ARG_PROVIDER) {
    console.log(`Provider: ${ARG_PROVIDER}`);
  }
  console.log('');

  // 1. Conectar MongoDB
  console.log(`[1/5] Conectando ao MongoDB...`);
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const collection = mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION);
  console.log(`      OK: MongoDB conectado (${MONGO_DB}/${MONGO_COLLECTION})\n`);

  // 2. Buscar schedulings
  console.log(`[2/5] Buscando agendamentos...`);
  let filter: any;

  if (ARG_SCHEDULING_ID) {
    try {
      filter = { _id: new ObjectId(ARG_SCHEDULING_ID) };
    } catch {
      console.error(`      ERRO: scheduling-id inválido: ${ARG_SCHEDULING_ID}`);
      await mongoClient.close();
      process.exit(1);
    }
  } else {
    filter = {
      EXAMES: {
        $elemMatch: {
          status: 'AGUARDANDO_RESULTADO',
          grupo: { $regex: /raio.?x|rx/i },
        },
      },
    };
  }

  const schedulings = await collection
    .find(filter)
    .project({
      _id: 1,
      NOME: 1,
      CPFFUNCIONARIO: 1,
      DATANASCIMENTO: 1,
      DATAAGENDAMENTO: 1,
      NOMEEMPRESA: 1,
      EXAMES: 1,
    })
    .limit(MAX_SCHEDULINGS)
    .toArray();

  console.log(`      Encontrados ${schedulings.length} agendamento(s)\n`);

  if (schedulings.length === 0) {
    console.log(`Nenhum agendamento encontrado.`);
    await mongoClient.close();
    return;
  }

  // 3. Login nos providers
  console.log(`[3/5] Fazendo login nos providers...`);
  const providers = createScrapers();
  const activeProviders: Array<{ scraper: ProviderScraper; logged: boolean }> = [];

  for (const provider of providers) {
    try {
      await provider.login();
      console.log(`      OK: ${provider.name} logado`);
      activeProviders.push({ scraper: provider, logged: true });
    } catch (err: any) {
      console.error(`      FALHA: ${provider.name} — ${err.message}`);
      activeProviders.push({ scraper: provider, logged: false });
    }
  }
  console.log('');

  const workingProviders = activeProviders.filter((p) => p.logged);
  if (workingProviders.length === 0) {
    console.error(`Nenhum provider disponível. Abortando.`);
    await mongoClient.close();
    process.exit(1);
  }

  // 4. Diagnosticar cada agendamento
  console.log(`[4/5] Executando diagnóstico...\n`);

  let totalComPDF = 0;
  let totalTextEvidenceOK = 0;
  let totalMatchOK = 0;

  for (let i = 0; i < schedulings.length; i++) {
    const doc = schedulings[i] as any;
    const patientName = doc.NOME;
    const appointmentDate = doc.DATAAGENDAMENTO;
    const company = doc.NOMEEMPRESA || 'N/I';

    const raioxExams = (doc.EXAMES || []).filter(
      (ex: any) =>
        (ex.status === 'AGUARDANDO_RESULTADO' || ARG_SCHEDULING_ID) &&
        normalizeScraperGroup(ex.grupo || '') === 'RAIOX',
    );

    console.log(`${hr('=')}`);
    console.log(`#${i + 1}: ${patientName}`);
    console.log(`    Scheduling ID: ${doc._id}`);
    console.log(`    Agendamento: ${appointmentDate} | Empresa: ${company}`);
    console.log(`    CPF: ${doc.CPFFUNCIONARIO || 'N/I'} | Nascimento: ${doc.DATANASCIMENTO || 'N/I'}`);
    console.log(`    Exames RAIOX pendentes: ${raioxExams.length}`);
    for (const ex of raioxExams) {
      const tokens = getSignificantExamTokens(ex.nomeExame);
      console.log(`      [${ex.codigoExame}] ${ex.nomeExame}`);
      console.log(`        Grupo: ${ex.grupo} → normalizado: ${normalizeScraperGroup(ex.grupo || '')}`);
      console.log(`        Tokens: [${tokens.join(', ')}] (requer ${Math.ceil(tokens.length * 0.6)}/${tokens.length})`);
    }

    // Tentar cada provider
    let foundPdf = false;

    for (const { scraper: provider } of workingProviders) {
      if (foundPdf) break;

      console.log(`\n    ── Provider: ${provider.name} ──`);

      // Buscar paciente
      const variants =
        provider.name === 'Medical'
          ? [...new Set(buildMedicalNameSearchVariants(patientName))]
          : buildNameSearchVariants(patientName);

      let candidates: any[] = [];
      let successfulQuery = '';

      for (const query of variants) {
        try {
          const results = await provider.searchPatient(query, {
            appointmentDate,
            schedulingId: `TEST_RAIOX_${i}`,
            pendingGroups: RAIOX_PENDING_GROUPS,
          });
          if (Array.isArray(results) && results.length > 0) {
            candidates = results;
            successfulQuery = query;
            break;
          }
        } catch { /* ignore */ }
      }

      if (candidates.length === 0) {
        console.log(`      Busca: ${variants.length} variantes testadas → NENHUM candidato`);

        // Fallback: buscar por CPF no Medical
        const cpf = (doc as any).CPFFUNCIONARIO;
        if (cpf && provider.name === 'Medical') {
          const cpfClean = cpf.replace(/\D/g, '');
          if (cpfClean.length >= 11) {
            console.log(`      Tentando busca por CPF: ${cpfClean}...`);
            try {
              const cpfResults = await provider.searchPatient(cpfClean, {
                appointmentDate,
                schedulingId: `TEST_RAIOX_${i}`,
                pendingGroups: RAIOX_PENDING_GROUPS,
              });
              if (Array.isArray(cpfResults) && cpfResults.length > 0) {
                candidates = cpfResults;
                successfulQuery = `CPF:${cpfClean}`;
                console.log(`      Busca CPF: "${cpfClean}" → ${candidates.length} candidato(s)`);
                for (let j = 0; j < Math.min(candidates.length, 3); j++) {
                  const c = candidates[j];
                  console.log(`        [${j + 1}] ${c.patientName ?? '?'} | ${c.date ?? '?'} | ${c.status ?? '?'} | score=${typeof c.score === 'number' ? c.score : '?'}`);
                }
              } else {
                console.log(`      Busca CPF: "${cpfClean}" → 0 candidatos`);
              }
            } catch { /* ignore */ }
          }
        }

        if (candidates.length === 0) continue;
      }

      console.log(`      Busca: "${successfulQuery}" → ${candidates.length} candidato(s)`);
      for (let j = 0; j < Math.min(candidates.length, 3); j++) {
        const c = candidates[j];
        console.log(`        [${j + 1}] ${c.patientName ?? '?'} | ${c.date ?? '?'} | ${c.status ?? '?'} | score=${typeof c.score === 'number' ? c.score : '?'}`);
      }

      // Baixar PDF
      const selected = candidates[0];
      let pdfBuffer: Buffer | null = null;
      try {
        pdfBuffer = await provider.downloadReport(selected);
      } catch (err: any) {
        console.log(`      ERRO ao baixar PDF: ${err.message}`);
        continue;
      }

      if (!pdfBuffer) {
        console.log(`      PDF não disponível ou download falhou`);
        continue;
      }

      console.log(`      PDF baixado: ${pdfBuffer.length} bytes`);
      totalComPDF++;

      // Extrair texto
      let reportText = '';
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(pdfBuffer);
        reportText = data?.text ?? '';
        console.log(`      Texto extraído: ${reportText.trim().length} caracteres`);
      } catch (err: any) {
        console.log(`      ERRO ao extrair texto: ${err.message}`);
        continue;
      }

      if (!reportText.trim()) {
        console.log(`      Texto vazio — PDF pode ser imagem/scan`);
        continue;
      }

      // Preview do texto
      const preview = reportText.replace(/\s+/g, ' ').trim().slice(0, 300);
      console.log(`\n      Preview: "${preview}..."`);

      // ── GATES ──
      console.log(`\n    ── GATES ──`);

      // Gate 1: Year
      const yearDecision = getYearEvidenceDecision(reportText, appointmentDate);
      console.log(`    [YEAR] expectedYear=${yearDecision.expectedYear ?? 'n/a'} foundYears=[${yearDecision.foundYears.join(',')}] reason=${yearDecision.reason} hasExactDate=${yearDecision.hasExactAppointmentDate} reject=${yearDecision.shouldReject}`);
      if (yearDecision.shouldReject) {
        console.log(`      >>> BLOQUEADO — ano do PDF não bate com agendamento`);
        continue;
      }

      // Gate 2: Identity
      const patientInfo = {
        nome: patientName,
        cpf: doc.CPFFUNCIONARIO || '',
        dataAgendamento: appointmentDate,
        dataNascimento: doc.DATANASCIMENTO || '',
      };
      const hasIdentity = hasMinimumIdentityEvidence(reportText, patientInfo, 'RAIOX');

      const normalizedReport = normalizeString(reportText);
      const allNameTokens = getPatientNameTokens(patientName);
      const matchedTokens = allNameTokens.filter((t) => normalizedReport.includes(t));
      const missedTokens = allNameTokens.filter((t) => !normalizedReport.includes(t));
      const nameRatio = allNameTokens.length > 0 ? matchedTokens.length / allNameTokens.length : 0;

      const cpfDigits = extractDigits(patientInfo.cpf);
      const reportDigits = extractDigits(reportText);
      const hasCpf = cpfDigits.length >= 11 && reportDigits.includes(cpfDigits);

      const hasBirthDate = reportText.includes(patientInfo.dataNascimento) ||
        reportText.includes(patientInfo.dataNascimento.replace(/\//g, '-'));

      console.log(`    [IDENTITY] hasIdentity=${hasIdentity}`);
      console.log(`      Nome: "${patientName}"`);
      console.log(`      Tokens: [${allNameTokens.join(',')}]`);
      console.log(`      Matched: [${matchedTokens.join(',')}] (${matchedTokens.length}/${allNameTokens.length} = ${(nameRatio * 100).toFixed(0)}%)`);
      if (missedTokens.length > 0) {
        console.log(`      Missed:  [${missedTokens.join(',')}]`);
      }
      console.log(`      hasCpf=${hasCpf} hasBirthDate=${hasBirthDate}`);

      if (!hasIdentity) {
        const strongIdentity = matchedTokens.length >= 2 && (hasCpf || hasBirthDate);
        const fallbackIdentity = matchedTokens.length >= Math.min(3, allNameTokens.length);
        const raiox75 = nameRatio >= 0.75 && (hasCpf || hasBirthDate);
        console.log(`      >>> BLOQUEADO — verificando critérios:`);
        console.log(`        strongIdentity: ${matchedTokens.length >= 2} && (${hasCpf} || ${hasBirthDate}) = ${strongIdentity}`);
        console.log(`        fallbackIdentity: ${matchedTokens.length} >= ${Math.min(3, allNameTokens.length)} = ${fallbackIdentity}`);
        console.log(`        raiox75 (75%+evidência): ${(nameRatio * 100).toFixed(0)}% >= 75% && (${hasCpf} || ${hasBirthDate}) = ${raiox75}`);
        continue;
      }

      // Gate 3: Text Evidence (para cada exame)
      console.log(`    [TEXT_EVIDENCE]`);
      let algumExamePassou = false;
      for (const ex of raioxExams) {
        const hasTE = hasRaioxTextEvidence(reportText, ex.nomeExame);
        const normalizedExam = normalizeString(ex.nomeExame);
        const bodyTokens = normalizedExam
          .replace(/[\(\)\[\]]/g, ' ')
          .split(/\s+/)
          .filter((t: string) =>
            t.length >= 3 &&
            !/^\d+$/.test(t) &&
            !['radiografia', 'padrao', 'oit', 'cod', 'esocial', 'digital'].includes(t) &&
            !['exame', 'exames', 'com', 'sem', 'de', 'do', 'da', 'dos', 'das', 'ou', 'e', 'para', 'total', 'inclui', 'anti', 'ocupacional'].includes(t)
          );
        const matchedBody = bodyTokens.filter((t: string) => normalizedReport.includes(t));
        const hasRxIndicator = /\brx\b/.test(normalizedReport) ||
          normalizedReport.includes('raio') ||
          normalizedReport.includes('radiograf');

        console.log(`      [${ex.codigoExame}] "${ex.nomeExame}"`);
        console.log(`        Body tokens: [${bodyTokens.join(', ')}]`);
        for (const t of bodyTokens) {
          const found = normalizedReport.includes(t);
          console.log(`          "${t}" → ${found ? '✓ ACHOU' : '✗ NÃO ACHOU'}`);
        }
        console.log(`        RX indicator: ${hasRxIndicator ? '✓ SIM' : '✗ NÃO'}`);
        console.log(`        Resultado: ${hasTE ? '✓ PASSOU' : '✗ REPROVOU'} (${matchedBody.length}/${bodyTokens.length} tokens)`);

        if (hasTE) {
          algumExamePassou = true;
        }
      }

      if (algumExamePassou) {
        totalTextEvidenceOK++;
        console.log(`\n      >>> PELO MENOS UM EXAME PASSOU no TEXT_EVIDENCE`);
      } else {
        console.log(`\n      >>> NENHUM EXAME PASSOU no TEXT_EVIDENCE`);
      }

      // Gate 4: Classification + Confidence (simulação)
      console.log(`    [CLASSIFICATION/CONFIDENCE]`);
      console.log(`      Requer classification=RESULT (não REQUESTED_ONLY/UNKNOWN)`);
      console.log(`      Requer confidence >= ${getMinimumConfidence(raioxExams[0])}`);
      console.log(`      (Estes gates são avaliados pela IA — não é possível simular localmente)`);

      // Resumo final deste scheduling
      if (algumExamePassou) {
        totalMatchOK++;
        console.log(`\n    ══ RESULTADO: MATCH OK ══`);
      } else {
        console.log(`\n    ══ RESULTADO: MATCH FALHOU ══`);
      }

      foundPdf = true;
    }

    if (!foundPdf) {
      console.log(`\n    ══ RESULTADO: NENHUM PDF BAIXADO ══`);
    }
  }

  // 5. Resumo
  console.log(`\n${hr('=')}`);
  console.log(`RESUMO GERAL`);
  console.log(`${hr('=')}`);
  console.log(`Agendamentos analisados:        ${schedulings.length}`);
  console.log(`PDFs baixados com sucesso:      ${totalComPDF}`);
  console.log(`Text evidence OK:               ${totalTextEvidenceOK}`);
  console.log(`Match completo OK:              ${totalMatchOK}`);
  console.log(`\nLegenda:`);
  console.log(`  YEAR bloqueou       → ano do PDF não bate com agendamento`);
  console.log(`  IDENTITY bloqueou   → nome/CPF/data não encontrados no texto`);
  console.log(`  TEXT_EVIDENCE barrou → tokens do exame não aparecem no PDF`);
  console.log(`  CLASSIFICATION      → IA classificou como REQUESTED_ONLY/UNKNOWN`);
  console.log(`  CONFIDENCE          → IA retornou confiança abaixo do mínimo`);
  console.log(`${hr('=')}\n`);

  await mongoClient.close();
  console.log(`Conexão MongoDB fechada. Diagnóstico concluído.`);
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  console.error(err.stack);
  process.exitCode = 1;
});
