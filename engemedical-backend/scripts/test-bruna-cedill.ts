import { config } from 'dotenv';
config({ path: '.env' });
import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';
import { buildCedillNameSearchVariants } from '../src/scrapers/utils/name-normalization.util';

async function run() {
  const patientName = 'BRUNA VITTORIA LOUREIRO PENTEADO DA SILVA';
  console.log('Variants for', patientName, ':');
  const variants = buildCedillNameSearchVariants(patientName);
  console.log(variants);

  const scraper = new CedillScraper();
  try {
    await scraper.login();
    const res = await scraper.searchPatient(patientName, {
      appointmentDate: '07/04/2026'
    });
    console.log('Search results:', JSON.stringify(res, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}
run();
