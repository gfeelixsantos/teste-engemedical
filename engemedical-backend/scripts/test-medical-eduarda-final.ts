import 'dotenv/config';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { buildMedicalSearchVariants } from '../src/scrapers/utils/name-normalization.util';

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  const patientName = 'EDUARDA DO NASCIMENTO DE OLIVEIRA';
  const variants = buildMedicalSearchVariants(patientName);
  console.log('=== Variantes finais geradas no name-normalization.util: ===');
  console.log(variants);

  const results = await scraper.searchPatient(patientName, {
    appointmentDate: '07/04/2026',
    schedulingId: '69d4e82b8d4478166f5f5057',
    pendingGroups: ['RAIOX']
  });

  console.log('\n=== Resultados finais obtidos no Medical: ===');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error(err);
});
