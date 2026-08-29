/**
 * Teste REAL do pipeline: search → download → extractText → matchExams (Azure OpenAI)
 * Valida se o match funciona de ponta a ponta
 */
import { AppModule } from '../src/app.module';
import { NestFactory } from '@nestjs/core';
import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';
import { ExamMatcherService } from '../src/scrapers/exam-matcher.service';
import { MongoService } from '../src/mongo/mongo.service';

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

async function main() {
  console.log('=== TESTE REAL: matchExams COM Azure OpenAI ===\n');

  // Bootstrap NestJS to get services
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const mongoService = app.get(MongoService);
  const examMatcher = app.get(ExamMatcherService);
  const scraper = new CedillScraper();

  // Get AWDERCLAYBER from MongoDB
  const coll = mongoService.getCollection('schedulings');
  const doc = await coll.findOne({ _id: new (require('bson').ObjectId)('6a1d5a4db2302a5f1e627935') });
  if (!doc) { console.log('Doc not found'); process.exit(1); }

  console.log('Patient:', doc.NOME);
  console.log('CPF:', doc.CPFFUNCIONARIO);
  console.log('Data Agendamento:', doc.DATAAGENDAMENTO);
  console.log('Data Nascimento:', doc.DATANASCIMENTO);

  const pendingExams = (doc.EXAMES || []).filter(
    (ex: any) => ex.status === 'AGUARDANDO_RESULTADO' && ex.grupo === 'Laboratório'
  );
  console.log('Pending exams:', pendingExams.length);
  pendingExams.forEach((ex: any) => console.log(`  - [${ex.codigoExame}] ${ex.nomeExame}`));

  // Search
  console.log('\n--- Searching Cedill ---');
  await scraper.login();
  const results = await scraper.searchPatient(doc.NOME, { pendingGroups: ['Laboratório'] });
  console.log(`Found ${results.length} results`);

  if (results.length === 0) {
    console.log('ABORT: no results');
    process.exit(1);
  }

  // Download first result
  console.log('\n--- Downloading report ---');
  const first = results[0];
  const buffer = await scraper.downloadReport({
    ...first,
    vetorLaudoT: first.vetorLaudoT,
    searchName: first.searchName || doc.NOME,
  });
  if (!buffer) { console.log('Download failed'); process.exit(1); }
  console.log(`Downloaded ${buffer.length} bytes`);

  // Extract text using the REAL extractText from examMatcher
  console.log('\n--- Extracting text ---');
  const text = await examMatcher.extractText(buffer);
  console.log(`Text: ${text.length} chars`);
  console.log(`Preview: "${text.substring(0, 200)}..."\n`);

  // THE REAL TEST: matchExams with Azure OpenAI
  console.log('--- matchExams (Azure OpenAI) ---');
  const matchedCodigos = await examMatcher.matchExams(text, pendingExams, {
    nome: doc.NOME,
    cpf: doc.CPFFUNCIONARIO,
    dataAgendamento: doc.DATAAGENDAMENTO,
    dataNascimento: doc.DATANASCIMENTO,
  });

  console.log(`\n=== RESULTADO ===`);
  console.log(`Matched: ${matchedCodigos.length}/${pendingExams.length}`);
  console.log(`Codes: ${matchedCodigos.join(', ')}`);

  if (matchedCodigos.length > 0) {
    console.log('\n✓ SUCESSO: Exames seriam vinculados ao prontuário em produção');
  } else {
    console.log('\n✗ FALHA: Nenhum exame vinculado');
  }

  await scraper.destroy?.();
  await app.close();
}

main().catch(e => { console.error(e); process.exit(1); });
