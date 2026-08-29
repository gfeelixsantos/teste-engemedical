/**
 * Teste isolado: verifica identidade + matching com texto real extraído
 */
import { config } from 'dotenv';
config();

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

// Import the REAL function from exam-matcher
import { hasMinimumIdentityEvidence } from '../src/scrapers/exam-matcher.service';

async function main() {
  // Use the text we know exists in the Cedill report
  // From previous test: 7569 chars, contains "01/06/26", "AWDERCLAYBER", "NASCIMENTO", lab results
  // We'll simulate with the known text

  const patientInfo = {
    nome: 'AWDERCLAYBER DO NASCIMENTO',
    cpf: '67180108472',
    dataAgendamento: '01/06/2026',
    dataNascimento: '24/02/1968',
  };

  const reportText = ':: Laboratorio Cedill :: 000400581235 Cedill L. S. S. Ltda. Avenida Quinze - 417 - Centro - CEP 13500-330 - Rio Claro - SP - Brasil Telefone: (19) 3533-5151 www.cedill.com.br e-mail: contato@cedill.com.br LAUDO DE EXAME 01/06/26 NIC: 000400581235 Paciente: AWDERCLAYBER DO NASCIMENTO Data de Nascimento: 24/02/68 Medico Solicitante: CRM 85318 GLICOSE Resultado: 112 mg/dL COLESTEROL HDL Resultado: 41 mg/dL COLESTEROL LDL Resultado: 120 mg/dL HEMOGRAMA Resultado: NORMAL PSA Resultado: 2.5 ng/mL';

  console.log('=== TESTE HASMINIMUMIDENTITYEVIDENCE (REAL FUNCTION) ===\n');

  const normalizedReport = normalizeString(reportText);
  const nameTokens = getPatientNameTokens(patientInfo.nome);
  const matchedTokens = nameTokens.filter(t => normalizedReport.includes(t));

  console.log('Name tokens:', nameTokens.join(', '));
  console.log('Matched tokens:', matchedTokens.join(', '), `(${matchedTokens.length}/${nameTokens.length})`);

  const cpfDigits = extractDigits(patientInfo.cpf);
  const reportDigits = extractDigits(reportText);
  const hasCpf = cpfDigits.length >= 11 && reportDigits.includes(cpfDigits);
  console.log('Has CPF in text:', hasCpf);

  console.log('Has birth date (24/02/1968):', hasDateEvidence(reportText, patientInfo.dataNascimento));
  console.log('Has birth date (24/02/68):', reportText.includes('24/02/68'));
  console.log('Has appointment date (01/06/2026):', hasDateEvidence(reportText, patientInfo.dataAgendamento));
  console.log('Has appointment date (01/06/26):', reportText.includes('01/06/26'));

  // Call the REAL function
  const result = hasMinimumIdentityEvidence(reportText, patientInfo);
  console.log('\nhasMinimumIdentityEvidence (REAL):', result);

  if (result) {
    console.log('\n✓ IDENTIDADE VERIFICADA - Pipeline proceedaria para matchExams');
  } else {
    console.log('\n✗ IDENTIDADE REJEITADA - matchExams seria bloqueado');
  }
}

main().catch(console.error);
