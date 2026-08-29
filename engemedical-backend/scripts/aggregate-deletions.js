const fs = require('fs');

const summary = JSON.parse(fs.readFileSync('deletions_summary.json', 'utf8'));

console.log('Total Deletions:', summary.length);

const patients = {};
const exams = {};
const reasons = {};
const userDeletes = {};

summary.forEach(item => {
  const pKey = `${item.pacienteCodigo} - ${item.pacienteNome}`;
  patients[pKey] = (patients[pKey] || 0) + 1;

  const eKey = `${item.exameCodigo} - ${item.exameNome}`;
  exams[eKey] = (exams[eKey] || 0) + 1;

  reasons[item.motivo] = (reasons[item.motivo] || 0) + 1;

  userDeletes[item.criadoPor] = (userDeletes[item.criadoPor] || 0) + 1;
});

console.log('\n--- Patients affected ---');
console.log(patients);

console.log('\n--- Exams affected ---');
console.log(exams);

console.log('\n--- Reasons ---');
console.log(reasons);

console.log('\n--- Deleted By ---');
console.log(userDeletes);
