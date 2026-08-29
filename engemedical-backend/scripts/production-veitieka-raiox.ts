/**
 * ============================================================
 *  PROCESSAMENTO EM PRODUÇÃO — VEITIEKA RAIO-X
 * ============================================================
 *
 * Processa TODOS os agendamentos RAIOX pendentes e sobe os resultados:
 *   1. Busca agendamentos com RAIOX pendente no MongoDB
 *   2. Login no Veitieka
 *   3. Para cada funcionário: busca por nome (variantes)
 *   4. Para cada candidato: baixa PDF, extrai texto, valida gates
 *   5. Se match: faz upload no Azure Blob Storage
 *   6. Atualiza MongoDB com status FINALIZADO e URL do_blob
 *
 * EXECUTAR (da pasta engemedical-connect-backend):
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/production-veitieka-raiox.ts
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/production-veitieka-raiox.ts --dry-run
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/production-veitieka-raiox.ts --scheduling-id=XXX
 * ============================================================
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { BlobServiceClient } from '@azure/storage-blob';
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
  getTextEvidenceEvaluator,
  normalizeString,
  getPatientNameTokens,
  extractDigits,
} from '../src/scrapers/exam-matcher.service';

// ─── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs(): { schedulingId?: string; dryRun?: boolean; max?: number } {
  const args = process.argv.slice(2);
  let schedulingId: string | undefined;
  let dryRun = false;
  let max: number | undefined;
  for (const arg of args) {
    if (arg.startsWith('--scheduling-id=')) schedulingId = arg.split('=')[1];
    if (arg === '--dry-run') dryRun = true;
    if (arg.startsWith('--max=')) max = Number(arg.split('=')[1]);
  }
  return { schedulingId, dryRun, max };
}

const { schedulingId: ARG_SCHEDULING_ID, dryRun: DRY_RUN, max: ARG_MAX } = parseArgs();

// ─── Config ──────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URL || 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/';
const MONGO_DB = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';

const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const AZURE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'prontuarios';

const RAIOX_ALLOWED_GROUPS = ['Raio-X', 'RAIOX'];
const MAX_SCHEDULINGS = ARG_MAX || 9999;

function hr(char = '─', len = 80) { return char.repeat(len); }

// ─── Azure Upload ────────────────────────────────────────────────────────────

function generateBlobFileName(params: {
  empresaCode?: string;
  funcionarioName: string;
  documentType: string;
  date: Date;
}): string {
  const safeName = params.funcionarioName
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60);
  const ts = params.date.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  return `${params.empresaCode || '00000'}_${safeName}_${params.documentType}_${ts}.pdf`;
}

function generateBlobPath(params: {
  empresaCode?: string;
  prontuario?: string;
  fileName: string;
  date: Date;
}): string {
  const year = params.date.getFullYear();
  const month = String(params.date.getMonth() + 1).padStart(2, '0');
  const day = String(params.date.getDate()).padStart(2, '0');
  const folder = `${year}/${month}/${day}`;
  const emp = params.empresaCode || '00000';
  const pront = params.prontuario || '00000';
  return `prontuarios/${emp}/${pront}/${folder}/${params.fileName}`;
}

async function uploadToAzure(
  blobServiceClient: BlobServiceClient,
  doc: any,
  pdfBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);
  const uploadDate = new Date();

  const blobName = generateBlobPath({
    empresaCode: doc.CODIGOEMPRESA,
    prontuario: doc.CODIGOPRONTUARIO,
    fileName: generateBlobFileName({
      empresaCode: doc.CODIGOEMPRESA,
      funcionarioName: doc.NOME,
      documentType: fileName.replace(/\.[^/.]+$/, ''),
      date: uploadDate,
    }),
    date: uploadDate,
  });

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(pdfBuffer, {
    blobHTTPHeaders: { blobContentType: 'application/pdf' },
  });

  return blockBlobClient.url;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if ((process.stdout as any).reconfigure) (process.stdout as any).reconfigure({ encoding: 'utf8' });

  console.log(`\n${hr('=')}`);
  console.log(`PROCESSAMENTO EM PRODUÇÃO — VEITIEKA RAIO-X`);
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (sem alterações)' : 'PRODUÇÃO (upload + update MongoDB)'}`);
  console.log(`${hr('=')}\n`);

  // 1. MongoDB
  console.log(`[1/7] Conectando ao MongoDB...`);
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const collection = mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION);
  console.log(`      OK\n`);

  // 2. Azure
  let blobServiceClient: BlobServiceClient | null = null;
  if (!DRY_RUN && AZURE_CONNECTION_STRING) {
    console.log(`[2/7] Conectando ao Azure Blob Storage...`);
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
    console.log(`      OK\n`);
  } else if (!DRY_RUN) {
    console.log(`[2/7] ⚠ AZURE_STORAGE_CONNECTION_STRING não configurada. Modo DRY-RUN.\n`);
  } else {
    console.log(`[2/7] Modo DRY-RUN — Azure não conectado.\n`);
  }

  // 3. Buscar agendamentos
  console.log(`[3/7] Buscando agendamentos com RAIOX pendente...`);
  let filter: any;
  if (ARG_SCHEDULING_ID) {
    filter = { _id: new ObjectId(ARG_SCHEDULING_ID) };
  } else {
    filter = {
      'EXAMES.status': { $in: ['AGUARDANDO_RESULTADO', 'PENDENTE'] },
      'EXAMES.grupo': { $in: ['RAIOX', 'Raio-X', 'raio-x', 'raiox'] },
    };
  }

  const allPending = await collection
    .find(filter)
    .sort({ DATAAGENDAMENTO: 1 })
    .limit(MAX_SCHEDULINGS + 50)
    .toArray();

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

  // 4. Login Veitieka
  console.log(`[4/7] Fazendo login no Veitieka...`);
  const scraper = new VeitiekaScraper();
  await scraper.login();
  console.log(`      OK\n`);

  // 5. Processar cada agendamento
  console.log(`[5/7] Processando agendamentos...\n`);

  let totalProcessed = 0;
  let totalFound = 0;
  let totalDownloaded = 0;
  let totalMatched = 0;
  let totalUploaded = 0;
  let totalUpdated = 0;
  let totalRejectedYear = 0;
  let totalRejectedIdentity = 0;
  let totalRejectedTextEvidence = 0;
  let totalNotFound = 0;

  const results: any[] = [];

  for (let i = 0; i < schedulings.length; i++) {
    const doc = schedulings[i] as any;
    const patientName = doc.NOME;
    const appointmentDate = doc.DATAAGENDAMENTO;
    const company = doc.NOMEEMPRESA || 'N/I';
    const cpf = doc.CPFFUNCIONARIO || '';
    const birthDate = doc.DATANASCIMENTO || '';

    const pendingExams: any[] = (doc.EXAMES || []).filter(
      (ex: any) => ['AGUARDANDO_RESULTADO', 'PENDENTE'].includes(ex.status) && matchesAllowedGroups(ex.grupo ?? '', RAIOX_ALLOWED_GROUPS),
    );
    const pendingGroups: string[] = [...new Set(pendingExams.map((ex: any) => normalizeScraperGroup(ex.grupo)))];

    totalProcessed++;

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

    // searchPatientWithNameFallback
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
      totalNotFound++;
      results.push({
        index: i + 1,
        name: patientName,
        empresa: company,
        date: appointmentDate,
        groups: pendingExams.map((e: any) => e.grupo).join(', '),
        status: 'NOT_FOUND',
        matchedExams: 0,
      });
      console.log('');
      continue;
    }

    console.log(`  Busca: "${successfulQuery}" → ${candidates.length} candidato(s)`);
    totalFound += candidates.length;

    let matchedInThisDoc = false;
    const matchedCodigos: string[] = [];

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

      // Extrair texto
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

      // GATE 1: YEAR
      const yearDecision = getYearEvidenceDecision(reportText, appointmentDate);
      console.log(`\n    [GATE 1 - YEAR] expectedYear=${yearDecision.expectedYear ?? 'n/a'} foundYears=[${yearDecision.foundYears.join(',')}] reason=${yearDecision.reason} reject=${yearDecision.shouldReject}`);
      if (yearDecision.shouldReject) {
        console.log(`      ✗ REJEITADO — ano do PDF não bate com agendamento`);
        totalRejectedYear++;
        continue;
      }
      console.log(`      ✓ PASSOU`);

      // GATE 2: IDENTITY
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

      // GATE 3: TEXT EVIDENCE
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
          matchedCodigos.push(ex.codigoExame);
        }
      }

      if (!algumMatch) {
        console.log(`      ✗ NENHUM EXAME PASSOU no text evidence`);
        totalRejectedTextEvidence++;
        continue;
      }

      // MATCH CONFIRMADO!
      console.log(`\n    ✓✓✓ MATCH CONFIRMADO — exames: [${matchedCodigos.join(', ')}] ✓✓✓`);
      totalMatched++;
      matchedInThisDoc = true;
    }

    // Upload e Update MongoDB
    if (matchedCodigos.length > 0 && !DRY_RUN) {
      // Encontrar o PDF baixado (precisamos re-baixar ou usar o último)
      // Para simplificar, vamos re-baixar o último candidato que fez match
      let lastCandidateBuffer: Buffer | null = null;
      for (const candidate of candidates) {
        try {
          const buf = await scraper.downloadReport(candidate);
          if (buf) {
            lastCandidateBuffer = buf;
            break;
          }
        } catch { /* ignore */ }
      }

      if (lastCandidateBuffer && blobServiceClient) {
        // Upload para Azure
        const groupName = doc.EXAMES.find((ex: any) => matchedCodigos.includes(ex.codigoExame))?.grupo || 'RAIOX';
        const fileName = `${groupName}.pdf`;
        const url = await uploadToAzure(blobServiceClient, doc, lastCandidateBuffer, fileName);
        console.log(`\n    [UPLOAD] Azure: ${url}`);
        totalUploaded++;

        // Update MongoDB
        const updateFilter = { _id: new ObjectId(doc._id) };
        const updateSet: any = {};

        for (const ex of doc.EXAMES || []) {
          if (matchedCodigos.includes(ex.codigoExame)) {
            const idx = doc.EXAMES.indexOf(ex);
            updateSet[`EXAMES.${idx}.status`] = 'FINALIZADO';
            updateSet[`EXAMES.${idx}.url`] = url;
          }
        }

        // Calcular novo ATENDIMENTOSTATUS
        const allDone = (doc.EXAMES || []).every(
          (ex: any) => matchedCodigos.includes(ex.codigoExame) || ex.status === 'FINALIZADO',
        );
        if (allDone) {
          updateSet['ATENDIMENTOSTATUS'] = 'FINALIZADO';
        }

        await collection.updateOne(updateFilter, { $set: updateSet });
        console.log(`    [MONGODB] Atualizado: schedulingId=${doc._id} examCodes=[${matchedCodigos.join(',')}]`);
        totalUpdated++;
      } else if (lastCandidateBuffer && !blobServiceClient) {
        console.log(`\n    [DRY-RUN] Upload ignorado (sem Azure)`);
      }
    } else if (matchedCodigos.length > 0 && DRY_RUN) {
      console.log(`\n    [DRY-RUN] Match seria persistido: examCodes=[${matchedCodigos.join(',')}]`);
    }

    results.push({
      index: i + 1,
      name: patientName,
      empresa: company,
      date: appointmentDate,
      groups: pendingExams.map((e: any) => e.grupo).join(', '),
      status: matchedCodigos.length > 0 ? 'MATCH' : 'NO_MATCH',
      matchedExams: matchedCodigos.length,
      matchedCodes: matchedCodigos,
    });

    console.log('');
  }

  // 6. Resumo
  console.log(`${hr('=')}`);
  console.log(`RESUMO DO PROCESSAMENTO`);
  console.log(`${hr('=')}`);
  console.log(`  Modo:                        ${DRY_RUN ? 'DRY-RUN' : 'PRODUÇÃO'}`);
  console.log(`  Agendamentos processados:     ${totalProcessed}`);
  console.log(`  Candidatos encontrados:       ${totalFound}`);
  console.log(`  PDFs baixados:                ${totalDownloaded}`);
  console.log(`  Rejeitados (YEAR):            ${totalRejectedYear}`);
  console.log(`  Rejeitados (IDENTITY):        ${totalRejectedIdentity}`);
  console.log(`  Rejeitados (TEXT_EVIDENCE):   ${totalRejectedTextEvidence}`);
  console.log(`  Sem candidato:                ${totalNotFound}`);
  console.log(`  Matches confirmados:          ${totalMatched}`);
  console.log(`  Uploads Azure:                ${totalUploaded}`);
  console.log(`  Updates MongoDB:              ${totalUpdated}`);
  console.log(`${hr('=')}`);

  if (totalMatched > 0 && !DRY_RUN) {
    console.log(`\n  ✓ SUCESSO: ${totalMatched} exame(s) vinculado(s) e persistido(s) no banco.`);
  } else if (totalMatched > 0 && DRY_RUN) {
    console.log(`\n  ✓ DRY-RUN: ${totalMatched} exame(s) seriam vinculados. Execute sem --dry-run para persistir.`);
  } else {
    console.log(`\n  ℹ Nenhum match confirmado.`);
  }

  console.log('');

  // 7. Fechar MongoDB
  await mongoClient.close();
  console.log(`Conexão MongoDB fechada. Processamento concluído.`);
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  console.error(err.stack);
  process.exitCode = 1;
});
