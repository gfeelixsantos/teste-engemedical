import 'dotenv/config';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  // Testando "EDUARDA DO NASCIMENTO OLIVEIRA" para verificar se existe e qual o ID dele
  const res = await scraper.searchPatient('EDUARDA DO NASCIMENTO OLIVEIRA');
  console.log('Busca por "EDUARDA DO NASCIMENTO OLIVEIRA":', JSON.stringify(res, null, 2));
}

main().catch(err => {
  console.error(err);
});
