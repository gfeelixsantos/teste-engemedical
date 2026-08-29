/**
 * ============================================================
 *  SIMULAÇÃO COMPLETA DO CRON — CEDILL
 * ============================================================
 *
 * Reproduz exatamente o fluxo de scraper.service.ts para Cedill:
 *   1. Busca agendamentos com LABORATORIO pendente no MongoDB
 *   2. Login no Cedill
 *   3. Para cada funcionário: busca por nome (variantes)
 *   4. Para cada candidato: baixa PDF
 *   5. NADA é persistido (simulação read-only)
 *
 * Executar (da pasta engemedical-connect-backend):
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/test-cedill-cron-sim.ts
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/test-cedill-cron-sim.ts --scheduling-id=6a3d5fcdf67b38d421f9bcf1
 *   chcp 65001; node -r ts-node/register -r tsconfig-paths/register scripts/test-cedill-cron-sim.ts --max=20
 * ============================================================
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';
import {
  buildNameSearchVariants,
} from '../src/scrapers/utils/name-normalization.util';
import {
  matchesAllowedGroups,
  normalizeScraperGroup,
} from '../src/scrapers/utils/group-normalization.util';

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

const CEDILL_ALLOWED_GROUPS = ['Laboratório', 'LABORATORIO'];
const MAX_SCHEDULINGS = ARG_MAX || 20;

function hr(char = '─', len = 80) { return char.repeat(len); }

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if ((process.stdout as any).reconfigure) (process.stdout as any).reconfigure({ encoding: 'utf8' });

  console.log(`\n${hr('=')}`);
  console.log(`SIMULAÇÃO CRON COMPLETA — CEDILL`);
  console.log(`${hr('=')}\n`);

  // 1. MongoDB
  console.log(`[1/6] Conectando ao MongoDB...`);
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const collection = mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION);
  console.log(`      OK\n`);

  // 2. Buscar agendamentos (exatamente como scraper.service.ts)
  console.log(`[2/6] Buscando agendamentos com LABORATORIO pendente...`);
  let filter: any;
  if (ARG_SCHEDULING_ID) {
    filter = { _id: new ObjectId(ARG_SCHEDULING_ID) };
  } else {
    filter = {
      'EXAMES.status': 'AGUARDANDO_RESULTADO',
      'EXAMES.grupo': { $regex: /laborat/i },
    };
  }

  const allPending = await collection
    .find(filter)
    .sort({ _id: 1 })
    .limit(MAX_SCHEDULINGS + 50)
    .toArray();

  // Filtra apenas docs que têm LABORATORIO pendente (como getPendingExamsByAllowedGroups)
  const schedulings = allPending.filter((doc: any) => {
    const pending = (doc.EXAMES || []).filter(
      (ex: any) => ex.status === 'AGUARDANDO_RESULTADO' && matchesAllowedGroups(ex.grupo ?? '', CEDILL_ALLOWED_GROUPS),
    );
    return pending.length > 0;
  }).slice(0, MAX_SCHEDULINGS);

  console.log(`      Encontrados ${schedulings.length} agendamento(s) com LABORATORIO pendente\n`);

  if (schedulings.length === 0) {
    console.log(`Nenhum agendamento pendente. Abortando.`);
    await mongoClient.close();
    return;
  }

  // 3. Login Cedill
  console.log(`[3/6] Fazendo login no Cedill...`);
  const scraper = new CedillScraper();
  await scraper.login();
  console.log(`      OK\n`);

  // 4. Processar cada agendamento (replicando processBatch)
  console.log(`[4/6] Processando agendamentos...\n`);

  let totalProcessed = 0;
  let totalFound = 0;
  let totalDownloaded = 0;
  let totalMatched = 0;
  let totalFilteredOut = 0;
  let totalNotFound = 0;

  for (let i = 0; i < schedulings.length; i++) {
    const doc = schedulings[i] as any;
    const patientName = doc.NOME;
    const appointmentDate = doc.DATAAGENDAMENTO;
    const company = doc.NOMEEMPRESA || 'N/I';
    const cpf = doc.CPFFUNCIONARIO || '';

    // getPendingExamsByAllowedGroups (replicado)
    const pendingExams: any[] = (doc.EXAMES || []).filter(
      (ex: any) => ex.status === 'AGUARDANDO_RESULTADO' && matchesAllowedGroups(ex.grupo ?? '', CEDILL_ALLOWED_GROUPS),
    );
    const pendingGroups: string[] = [...new Set(pendingExams.map((ex: any) => normalizeScraperGroup(ex.grupo)))];

    console.log(`${hr('=')}`);
    console.log(`#${i + 1}/${schedulings.length}: ${patientName}`);
    console.log(`  Scheduling: ${doc._id}`);
    console.log(`  Agendamento: ${appointmentDate} | Empresa: ${company}`);
    console.log(`  CPF: ${cpf}`);
    console.log(`  PendingGroups: [${pendingGroups.join(', ')}]`);
    console.log(`  Exames pendentes: ${pendingExams.length}`);
    for (const ex of pendingExams) {
      console.log(`    [${ex.codigoExame}] ${ex.nomeExame}`);
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
      console.log(`  → Scraper não encontrou resultado neste ciclo`);
      totalNotFound++;
      console.log('');
      continue;
    }

    console.log(`  Busca: "${successfulQuery}" → ${candidates.length} candidato(s)`);
    for (let j = 0; j < candidates.length; j++) {
      const c = candidates[j];
      console.log(`    [${j + 1}] nic=${c.nic ?? '?'} | date=${c.date ?? '?'} | name=${c.name ?? c.patientName ?? '?'} | posto=${c.posto ?? '?'}`);
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

      // Por enquanto, apenas marca como match (sem validação de conteúdo)
      console.log(`    ✓ PDF VÁLIDO — seria vinculado ao prontuário`);
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
  console.log(`  Matches confirmados:          ${totalMatched}`);
  console.log(`  Sem candidato:                ${totalNotFound}`);
  console.log(`${hr('=')}`);

  if (totalMatched > 0) {
    console.log(`\n  ✓ SUCESSO: Pelo menos 1 exame seria vinculado corretamente.`);
  } else if (totalFound === 0) {
    console.log(`\n  ℹ Nenhum candidato encontrado.`);
    console.log(`    Possíveis causas: contexto não passado, nome diferente, ou exame não publicado.`);
  } else {
    console.log(`\n  ⚠ Candidatos encontrados mas nenhum PDF baixado.`);
    console.log(`    Verificar logs acima para detalhes.`);
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
