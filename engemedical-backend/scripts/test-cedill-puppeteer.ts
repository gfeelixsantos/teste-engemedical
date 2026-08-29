import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';

async function main() {
  const scraper = new CedillScraper();

  try {
    console.log('=== Cedill Puppeteer Test ===');

    // 1. Login via axios
    console.log('\n[1] Login via axios...');
    await scraper.login();

    // 2. Search via Puppeteer — use the same name the browser used
    console.log('\n[2] Search via Puppeteer...');
    const results = await scraper.searchPatient('AWDERCLAYBER');
    console.log(`Results: ${results.length}`);

    if (results.length > 0) {
      console.log('First result:', JSON.stringify(results[0], null, 2));

      // 3. Download first result via Puppeteer
      console.log('\n[3] Download first result via Puppeteer...');
      const pdf = await scraper.downloadReport(results[0]);
      if (pdf) {
        console.log(`Downloaded: ${pdf.length} bytes`);
        console.log(`Is PDF: ${pdf.slice(0, 4).toString() === '%PDF'}`);
      } else {
        console.log('Download returned null');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await scraper.cleanup();
  }
}

main();
