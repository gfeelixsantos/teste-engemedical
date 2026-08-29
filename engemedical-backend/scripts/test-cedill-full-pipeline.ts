/**
 * Teste leve: chama matchExams sem bootstrapar NestJS completo
 */
import { config } from 'dotenv';
config();

const { MongoClient, ObjectId } = require('mongodb');

function extractText(buffer: Buffer): string {
  const firstBytes = buffer.slice(0, 4).toString('utf-8');
  if (firstBytes.trimStart().startsWith('<') || firstBytes.includes('<!')) {
    const html = buffer.toString('utf-8');
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return 'PDF_DETECTED';
}

function normalizeString(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPatientNameTokens(name: string): string[] {
  const STOPWORDS = new Set(['de','da','do','das','dos','e','em','com','para','por','a','o','as','os','um','uma']);
  return normalizeString(name).split(/\s+/).filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

function extractDigits(str: string): string {
  return (str || '').replace(/\D/g, '');
}

function parseDateParts(value?: string): { day: string; month: string; year: string; yearShort: string } | null {
  if (!value) return null;
  const m = value.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return { day: m[1].padStart(2, '0'), month: m[2].padStart(2, '0'), year, yearShort: year.slice(-2) };
}

function hasDateEvidence(reportText: string, value?: string): boolean {
  const parts = parseDateParts(value);
  if (!parts) return false;
  const variants: string[] = [];
  for (const y of [parts.year, parts.yearShort]) {
    variants.push(
      `${parts.day}/${parts.month}/${y}`,
      `${parts.day}-${parts.month}-${y}`,
      `${Number(parts.day)}/${Number(parts.month)}/${y}`,
      `${Number(parts.day)}-${Number(parts.month)}-${y}`,
    );
  }
  return variants.some(d => reportText.includes(d));
}

function hasMinimumIdentityEvidence(reportText: string, patientInfo: { nome: string; cpf: string; dataAgendamento: string; dataNascimento: string }): boolean {
  const normalizedReport = normalizeString(reportText);
  const nameTokens = getPatientNameTokens(patientInfo.nome);
  const matchedNameTokens = nameTokens.filter(t => normalizedReport.includes(t)).length;
  const minNameTokens = Math.min(2, nameTokens.length);
  const hasMinimumName = matchedNameTokens >= minNameTokens;
  const cpfDigits = extractDigits(patientInfo.cpf);
  const reportDigits = extractDigits(reportText);
  const hasCpf = cpfDigits.length >= 11 && reportDigits.includes(cpfDigits);
  const hasBirthDate = hasDateEvidence(reportText, patientInfo.dataNascimento);
  const hasAppointmentDate = hasDateEvidence(reportText, patientInfo.dataAgendamento);
  const strongIdentity = hasMinimumName && (hasCpf || hasBirthDate);
  const fallbackIdentity = matchedNameTokens >= Math.min(3, nameTokens.length) && hasAppointmentDate;
  return strongIdentity || fallbackIdentity;
}

function matchesExamByName(examName: string, reportText: string): boolean {
  const textUpper = reportText.toUpperCase();
  const examUpper = examName.toUpperCase();
  if (textUpper.includes(examUpper)) return true;
  const tokens = examUpper.split(/\s+/).filter(t => t.length >= 4);
  const matched = tokens.filter(t => textUpper.includes(t));
  return matched.length >= Math.ceil(tokens.length * 0.5);
}

async function main() {
  const uri = process.env.MONGO_URL;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGO_DATABASE || 'cmso-agendamento');
  const coll = db.collection('schedulings');

  const doc = await coll.findOne({ _id: new ObjectId('6a1d5a4db2302a5f1e627935') });
  console.log('Patient:', doc?.NOME);
  console.log('CPF:', doc?.CPFFUNCIONARIO);
  console.log('DataAgendamento:', doc?.DATAAGENDAMENTO);
  console.log('DataNascimento:', doc?.DATANASCIMENTO);

  const pendingExams = (doc?.EXAMES || []).filter(
    (ex: any) => ex.status === 'AGUARDANDO_RESULTADO' && ex.grupo === 'Laboratório'
  );
  console.log('Pending labs:', pendingExams.length);

  const patientInfo = {
    nome: doc!.NOME,
    cpf: doc!.CPFFUNCIONARIO,
    dataAgendamento: doc!.DATAAGENDAMENTO,
    dataNascimento: doc!.DATANASCIMENTO,
  };

  // Simulate the text we already extracted (from previous test)
  const CedillScraper = require('../src/scrapers/providers/cedill.scraper').CedillScraper;
  const scraper = new CedillScraper();
  await scraper.login();
  const results = await scraper.searchPatient(doc!.NOME, { pendingGroups: ['Laboratório'] });
  const buf = await scraper.downloadReport({ ...results[0], vetorLaudoT: results[0].vetorLaudoT, searchName: results[0].searchName || doc!.NOME });
  const text = extractText(buf);

  console.log('\n=== IDENTITY CHECK ===');
  const identityOk = hasMinimumIdentityEvidence(text, patientInfo);
  console.log('Identity OK:', identityOk);

  if (!identityOk) {
    console.log('REJECTED - identity check failed');
    process.exit(1);
  }

  console.log('\n=== EXAM MATCHING ===');
  const matchedCodigos: string[] = [];
  for (const exam of pendingExams) {
    const match = matchesExamByName(exam.nomeExame, text);
    console.log(`  ${match ? '✓' : '✗'} [${exam.codigoExame}] ${exam.nomeExame}`);
    if (match) matchedCodigos.push(exam.codigoExame);
  }

  console.log(`\n=== RESULTADO FINAL ===`);
  console.log(`Identity: PASS`);
  console.log(`Matched: ${matchedCodigos.length}/${pendingExams.length}`);
  console.log(`Codes: ${matchedCodigos.join(', ')}`);

  if (matchedCodigos.length > 0) {
    console.log('\n✓ PIPELINE COMPLETO: Identidade verificada + Exames identificados');
    console.log('Em produção com Azure OpenAI configurado:');
    console.log('  → uploadGenericFile() seria chamado');
    console.log('  → applyExamResultFromWorker() vincularia ao prontuário');
  } else {
    console.log('\n✗ Exames não identificados no laudo');
  }

  await scraper.destroy?.();
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
