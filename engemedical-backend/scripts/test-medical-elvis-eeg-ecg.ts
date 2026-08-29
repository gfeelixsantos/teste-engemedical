import 'dotenv/config';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';

async function main() {
  const scraper = new MedicalScraper();
  console.log('Efetuando login no Medical...');
  await scraper.login();

  const patientName = 'ELVIS ERICK DOS SANTOS';
  
  // 1. Simular busca para ECG
  console.log('\n=== Buscando ECG para o agendamento de 10/02/2026 ===');
  const resEcg = await scraper.searchPatient(patientName, {
    appointmentDate: '10/02/2026',
    schedulingId: '698b2b4896190abd2a422814',
    pendingGroups: ['ECG']
  });
  console.log('Resultados de ECG obtidos:', JSON.stringify(resEcg, null, 2));

  // 2. Simular busca para EEG
  console.log('\n=== Buscando EEG para o agendamento de 10/02/2026 ===');
  const resEeg = await scraper.searchPatient(patientName, {
    appointmentDate: '10/02/2026',
    schedulingId: '698b2b4896190abd2a422814',
    pendingGroups: ['EEG']
  });
  console.log('Resultados de EEG obtidos:', JSON.stringify(resEeg, null, 2));
}

main().catch(err => {
  console.error(err);
});
