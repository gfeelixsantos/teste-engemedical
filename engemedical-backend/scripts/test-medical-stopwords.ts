import 'dotenv/config';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { buildMedicalSearchVariants } from '../src/scrapers/utils/name-normalization.util';

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  const patientName = 'EDUARDA DO NASCIMENTO DE OLIVEIRA';
  const variants = buildMedicalSearchVariants(patientName);
  console.log('Novas variantes geradas com STOPWORDS filtradas:', variants);

  const results = await scraper.searchPatient(patientName, {
    appointmentDate: '07/04/2026',
    schedulingId: '69d4e82b8d4478166f5f5057',
    pendingGroups: ['RAIOX']
  });

  console.log('Resultados obtidos no Medical com as variantes ajustadas:', results);
}

main().catch(err => {
  console.error(err);
});
