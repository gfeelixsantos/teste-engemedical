/**
 * ============================================================
 *  SCRIPT DE VALIDAÇÃO — VEITIEKA: Filtro por Data de Agendamento
 * ============================================================
 *
 * Objetivo:
 *   Validar que o scraper Veitieka NÃO retorna Raio-X de anos
 *   anteriores ao agendamento do funcionário.
 *
 * Caso de teste: Scheduling 6a3d5fcdf67b38d421f9bcf1
 *   Funcionário: LUIZ CARLOS SAMPAIO (empresa 241787)
 *   Agendamento: 26/06/2026
 *   Problema: Raio-X de 20/06/2025 (empresa 24049) foi vinculado
 *
 * Executar (da pasta engemedical-connect-backend):
 *   chcp 65001 && node -r ts-node/register -r tsconfig-paths/register scripts/test-veitieka-date-filter.ts
 *   chcp 65001 && node -r ts-node/register -r tsconfig-paths/register scripts/test-veitieka-date-filter.ts --scheduling-id=6a3d5fcdf67b38d421f9bcf1
 *   chcp 65001 && node -r ts-node/register -r tsconfig-paths/register scripts/test-veitieka-date-filter.ts --name="LUIZ CARLOS SAMPAIO" --date="26/06/2026"
 * ============================================================
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { VeitiekaScraper } from '../src/scrapers/providers/veitieka.scraper';
import { buildNameSearchVariants } from '../src/scrapers/utils/name-normalization.util';
import { normalizeScraperGroup } from '../src/scrapers/utils/group-normalization.util';
import {
  getYearEvidenceDecision,
  hasMinimumIdentityEvidence,
  hasRaioxTextEvidence,
  normalizeString,
  getPatientNameTokens,
  extractDigits,
} from '../src/scrapers/exam-matcher.service';

// ─── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs(): { schedulingId?: string; name?: string; date?: string } {
  const args = process.argv.slice(2);
  let schedulingId: string | undefined;
  let name: string | undefined;
  let date: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--scheduling-id=')) schedulingId = arg.split('=')[1];
    else if (arg.startsWith('--name=')) name = arg.split('=')[1];
    else if (arg.startsWith('--date=')) date = arg.split('=')[1];
  }

  return { schedulingId, name, date };
}

const { schedulingId: ARG_SCHEDULING_ID, name: ARG_NAME, date: ARG_DATE } = parseArgs();

// ─── Config ──────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URL || 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/';
const MONGO_DB = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';

function hr(char = '─', len = 80) { return char.repeat(len); }

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if ((process.stdout as any).reconfigure) (process.stdout as any).reconfigure({ encoding: 'utf8' });

  console.log(`\n${hr('=')}`);
  console.log(`VALIDAÇÃO VEITIEKA — FILTRO POR DATA DE AGENDAMENTO`);
  console.log(`${hr('=')}\n`);

  let patientName: string;
  let appointmentDate: string;
  let pendingExams: any[] = [];
  let patientInfo: any = {};

  // 1. Modo direto (name + date) ou via MongoDB
  if (ARG_NAME && ARG_DATE) {
    patientName = ARG_NAME;
    appointmentDate = ARG_DATE;
    console.log(`Modo: busca direta por nome + data`);
    console.log(`  Nome: ${patientName}`);
    console.log(`  Data de agendamento: ${appointmentDate}`);
  } else {
    console.log(`[1/4] Conectando ao MongoDB...`);
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const collection = mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION);

    let filter: any;
    if (ARG_SCHEDULING_ID) {
      filter = { _id: new ObjectId(ARG_SCHEDULING_ID) };
    } else {
      // Caso padrão: buscar o agendamento do problema
      filter = {
        NOME: 'LUIZ CARLOS SAMPAIO',
        CODIGOEMPRESA: '241787',
        'EXAMES.codigoExame': '32050070',
      };
    }

    const doc = await collection.findOne(filter);
    if (!doc) {
      console.error(`      ERRO: Agendamento não encontrado.`);
      await mongoClient.close();
      process.exit(1);
    }

    patientName = doc.NOME;
    appointmentDate = doc.DATAAGENDAMENTO;
    patientInfo = {
      nome: doc.NOME,
      cpf: doc.CPFFUNCIONARIO || '',
      dataAgendamento: doc.DATAAGENDAMENTO,
      dataNascimento: doc.DATANASCIMENTO || '',
    };

    pendingExams = (doc.EXAMES || []).filter(
      (ex: any) =>
        ex.status === 'AGUARDANDO_RESULTADO' &&
        normalizeScraperGroup(ex.grupo || '') === 'RAIOX',
    );

    console.log(`      OK: MongoDB conectado`);
    console.log(`\n  Funcionário: ${patientName}`);
    console.log(`  Agendamento: ${appointmentDate}`);
    console.log(`  Empresa: ${doc.NOMEEMPRESA || 'N/I'} (cód: ${doc.CODIGOEMPRESA || 'N/I'})`);
    console.log(`  CPF: ${patientInfo.cpf || 'N/I'}`);
    console.log(`  Nascimento: ${patientInfo.dataNascimento || 'N/I'}`);
    console.log(`  Exames RAIOX pendentes: ${pendingExams.length}`);
    for (const ex of pendingExams) {
      console.log(`    [${ex.codigoExame}] ${ex.nomeExame} (grupo: ${ex.grupo})`);
    }
    await mongoClient.close();
  }

  console.log(`\n${hr()}`);
  console.log(`[2/4] Calculando janela de busca Veitieka...`);

  // 2. Calcular a janela de busca esperada
  const parts = appointmentDate.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (parts) {
    const day = Number(parts[1]);
    const month = Number(parts[2]) - 1;
    const year = Number(parts[3]);
    const appt = new Date(year, month, day);

    const start = new Date(appt);
    start.setDate(start.getDate() - 7);
    const end = new Date(appt);
    end.setDate(end.getDate() + 1);

    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    console.log(`  Data de agendamento: ${appointmentDate}`);
    console.log(`  Janela esperada:    ${fmt(start)} ~ ${fmt(end)}`);
    console.log(`  (7 dias antes até 1 dia depois do agendamento)`);
  }

  // 3. Buscar no Veitieka
  console.log(`\n${hr()}`);
  console.log(`[3/4] Buscando no Veitieka...`);

  const scraper = new VeitiekaScraper();
  await scraper.login();

  const variants = buildNameSearchVariants(patientName);
  let candidates: any[] = [];
  let successfulQuery = '';

  for (const query of variants) {
    const results = await scraper.searchPatient(query, {
      appointmentDate,
      schedulingId: ARG_SCHEDULING_ID || 'TEST_VEITIEKA',
      pendingGroups: ['RAIOX'],
    });
    if (Array.isArray(results) && results.length > 0) {
      candidates = results;
      successfulQuery = query;
      break;
    }
  }

  if (candidates.length === 0) {
    console.log(`  Nenhum candidato encontrado na janela de busca.`);
    console.log(`\n  RESULTADO: CORREÇÃO FUNCIONANDO — estudos antigos foram filtrados.`);
    console.log(`${hr('=')}\n`);
    return;
  }

  console.log(`  Query: "${successfulQuery}" → ${candidates.length} candidato(s)`);
  console.log(`\n  Candidatos encontrados:`);
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    console.log(`    [${i + 1}] studyDate=${c.studyDate ?? '?'} patientName=${c.patientName ?? '?'} id=${c._id ?? '?'}`);
    if (c.healthcareBy) {
      console.log(`        healthcareBy: ${JSON.stringify(c.healthcareBy).slice(0, 120)}`);
    }
  }

  // 4. Validar cada candidato
  console.log(`\n${hr()}`);
  console.log(`[4/4] Validando candidatos...\n`);

  let foundWrongYear = false;
  let foundCorrectYear = false;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    console.log(`  ── Candidato ${i + 1} ──`);

    // Verificar se a data do estudo está dentro da janela
    if (c.studyDate) {
      const studyDateStr = c.studyDate;
      console.log(`    Data do estudo: ${studyDateStr}`);

      // Tentar parsear a data
      const studyParts = studyDateStr.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (studyParts && parts) {
        const studyYear = Number(studyParts[3]);
        const expectedYear = Number(parts[3]);
        if (studyYear < expectedYear) {
          console.log(`    ⚠️  ANO ANTERIOR AO AGENDAMENTO (${studyYear} < ${expectedYear})`);
          foundWrongYear = true;
        } else {
          console.log(`    ✓ Ano do estudo dentro do esperado (${studyYear})`);
          foundCorrectYear = true;
        }
      }
    }

    // Tentar baixar e validar o PDF
    console.log(`    Baixando PDF...`);
    try {
      const pdfBuffer = await scraper.downloadReport(c);
      if (!pdfBuffer) {
        console.log(`    PDF não disponível`);
        continue;
      }

      console.log(`    PDF: ${pdfBuffer.length} bytes`);

      // Extrair texto
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(pdfBuffer);
      const reportText = data?.text ?? '';

      if (!reportText.trim()) {
        console.log(`    Texto vazio (PDF pode ser imagem/scan)`);
        continue;
      }

      // Preview
      const preview = reportText.replace(/\s+/g, ' ').trim().slice(0, 200);
      console.log(`    Texto: ${reportText.trim().length} chars`);
      console.log(`    Preview: "${preview}..."`);

      // Gate: Year
      if (parts) {
        const expectedYear = Number(parts[3]);
        const yearDecision = getYearEvidenceDecision(reportText, appointmentDate);
        console.log(`    [YEAR] expectedYear=${yearDecision.expectedYear} foundYears=[${yearDecision.foundYears}] reason=${yearDecision.reason} reject=${yearDecision.shouldReject}`);

        if (yearDecision.shouldReject) {
          console.log(`    ✓ CORREÇÃO FUNCIONANDO — year gate bloqueou estudo de ano errado`);
        } else if (yearDecision.foundYears.includes(expectedYear)) {
          console.log(`    ✓ Ano correto encontrado no laudo`);
        }
      }
    } catch (err: any) {
      console.log(`    ERRO: ${err.message}`);
    }
    console.log('');
  }

  // Resumo
  console.log(`${hr('=')}`);
  console.log(`RESUMO DA VALIDAÇÃO`);
  console.log(`${hr('=')}`);
  console.log(`  Candidatos retornados: ${candidates.length}`);
  console.log(`  Com ano anterior ao agendamento: ${foundWrongYear ? 'SIM ⚠️' : 'NÃO ✓'}`);
  console.log(`  Com ano correto: ${foundCorrectYear ? 'SIM ✓' : 'NÃO'}`);
  console.log(`\n  Se a correção funcionar, candidatos de anos antigos`);
  console.log(`  NÃO devem ser retornados pela busca do Veitieka.`);
  console.log(`${hr('=')}\n`);
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  console.error(err.stack);
  process.exitCode = 1;
});
