import 'dotenv/config';
import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';
import { buildCedillNameSearchVariants } from '../src/scrapers/utils/name-normalization.util';

async function main() {
  const scraper = new CedillScraper();
  console.log('Iniciando login no Cedill...');
  await scraper.login();
  console.log('Login efetuado com sucesso.');

  const patientName = 'EDUARDA DO NASCIMENTO DE OLIVEIRA';
  const variants = buildCedillNameSearchVariants(patientName);
  console.log('Variantes de busca para Cedill:', variants);

  const results = await scraper.searchPatient(patientName, {
    appointmentDate: '07/04/2026',
    schedulingId: '69d4e82b8d4478166f5f5057',
    pendingGroups: ['RAIOX']
  });

  console.log('Resultados obtidos no Cedill:', results);
}

main().catch(err => {
  console.error('Erro na simulação do Cedill:', err);
});
