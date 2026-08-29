import 'dotenv/config';
import axios from 'axios';
import * as https from 'https';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  // Testando buscar na API por "ELVIS ERIK DOS SANTOS" (com K no Erik) para ver se retorna
  const variant = 'ELVIS ERIK DOS SANTOS';
  console.log(`Buscando termo exato na API por: "${variant}"`);
  
  const params = {
    draw: 1,
    start: 0,
    length: 20,
    'search[value]': variant,
    'search[regex]': false,
  };

  try {
    const response = await axios.get(
      `${(scraper as any).baseUrl}/arquivos_ajax/registros/ajax.php`,
      {
        params,
        headers: {
          Cookie: (scraper as any).getCookieString(),
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );

    if (response.data && response.data.data) {
      console.log(`Retornou ${response.data.data.length} resultado(s) para "${variant}":`);
      for (const row of response.data.data) {
        const id = row[0];
        const name = row[2];
        const date = row[4];
        console.log(`  id=${id} | name="${name}" | date=${date}`);
      }
    }
  } catch (e: any) {
    console.error('Erro:', e.message);
  }
}

main().catch(err => {
  console.error(err);
});
