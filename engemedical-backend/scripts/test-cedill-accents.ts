import { normalizeString, getPatientNameTokens, hasMinimumIdentityEvidence } from '../src/scrapers/exam-matcher.service';

console.log('=== TESTE ACENTOS ===');
console.log('normalizeString("JOSÉ"):     ', normalizeString('JOSÉ'));
console.log('normalizeString("josé"):     ', normalizeString('josé'));
console.log('normalizeString("MARÍLIA"):  ', normalizeString('MARÍLIA'));
console.log('normalizeString("MARCÍLIO"): ', normalizeString('MARCÍLIO'));
console.log('normalizeString("ANDRÉ"):    ', normalizeString('ANDRÉ'));
console.log('normalizeString("LUCAS"):    ', normalizeString('LUCAS'));
console.log();

console.log('=== TOKENS ===');
console.log('getPatientNameTokens("JOSÉ DA SILVA"):    ', getPatientNameTokens('JOSÉ DA SILVA'));
console.log('getPatientNameTokens("MARÍLIA SANTOS"):  ', getPatientNameTokens('MARÍLIA SANTOS'));
console.log('getPatientNameTokens("ANDRÉ LUIZ"):      ', getPatientNameTokens('ANDRÉ LUIZ'));
console.log('getPatientNameTokens("LUCAS"):           ', getPatientNameTokens('LUCAS'));
console.log('getPatientNameTokens("PEDRO ALVES"):     ', getPatientNameTokens('PEDRO ALVES'));
console.log();

console.log('=== MATCH CEDILL COM ACENTOS ===');
const t1 = hasMinimumIdentityEvidence('Paciente: JOSE DA SILVA', { nome: 'JOSÉ DA SILVA', cpf: '', dataAgendamento: '', dataNascimento: '' }, 'CEDILL');
console.log('JOSÉ vs JOSE no report:', t1);

const t2 = hasMinimumIdentityEvidence('Paciente: MARILIA SANTOS', { nome: 'MARÍLIA SANTOS', cpf: '', dataAgendamento: '', dataNascimento: '' }, 'CEDILL');
console.log('MARÍLIA vs MARILIA no report:', t2);

const t3 = hasMinimumIdentityEvidence('Paciente: ANDRE LUIZ', { nome: 'ANDRÉ LUIZ', cpf: '', dataAgendamento: '', dataNascimento: '' }, 'CEDILL');
console.log('ANDRÉ vs ANDRE no report:', t3);

const t4 = hasMinimumIdentityEvidence('Paciente: LUCAS', { nome: 'LUCAS', cpf: '', dataAgendamento: '', dataNascimento: '' }, 'CEDILL');
console.log('LUCAS vs LUCAS (1 token):', t4);

const t5 = hasMinimumIdentityEvidence('Paciente: JOSÉ', { nome: 'JOSÉ', cpf: '', dataAgendamento: '', dataNascimento: '' }, 'CEDILL');
console.log('JOSÉ vs JOSÉ (1 token):', t5);
