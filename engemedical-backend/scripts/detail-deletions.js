const fs = require('fs');
const summary = JSON.parse(fs.readFileSync('deletions_summary.json', 'utf8'));

// Filter for some examples of RX OIT (32050070)
const rxOit = summary.filter(s => s.exameCodigo === '32050070');
console.log('--- RX OIT Examples (Total ' + rxOit.length + ') ---');
rxOit.slice(0, 8).forEach(item => {
  console.log({
    paciente: `${item.pacienteCodigo} - ${item.pacienteNome}`,
    exame: item.exameNome,
    motivo: item.motivo,
    blobPath: item.blobPath,
    criadoEm: item.criadoEm
  });
});

const hemograma = summary.filter(s => s.exameCodigo === '28.04.048-1');
console.log('\n--- Hemograma Examples (Total ' + hemograma.length + ') ---');
hemograma.slice(0, 5).forEach(item => {
  console.log({
    paciente: `${item.pacienteCodigo} - ${item.pacienteNome}`,
    exame: item.exameNome,
    motivo: item.motivo,
    blobPath: item.blobPath,
    criadoEm: item.criadoEm
  });
});

const cultura = summary.filter(s => s.exameCodigo === '28100239');
console.log('\n--- Cultura nas fezes Examples (Total ' + cultura.length + ') ---');
cultura.forEach(item => {
  console.log({
    paciente: `${item.pacienteCodigo} - ${item.pacienteNome}`,
    exame: item.exameNome,
    motivo: item.motivo,
    blobPath: item.blobPath,
    criadoEm: item.criadoEm
  });
});
