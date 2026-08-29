import 'dotenv/config';
import axios from 'axios';
import * as https from 'https';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { buildMedicalSearchVariants } from '../src/scrapers/utils/name-normalization.util';

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  const patientName = 'ELVIS ERICK DOS SANTOS';
  const variants = buildMedicalSearchVariants(patientName);
  console.log('=== Variantes para busca (ELVIS ERICK DOS SANTOS) ===');
  console.log(variants);

  // Usamos axios direto configurado corretamente para a chamada
  for (const variant of variants) {
    console.log(`\nBuscando termo no Medical: "${variant}"`);
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

      if (response.data && response.data.data && response.data.data.length > 0) {
        console.log(`  -> Retornou ${response.data.data.length} resultado(s)`);
        for (const row of response.data.data) {
          const id = row[0];
          const name = row[2];
          const date = row[4];
          const status = row[5];
          console.log(`    id=${id} | name="${name}" | date=${date} | status=${status}`);
        }
      } else {
        console.log('  -> Retornou 0 resultados');
      }
    } catch (e: any) {
      console.error('Erro na requisição para', variant, ':', e.message);
    }
  }
}

main().catch(err => {
  console.error(err);
});
