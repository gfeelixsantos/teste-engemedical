/**
 * Teste completo do pipeline Cedill: search → download → extractText → identity check → matchExams
 * Simula exatamente o que scraper.service.ts faz em handleResultFound
 */
import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';
import {
  hasMinimumIdentityEvidence,
} from '../src/scrapers/exam-matcher.service';
import {
  normalizeScraperGroup,
  matchesAllowedGroups,
} from '../src/scrapers/utils/group-normalization.util';

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

// Simular pendingExames do MongoDB para AWDERCLAYBER
const PENDING_EXAMS = [
  { codigoExame: '1180', nomeExame: 'Antígeno específico prostático total (PSA)', grupo: 'Laboratório', status: 'AGUARDANDO_RESULTADO' },
  { codigoExame: '1332', nomeExame: 'Colesterol (HDL)', grupo: 'Laboratório', status: 'AGUARDANDO_RESULTADO' },
  { codigoExame: '1222', nomeExame: 'Colesterol (LDL)', grupo: 'Laboratório', status: 'AGUARDANDO_RESULTADO' },
  { codigoExame: '28.01.097-3', nomeExame: 'Glicemia', grupo: 'Laboratório', status: 'AGUARDANDO_RESULTADO' },
  { codigoExame: '28.04.048-1', nomeExame: 'Hemograma com contagem de plaquetas ou frações', grupo: 'Laboratório', status: 'AGUARDANDO_RESULTADO' },
];

const PATIENT_INFO = {
  nome: 'AWDERCLAYBER DO NASCIMENTO',
  cpf: '67180108472',
  dataAgendamento: '01/06/2026',
  dataNascimento: '',  // Não informado no MongoDB
};

async function main() {
  const scraper = new CedillScraper();

  console.log('=== PIPELINE COMPLETO CEDILL ===\n');

  // 1. Login
  console.log('[1/6] Login...');
  await scraper.login();

  // 2. Search
  console.log('[2/6] Busca por nome...');
  const results = await scraper.searchPatient(PATIENT_INFO.nome, { pendingGroups: ['Laboratório'] });
  console.log(`  Resultados: ${results.length}`);

  if (results.length === 0) {
    console.log('  ABORTADO: Nenhum resultado encontrado');
    return;
  }

  // 3. Download
  console.log('[3/6] Download laudo...');
  const first = results[0];
  const buffer = await scraper.downloadReport({
    ...first,
    vetorLaudoT: first.vetorLaudoT,
    searchName: results[0].searchName || PATIENT_INFO.nome,
  });

  if (!buffer) {
    console.log('  ABORTADO: Download falhou');
    return;
  }
  console.log(`  Buffer: ${buffer.length} bytes`);

  // 4. Extract text
  console.log('[4/6] Extração de texto...');
  const text = extractText(buffer);
  console.log(`  Texto: ${text.length} chars`);
  console.log(`  Preview: "${text.substring(0, 200)}..."\n`);

  // 5. Identity check (hasMinimumIdentityEvidence)
  console.log('[5/6] Verificação de identidade (hasMinimumIdentityEvidence)...');
  const allowedGroups = ['Laboratório', 'LABORATORIO'];
  const pendingExams = PENDING_EXAMS.filter(ex =>
    ex.status === 'AGUARDANDO_RESULTADO' &&
    matchesAllowedGroups(ex.grupo, allowedGroups)
  );
  console.log(`  Exames pendentes: ${pendingExams.length}`);
  console.log(`  Grupos: ${[...new Set(pendingExams.map(ex => normalizeScraperGroup(ex.grupo)))]}`);

  const isRaiox = pendingExams.some(ex => normalizeScraperGroup(ex.grupo) === 'RAIOX');
  const identityOk = hasMinimumIdentityEvidence(
    text,
    PATIENT_INFO,
    isRaiox ? 'RAIOX' : undefined,
  );
  console.log(`  Identidade OK: ${identityOk}`);

  if (!identityOk) {
    console.log('\n  *** PROBLEMA IDENTIFICADO: hasMinimumIdentityEvidence retornou false ***');
    console.log('  O texto do laudo Cedill NÃO contém evidência suficiente de identidade.');
    console.log('  Verificando detalhes:');

    // Debug identity check
    const normalizedReport = text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nameTokens = PATIENT_INFO.nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/).filter(t => t.length >= 2);

    const matchedTokens = nameTokens.filter(t => normalizedReport.includes(t));
    console.log(`  Nome tokens: ${nameTokens.join(', ')}`);
    console.log(`  Tokens encontrados: ${matchedTokens.join(', ')} (${matchedTokens.length}/${nameTokens.length})`);

    const cpfDigits = PATIENT_INFO.cpf.replace(/\D/g, '');
    const reportDigits = text.replace(/\D/g, '');
    const hasCpf = cpfDigits.length >= 11 && reportDigits.includes(cpfDigits);
    console.log(`  CPF no texto: ${hasCpf} (cpf=${cpfDigits}, digits_in_report=${reportDigits.substring(0, 50)}...)`);

    // Verificar datas
    const dateVariants = [
      `${PATIENT_INFO.dataAgendamento}`,
      `${PATIENT_INFO.dataAgendamento.split('/').reverse().join('-')}`,
    ];
    const hasDate = dateVariants.some(d => text.includes(d));
    console.log(`  Data agendamento no texto: ${hasDate}`);

    // strongIdentity = hasMinimumName && (hasCpf || hasBirthDate)
    const minNameTokens = Math.min(2, nameTokens.length);
    const hasMinimumName = matchedTokens.length >= minNameTokens;
    console.log(`\n  hasMinimumName (${matchedTokens.length} >= ${minNameTokens}): ${hasMinimumName}`);
    console.log(`  hasCpf: ${hasCpf}`);
    console.log(`  hasBirthDate: ${PATIENT_INFO.dataNascimento ? 'sim' : 'VAZIO/NÃO INFORMADO'}`);
    console.log(`  strongIdentity = hasMinimumName && (hasCpf || hasBirthDate) = ${hasMinimumName && (hasCpf || !!PATIENT_INFO.dataNascimento)}`);

    // fallbackIdentity = matchedNameTokens >= 3 && hasAppointmentDate
    const hasAppointmentDate = text.includes('01/06/26') || text.includes('01/06/2026');
    const fallbackIdentity = matchedTokens.length >= Math.min(3, nameTokens.length) && hasAppointmentDate;
    console.log(`  fallbackIdentity (${matchedTokens.length} >= ${Math.min(3, nameTokens.length)} && hasAppointmentDate=${hasAppointmentDate}): ${fallbackIdentity}`);
  }

  // 6. Match (manual - por código e nome)
  console.log('\n[6/6] Match de exames (manual - sem Azure OpenAI)...');
  const matchedCodigos: string[] = [];

  for (const exam of pendingExams) {
    const examNameUpper = exam.nomeExame.toUpperCase();
    const textUpper = text.toUpperCase();

    if (textUpper.includes(examNameUpper)) {
      matchedCodigos.push(exam.codigoExame);
      console.log(`  ✓ MATCH por nome: [${exam.codigoExame}] ${exam.nomeExame}`);
    } else {
      // Tentar tokens individuais
      const tokens = examNameUpper.split(/\s+/).filter(t => t.length >= 4);
      const matchedTokens = tokens.filter(t => textUpper.includes(t));
      if (matchedTokens.length >= Math.ceil(tokens.length * 0.5)) {
        matchedCodigos.push(exam.codigoExame);
        console.log(`  ✓ MATCH por tokens: [${exam.codigoExame}] ${exam.nomeExame} (${matchedTokens.join(',')})`);
      } else {
        console.log(`  ✗ SEM MATCH: [${exam.codigoExame}] ${exam.nomeExame} (tokens: ${tokens.join(',')})`);
      }
    }
  }

  console.log(`\n  Total matches: ${matchedCodigos.length}/${pendingExams.length}`);
  console.log(`  Códigos: ${matchedCodigos.join(', ')}`);

  if (matchedCodigos.length > 0) {
    console.log('\n=== RESULTADO: Exames IDENTIFICADOS no laudo ===');
    console.log('Se o Azure OpenAI estivesse configurado, esses exames seriam:');
    console.log('  1. Baixados e extraídos ✓ (já feito)');
    console.log('  2. Enviados para Azure Storage ✓ (uploadGenericFile)');
    console.log('  3. Vinculados ao prontuário ✓ (applyExamResultFromWorker)');
  } else {
    console.log('\n=== RESULTADO: NENHUM exame identificado ===');
  }
}

main().catch(console.error);
