import 'dotenv/config';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { buildMedicalNameSearchVariants } from '../src/scrapers/utils/name-normalization.util';

async function main() {
  const scraper = new MedicalScraper();
  console.log('Iniciando login no Medical...');
  await scraper.login();
  console.log('Login efetuado com sucesso.');

  const patientName = 'EDUARDA DO NASCIMENTO DE OLIVEIRA';

  const results = await scraper.searchPatient(patientName, {
    appointmentDate: '07/04/2026',
    schedulingId: '69d4e82b8d4478166f5f5057',
    pendingGroups: ['RAIOX']
  });

  console.log('Resultados obtidos no Medical:', results);
}

main().catch(err => {
  console.error('Erro na simulação do Medical:', err);
});
