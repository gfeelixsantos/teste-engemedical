/**
 * ============================================================
 *  SIMULAÇÃO COMPLETA DO CRON — VEITIEKA
 * ============================================================
 *
 * Reproduz exatamente o fluxo de scraper.service.ts para Veitieka:
 *   1. Busca agendamentos com RAIOX pendente no MongoDB
 *   2. Login no Veitieka
 *   3. Para cada funcionário: busca por nome (variantes)
 *   4. Para cada candidato: baixa PDF, extrai texto, valida gates
 *   5. NADA é persistido (simulação read-only)
 *
 * Executar (da pasta engemedical-connect-backend):
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/test-veitieka-cron-sim.ts
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/test-veitieka-cron-sim.ts --scheduling-id=6a3d5fcdf67b38d421f9bcf1
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/test-veitieka-cron-sim.ts --max=10
 * ============================================================
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { VeitiekaScraper } from '../src/scrapers/providers/veitieka.scraper';
import {
  buildNameSearchVariants,
} from '../src/scrapers/utils/name-normalization.util';
import {
  matchesAllowedGroups,
  normalizeScraperGroup,
} from '../src/scrapers/utils/group-normalization.util';
import {
  getYearEvidenceDecision,
  hasMinimumIdentityEvidence,
  hasRaioxTextEvidence,
  getSignificantExamTokens,
  getMinimumConfidence,
  getTextEvidenceEvaluator,
  normalizeString,
  getPatientNameTokens,
  extractDigits,
} from '../src/scrapers/exam-matcher.service';

// ─── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs(): { schedulingId?: string; max?: number } {
  const args = process.argv.slice(2);
  let schedulingId: string | undefined;
  let max: number | undefined;
  for (const arg of args) {
    if (arg.startsWith('--scheduling-id=')) schedulingId = arg.split('=')[1];
    if (arg.startsWith('--max=')) max = Number(arg.split('=')[1]);
  }
  return { schedulingId, max };
}

const { schedulingId: ARG_SCHEDULING_ID, max: ARG_MAX } = parseArgs();

// ─── Config ──────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URL || 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/';
const MONGO_DB = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';

const RAIOX_ALLOWED_GROUPS = ['Raio-X', 'RAIOX'];
const MAX_SCHEDULINGS = ARG_MAX || 5;

function hr(char = '─', len = 80) { return char.repeat(len); }

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if ((process.stdout as any).reconfigure) (process.stdout as any).reconfigure({ encoding: 'utf8' });

  console.log(`\n${hr('=')}`);
  console.log(`SIMULAÇÃO CRON COMPLETA — VEITIEKA`);
  console.log(`${hr('=')}\n`);

  // 1. MongoDB
  console.log(`[1/6] Conectando ao MongoDB...`);
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const collection = mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION);
  console.log(`      OK\n`);

  // 2. Buscar agendamentos (exatamente como scraper.service.ts)
  console.log(`[2/6] Buscando agendamentos com RAIOX pendente...`);
  let filter: any;
  if (ARG_SCHEDULING_ID) {
    filter = { _id: new ObjectId(ARG_SCHEDULING_ID) };
  } else {
    // Inclui tanto AGUARDANDO_RESULTADO quanto PENDENTE
    filter = {
      'EXAMES.status': { $in: ['AGUARDANDO_RESULTADO', 'PENDENTE'] },
      'EXAMES.grupo': { $regex: /raio.?x|rx/i },
    };
  }

  const allPending = await collection
    .find(filter)
    .sort({ _id: 1 })
    .limit(MAX_SCHEDULINGS + 50)
    .toArray();

  // Filtra apenas docs que têm RAIOX pendente (como getPendingExamsByAllowedGroups)
  const schedulings = allPending.filter((doc: any) => {
    const pending = (doc.EXAMES || []).filter(
      (ex: any) => ['AGUARDANDO_RESULTADO', 'PENDENTE'].includes(ex.status) && matchesAllowedGroups(ex.grupo ?? '', RAIOX_ALLOWED_GROUPS),
    );
    return pending.length > 0;
  }).slice(0, MAX_SCHEDULINGS);

  console.log(`      Encontrados ${schedulings.length} agendamento(s) com RAIOX pendente\n`);

  if (schedulings.length === 0) {
    console.log(`Nenhum agendamento pendente. Abortando.`);
    await mongoClient.close();
    return;
  }

  // 3. Login Veitieka
  console.log(`[3/6] Fazendo login no Veitieka...`);
  const scraper = new VeitiekaScraper();
  await scraper.login();
  console.log(`      OK\n`);

  // 4. Processar cada agendamento (replicando processBatch)
  console.log(`[4/6] Processando agendamentos...\n`);

  let totalProcessed = 0;
  let totalFound = 0;
  let totalDownloaded = 0;
  let totalMatched = 0;
  let totalRejectedYear = 0;
  let totalRejectedIdentity = 0;
  let totalRejectedTextEvidence = 0;

  for (let i = 0; i < schedulings.length; i++) {
    const doc = schedulings[i] as any;
    const patientName = doc.NOME;
    const appointmentDate = doc.DATAAGENDAMENTO;
    const company = doc.NOMEEMPRESA || 'N/I';
    const cpf = doc.CPFFUNCIONARIO || '';
    const birthDate = doc.DATANASCIMENTO || '';

    // getPendingExamsByAllowedGroups (replicado)
    const pendingExams: any[] = (doc.EXAMES || []).filter(
      (ex: any) => ['AGUARDANDO_RESULTADO', 'PENDENTE'].includes(ex.status) && matchesAllowedGroups(ex.grupo ?? '', RAIOX_ALLOWED_GROUPS),
    );
    const pendingGroups: string[] = [...new Set(pendingExams.map((ex: any) => normalizeScraperGroup(ex.grupo)))];

    console.log(`${hr('=')}`);
    console.log(`#${i + 1}/${schedulings.length}: ${patientName}`);
    console.log(`  Scheduling: ${doc._id}`);
    console.log(`  Agendamento: ${appointmentDate} | Empresa: ${company}`);
    console.log(`  CPF: ${cpf} | Nascimento: ${birthDate}`);
    console.log(`  PendingGroups: [${pendingGroups.join(', ')}]`);
    console.log(`  Exames pendentes: ${pendingExams.length}`);
    for (const ex of pendingExams) {
      const tokens = getSignificantExamTokens(ex.nomeExame);
      console.log(`    [${ex.codigoExame}] ${ex.nomeExame}`);
      console.log(`      Tokens: [${tokens.join(', ')}]`);
    }
    totalProcessed++;

    // searchPatientWithNameFallback (replicado)
    const variants = buildNameSearchVariants(patientName);
    let candidates: any[] = [];
    let successfulQuery = '';

    for (const query of variants) {
      try {
        const results = await scraper.searchPatient(query, {
          appointmentDate,
          schedulingId: String(doc._id),
          pendingGroups,
        });
        if (Array.isArray(results) && results.length > 0) {
          candidates = results;
          successfulQuery = query;
          break;
        }
      } catch { /* ignore */ }
    }

    if (candidates.length === 0) {
      console.log(`  Busca: ${variants.length} variantes → NENHUM candidato`);
      console.log(`  → Scraper não encontrou resultado neste ciclo\n`);
      continue;
    }

    console.log(`  Busca: "${successfulQuery}" → ${candidates.length} candidato(s)`);
    for (let j = 0; j < candidates.length; j++) {
      const c = candidates[j];
      console.log(`    [${j + 1}] studyDate=${c.studyDate ?? '?'} | name=${c.patientName ?? '?'} | id=${c._id ?? '?'}`);
    }
    totalFound += candidates.length;

    // Para cada candidato (replicando o loop de download)
    let matchedInThisDoc = false;

    for (let ci = 0; ci < candidates.length; ci++) {
      if (matchedInThisDoc) break;

      const candidate = candidates[ci];
      console.log(`\n  ── Candidato ${ci + 1}/${candidates.length} ──`);

      // Download PDF
      let pdfBuffer: Buffer | null = null;
      try {
        pdfBuffer = await scraper.downloadReport(candidate);
      } catch (err: any) {
        console.log(`    ERRO no download: ${err.message}`);
        continue;
      }

      if (!pdfBuffer) {
        console.log(`    PDF não disponível`);
        continue;
      }

      console.log(`    PDF baixado: ${pdfBuffer.length} bytes`);
      totalDownloaded++;

      // Extrair texto (replicando examMatcher.extractText)
      let reportText = '';
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(pdfBuffer);
        reportText = data?.text ?? '';
      } catch (err: any) {
        console.log(`    ERRO ao extrair texto: ${err.message}`);
        continue;
      }

      if (!reportText.trim()) {
        console.log(`    Texto vazio (PDF imagem/scan)`);
        continue;
      }

      const textPreview = reportText.replace(/\s+/g, ' ').trim().slice(0, 200);
      console.log(`    Texto: ${reportText.trim().length} chars`);
      console.log(`    Preview: "${textPreview}..."`);

      // ═══ GATES (replicando handleResultFound) ═══

      // Gate 1: YEAR
      const yearDecision = getYearEvidenceDecision(reportText, appointmentDate);
      console.log(`\n    [GATE 1 - YEAR] expectedYear=${yearDecision.expectedYear ?? 'n/a'} foundYears=[${yearDecision.foundYears.join(',')}] reason=${yearDecision.reason} reject=${yearDecision.shouldReject}`);
      if (yearDecision.shouldReject) {
        console.log(`      ✗ REJEITADO — ano do PDF não bate com agendamento`);
        totalRejectedYear++;
        continue;
      }
      console.log(`      ✓ PASSOU`);

      // Gate 2: IDENTITY
      const patientInfo = {
        nome: patientName,
        cpf,
        dataAgendamento: appointmentDate,
        dataNascimento: birthDate,
      };
      const hasIdentity = hasMinimumIdentityEvidence(reportText, patientInfo, 'RAIOX');

      const normalizedReport = normalizeString(reportText);
      const allNameTokens = getPatientNameTokens(patientName);
      const matchedTokens = allNameTokens.filter((t) => normalizedReport.includes(t));
      const nameRatio = allNameTokens.length > 0 ? matchedTokens.length / allNameTokens.length : 0;
      const hasCpf = extractDigits(cpf).length >= 11 && extractDigits(reportText).includes(extractDigits(cpf));

      console.log(`\n    [GATE 2 - IDENTITY] hasIdentity=${hasIdentity}`);
      console.log(`      Nome: "${patientName}"`);
      console.log(`      Tokens: [${allNameTokens.join(', ')}]`);
      console.log(`      Matched: [${matchedTokens.join(', ')}] (${matchedTokens.length}/${allNameTokens.length} = ${(nameRatio * 100).toFixed(0)}%)`);
      console.log(`      hasCpf=${hasCpf}`);

      if (!hasIdentity) {
        console.log(`      ✗ REJEITADO — identidade não verificada`);
        totalRejectedIdentity++;
        continue;
      }
      console.log(`      ✓ PASSOU`);

      // Gate 3: TEXT EVIDENCE (para cada exame pendente)
      console.log(`\n    [GATE 3 - TEXT EVIDENCE]`);
      let algumMatch = false;

      for (const ex of pendingExams) {
        const evaluator = getTextEvidenceEvaluator(ex);
        const hasTE = evaluator(reportText, ex.nomeExame);

        const bodyTokens = getSignificantExamTokens(ex.nomeExame);
        const matchedBody = bodyTokens.filter((t) => normalizedReport.includes(t));
        const hasRxIndicator = /\brx\b/.test(normalizedReport) ||
          normalizedReport.includes('raio') ||
          normalizedReport.includes('radiograf');

        console.log(`      [${ex.codigoExame}] "${ex.nomeExame}"`);
        console.log(`        Tokens: [${bodyTokens.join(', ')}]`);
        for (const t of bodyTokens) {
          console.log(`          "${t}" → ${normalizedReport.includes(t) ? '✓' : '✗'}`);
        }
        console.log(`        RX indicator: ${hasRxIndicator ? '✓' : '✗'}`);
        console.log(`        Resultado: ${hasTE ? '✓ PASSOU' : '✗ REPROVOU'} (${matchedBody.length}/${bodyTokens.length})`);

        if (hasTE) {
          algumMatch = true;
        }
      }

      if (!algumMatch) {
        console.log(`      ✗ NENHUM EXAME PASSOU no text evidence`);
        totalRejectedTextEvidence++;
        continue;
      }

      // Se chegou até aqui, seria um match
      console.log(`\n    ✓✓✓ MATCH CONFIRMADO — exame seria vinculado ao prontuário ✓✓✓`);
      console.log(`    (Em produção: upload Azure + applyExamResultFromWorker)`);
      totalMatched++;
      matchedInThisDoc = true;
    }

    if (!matchedInThisDoc) {
      console.log(`\n  ══ RESULTADO: NENHUM EXAME VINCULADO ══`);
    }
    console.log('');
  }

  // 5. Resumo
  console.log(`${hr('=')}`);
  console.log(`RESUMO DA SIMULAÇÃO CRON`);
  console.log(`${hr('=')}`);
  console.log(`  Agendamentos processados:     ${totalProcessed}`);
  console.log(`  Candidatos encontrados:       ${totalFound}`);
  console.log(`  PDFs baixados:                ${totalDownloaded}`);
  console.log(`  Rejeitados (YEAR):            ${totalRejectedYear}`);
  console.log(`  Rejeitados (IDENTITY):        ${totalRejectedIdentity}`);
  console.log(`  Rejeitados (TEXT_EVIDENCE):   ${totalRejectedTextEvidence}`);
  console.log(`  Matches confirmados:          ${totalMatched}`);
  console.log(`${hr('=')}`);

  if (totalMatched > 0) {
    console.log(`\n  ✓ SUCESSO: Pelo menos 1 exame seria vinculado corretamente.`);
  } else if (totalRejectedYear > 0) {
    console.log(`\n  ✓ CORREÇÃO FUNCIONANDO: Estudos de anos antigos foram bloqueados pelo YEAR gate.`);
  } else if (totalFound === 0) {
    console.log(`\n  ℹ Nenhum candidato encontrado na janela de busca.`);
    console.log(`    Isso é esperado se o Raio-X ainda não foi realizado/ publicado no Veitieka.`);
  } else {
    console.log(`\n  ⚠ Nenhum match confirmado. Verificar logs acima.`);
  }

  console.log('');

  // 6. Fechar MongoDB
  await mongoClient.close();
  console.log(`Conexão MongoDB fechada. Simulação concluída.`);
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  console.error(err.stack);
  process.exitCode = 1;
});
