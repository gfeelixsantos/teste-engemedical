import 'dotenv/config';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  // Testando variações mais amplas de busca direto na chamada do scraper para ver se ela aparece
  const searchTerms = [
    'EDUARDA DO NASCIMENTO',
    'EDUARDA NASCIMENTO',
    'EDUARDA OLIVEIRA',
    'EDUARDA DO NASCIMENTO DE OLIVEIRA'
  ];

  for (const term of searchTerms) {
    console.log(`\nBuscando termo exato no Medical: "${term}"`);
    // Passamos sem pendingGroups para retornar TUDO que a API do Medical responder
    const res = await scraper.searchPatient(term);
    console.log(`Resultados para "${term}":`, JSON.stringify(res, null, 2));
  }
}

main().catch(err => {
  console.error(err);
});
