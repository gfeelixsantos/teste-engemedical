/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const CEDILL_PASSWORD = process.env.SCRAPER_CEDILL_PASSWORD || '70432356';
const CEDILL_COMPANY = process.env.SCRAPER_CEDILL_COMPANY || 'labcenter';
const CEDILL_POST = process.env.SCRAPER_CEDILL_POST || 'CMSO';

async function main() {
  const { CedillScraper } = require('../src/scrapers/providers/cedill.scraper');

  const scraper = new CedillScraper({
    company: CEDILL_COMPANY,
    post: CEDILL_POST,
    password: CEDILL_PASSWORD,
  });

  console.log('\n=== Cedill Full Puppeteer Flow ===\n');

  // Step 1: Login
  const loginOk = await scraper.login();
  if (!loginOk) {
    console.error('Login failed');
    process.exit(1);
  }
  console.log('Login OK');

  try {
    // Step 2: Search via public API (uses Puppeteer internally)
    console.log('\n--- Step 2: searchPatient("VINICIUS") ---');
    const results = await scraper.searchPatient('VINICIUS');
    console.log('Results:', results.length);
    if (results.length > 0) {
      console.log('First result:', JSON.stringify(results[0], null, 2));
      console.log('All names:', results.map(r => r.name || 'EMPTY').join(', '));
    }

    // Step 3: Download first result
    if (results.length > 0) {
      const first = results[0];
      console.log('\n--- Step 3: downloadReport (PDF) ---');
      console.log('  nic=' + first.nic + ' visita=' + first.visita);

      const pdfData = await scraper.downloadReport(first);
      if (pdfData) {
        const debugDir = path.resolve(__dirname, '../debug');
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        const outPath = path.join(debugDir, 'cedill-download-test.pdf');
        fs.writeFileSync(outPath, pdfData);
        console.log('Download OK! Size: ' + pdfData.length + ' bytes');
        console.log('Saved to: ' + outPath);
      } else {
        console.log('Download returned null');
      }
    }
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await scraper.closeBrowser();
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
