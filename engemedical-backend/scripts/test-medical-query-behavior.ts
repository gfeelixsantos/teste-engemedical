import 'dotenv/config';
import axios from 'axios';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  // Testando buscar diretamente pelas variantes sem o curto-circuito de busca (ou seja, fazendo pesquisas limpas individuais)
  const variants = [
    'eduarda nascimento oliveira',
    'eduarda do nascimento oliveira',
    'eduarda oliveira'
  ];

  for (const variant of variants) {
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
        }
      );
      console.log(`\n--- Resultados da busca na API por: "${variant}" ---`);
      if (response.data && response.data.data) {
        for (const row of response.data.data) {
          const id = row[0];
          const name = row[2];
          const date = row[4];
          console.log(`  id=${id} | name="${name}" | date=${date}`);
        }
      } else {
        console.log('Sem dados');
      }
    } catch (e: any) {
      console.log('Erro na requisição para', variant, ':', e.message);
    }
  }
}

main().catch(err => {
  console.error(err);
});
