import { config } from 'dotenv';
config({ path: '.env' });
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';

async function run() {
  const scraper = new MedicalScraper();
  try {
    const res = await scraper.searchPatient('BRUNA VITTORIA LOUREIRO PENTEADO DA SILVA');
    console.log('Resultados da busca no Medical:', res);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}
run();
