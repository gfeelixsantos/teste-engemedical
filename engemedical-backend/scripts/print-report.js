const fs = require('fs');
const detailed = JSON.parse(fs.readFileSync('deletions_detailed_analysis.json', 'utf8'));

console.log(`Total analyzed: ${detailed.length}`);
const matchedCount = detailed.filter(d => d.schedulingId).length;
console.log(`Matched with scheduling doc in DB: ${matchedCount}`);

const providerEstimates = {};
const details = [];

detailed.forEach(d => {
  let estimatedProvider = 'Unknown';
  if (d.examCode === '32050070') {
    estimatedProvider = 'Veitieka';
  } else if (['28.04.048-1', '28100239', '28060067', '28.01.097-3'].includes(d.examCode)) {
    estimatedProvider = 'Cedill / Worklab';
  } else if (d.examCode === '51.01.004-6') {
    estimatedProvider = 'Medical / Audioclinica (manual)';
  } else if (d.examCode === '19.01.029-0') {
    estimatedProvider = 'Veitieka / Medical / Manual';
  }
  
  providerEstimates[estimatedProvider] = (providerEstimates[estimatedProvider] || 0) + 1;
  
  details.push({
    paciente: d.pacienteNome,
    codigo: d.pacienteCodigo,
    unidade: d.unidade,
    exam: `${d.examCode} - ${d.examName.substring(0, 50)}...`,
    motivo: d.motivo,
    estimatedProvider,
    schedulingId: d.schedulingId,
    blobPath: d.blobPath
  });
});

console.log('\nEstimated Providers for deletions:', providerEstimates);

console.log('\nDetails of deletions:');
details.forEach(item => {
  console.log(`- Patient: ${item.paciente} (${item.codigo}), Unidade: ${item.unidade}`);
  console.log(`  Exam: ${item.exam}`);
  console.log(`  Motivo: ${item.motivo}`);
  console.log(`  Provider: ${item.estimatedProvider}`);
  console.log(`  BlobPath: ${item.blobPath}`);
  console.log(`  SchedulingID: ${item.schedulingId}`);
  console.log('--------------------------------------------');
});
