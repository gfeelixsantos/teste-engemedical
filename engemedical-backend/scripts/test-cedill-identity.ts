import { hasMinimumIdentityEvidence } from '../src/scrapers/exam-matcher.service';

const testCases = [
  {
    name: 'AWNDERCLAYBER (1 token, 100% match)',
    reportText: 'Paciente: AWNDERCLAYBER DO NASCIMENTO',
    patient: { nome: 'AWNDERCLAYBER', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: true,
  },
  {
    name: 'PEDRO ALVES (2 tokens, 50% match - only PEDRO)',
    reportText: 'Paciente: PEDRO',
    patient: { nome: 'PEDRO ALVES', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: false, // 1/2 = 50% < 100% — exige TODOS os tokens
  },
  {
    name: 'PEDRO ALVES (2 tokens, 100% match)',
    reportText: 'Paciente: PEDRO ALVES',
    patient: { nome: 'PEDRO ALVES', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: true,
  },
  {
    name: 'ERIK JOSE GENIZELLI (3 tokens, 100% match)',
    reportText: 'Paciente: ERIK JOSE GENIZELLI Idade: 40',
    patient: { nome: 'ERIK JOSE GENIZELLI', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: true,
  },
  {
    name: 'JOAO CARLOS GATTI JUNIOR (4 tokens, 25% match - only JOAO)',
    reportText: 'Paciente: JOAO',
    patient: { nome: 'JOAO CARLOS GATTI JUNIOR', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: false, // 1/4 = 25% < 50%
  },
  {
    name: 'JOAO CARLOS GATTI JUNIOR (4 tokens, 75% match)',
    reportText: 'Paciente: JOAO CARLOS GATTI',
    patient: { nome: 'JOAO CARLOS GATTI JUNIOR', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: false, // 3/4 = 75% < 100% — exige TODOS os tokens
  },
  {
    name: 'MARCOS PEREIRA DOS SANTOS (5 tokens, 20% match - only MARCOS)',
    reportText: 'Paciente: MARCOS ANTONIO BARBOSA',
    patient: { nome: 'MARCOS PEREIRA DOS SANTOS', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: false, // 1/5 = 20% < 50%
  },
  {
    name: 'CRISTIANO SCHUINDT (2 tokens, 50% match - only CRISTIANO)',
    reportText: 'Paciente: CRISTIANO APARECIDO DOS SANTOS',
    patient: { nome: 'CRISTIANO SCHUINDT', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: false, // 1/2 = 50% < 100% — exige TODOS os tokens
  },
  {
    name: 'CRISTIANO SCHUINDT (2 tokens, 100% match)',
    reportText: 'Paciente: CRISTIANO SCHUINDT',
    patient: { nome: 'CRISTIANO SCHUINDT', cpf: '', dataAgendamento: '2026-01-15', dataNascimento: '' },
    expected: true,
  },
];

console.log('=== TESTE REGRA CEDILL ===\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = hasMinimumIdentityEvidence(tc.reportText, tc.patient, 'CEDILL');
  const status = result === tc.expected ? '✅ PASS' : '❌ FAIL';
  if (result === tc.expected) {
    passed++;
  } else {
    failed++;
  }
  console.log(`${status}: ${tc.name}`);
  if (result !== tc.expected) {
    console.log(`  Esperado: ${tc.expected}, Obtido: ${result}`);
  }
}

console.log(`\n=== RESULTADO: ${passed} passaram, ${failed} falharam ===`);
process.exit(failed > 0 ? 1 : 0);
