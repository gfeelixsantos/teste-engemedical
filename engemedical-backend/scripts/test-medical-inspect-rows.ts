import 'dotenv/config';
import axios from 'axios';
import * as https from 'https';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  // Vamos inspecionar individualmente os dados das linhas dos exames de ID 313098 e 313132
  const ids = ['313098', '313132'];

  for (const id of ids) {
    console.log(`\nInspecionando exame de ID: ${id}`);
    const params = {
      draw: 1,
      start: 0,
      length: 10,
      'search[value]': id,
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

      console.log('Resposta bruta para ID', id, ':', JSON.stringify(response.data.data, null, 2));
    } catch (e: any) {
      console.error(e);
    }
  }
}

main().catch(err => {
  console.error(err);
});
