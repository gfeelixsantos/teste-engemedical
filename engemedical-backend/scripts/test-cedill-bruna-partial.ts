import { config } from 'dotenv';
config({ path: '.env' });
import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';

async function run() {
  const scraper = new CedillScraper();
  try {
    await scraper.login();
    const res = await scraper.searchPatient('BRUNA VITTORIA LOURERIO', {
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
