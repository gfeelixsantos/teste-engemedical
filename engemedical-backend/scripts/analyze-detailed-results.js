const fs = require('fs');

const detailed = JSON.parse(fs.readFileSync('deletions_detailed_analysis.json', 'utf8'));

console.log(`Total analyzed: ${detailed.length}`);
const matchedCount = detailed.filter(d => d.schedulingId).length;
console.log(`Matched with scheduling doc in DB: ${matchedCount}`);

const providerEstimates = {};
const details = [];

detailed.forEach(d => {
  // Try to determine the likely scraper provider based on exam group/code and unit
  // Veitieka: Raio-X for Cordeiropolis/Rio Claro
  // Cedill: Laboratorio for some clinics
  // Worklab: Laboratorio for others
  let estimatedProvider = 'Unknown';
  if (d.examCode === '32050070') {
    // RX OIT
    estimatedProvider = 'Veitieka'; // usually Veitieka handles RX OIT for Cordeirópolis/Rio Claro
  } else if (d.examCode === '28.04.048-1' || d.examCode === '28100239' || d.examCode === '28060067' || d.examCode === '28.01.097-3') {
    // Laboratorio exams
    // Let's check the unit to see if it uses Cedill or Worklab
    if (d.unidade === 'CORDEIRÓPOLIS' || d.unidade === 'RIO CLARO') {
      estimatedProvider = 'Cedill'; // or Worklab
    } else {
      estimatedProvider = 'Worklab/Cedill';
    }
  } else if (d.examCode === '51.01.004-6') {
    // Audiometria tonal ocupacional
    estimatedProvider = 'Medical / Audioclinica (manual)';
  } else if (d.examCode === '19.01.029-0') {
    // Espirometria
    estimatedProvider = 'Veitieka / Medical / Manual';
  }
  
  providerEstimates[estimatedProvider] = (providerEstimates[estimatedProvider] || 0) + 1;
  
  details.push({
    paciente: d.pacienteNome,
    codigo: d.pacienteCodigo,
    unidade: d.unidade,
    exam: `${d.examCode} - ${d.examName}`,
    motivo: d.motivo,
    estimatedProvider,
    schedulingId: d.schedulingId,
    blobPath: d.blobPath
  });
});

console.log('\nEstimated Providers for deletions:', providerEstimates);

console.log('\nList of patients for local execution debug:');
console.log(JSON.stringify(details, null, 2));
