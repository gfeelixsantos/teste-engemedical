import { config } from 'dotenv';
config({ path: '.env' });
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { buildNameSearchVariants } from '../src/scrapers/utils/name-normalization.util';

async function run() {
  const scraper = new MedicalScraper();
  try {
    const variants = buildNameSearchVariants('BRUNA VITTORIA LOUREIRO PENTEADO DA SILVA');
    console.log('Variantes de busca:', variants);
    
    // Testa também apenas o primeiro nome para ver o que vem
    variants.push('BRUNA VITTORIA LOURERIO');
    
    for (const v of variants) {
      console.log(`Buscando por: ${v}`);
      const res = await scraper.searchPatient(v);
      console.log(`Resultados para ${v}:`, res.length > 0 ? res : 'Nenhum');
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}
run();
