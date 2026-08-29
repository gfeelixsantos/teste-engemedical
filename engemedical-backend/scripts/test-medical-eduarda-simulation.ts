import 'dotenv/config';
import axios from 'axios';
import * as https from 'https';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { buildMedicalSearchVariants } from '../src/scrapers/utils/name-normalization.util';

// 1. Definição do gerador de variantes com a remoção condicional inteligente de conectivos
function generateTestVariants(name: string): string[] {
  const original = name.trim();
  const tokens = original.split(/\s+/);
  
  const variants = [original];

  // Adiciona variação sem partículas conectivas comuns de nomes (DE, DO, DA, DOS, DAS)
  const particles = /\b(de|do|da|dos|das)\b/i;
  if (particles.test(original)) {
    const withoutSomeParticles = tokens.filter(t => !particles.test(t)).join(' ');
    variants.push(withoutSomeParticles);

    // Variação removendo apenas o conectivo intermediário DE/do/da etc., mas mantendo os que forem necessários.
    if (tokens.length > 2) {
      const tokensCopy = [...tokens];
      const deIndex = tokensCopy.map(t => t.toLowerCase()).indexOf('de');
      if (deIndex !== -1) {
        tokensCopy.splice(deIndex, 1);
        variants.push(tokensCopy.join(' '));
      }
    }
  }

  // Adiciona a lógica padrão do sistema atual
  const stdVariants = buildMedicalSearchVariants(original);
  
  return [...new Set([...variants, ...stdVariants])];
}

async function main() {
  const scraper = new MedicalScraper();
  await scraper.login();

  const patientName = 'EDUARDA DO NASCIMENTO DE OLIVEIRA';
  const variants = generateTestVariants(patientName);
  
  console.log('=== Variantes para teste ===');
  console.log(variants);

  console.log('\n=== Executando simulação de busca ===');
  
  const seenIds = new Set<string>();
  const allMapped: any[] = [];
  
  for (const variant of variants) {
    console.log(`Buscando por: "${variant}"`);
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
        const rows: any[] = response.data.data;
        console.log(`  -> Retornou ${rows.length} resultado(s)`);

        for (const row of rows) {
          const id = Array.isArray(row[0]) ? row[0][0] : row[0];
          if (!seenIds.has(String(id))) {
            seenIds.add(String(id));
            const patientName = Array.isArray(row[2]) ? row[2][0] : row[2];
            const date = Array.isArray(row[4]) ? row[4][0] : row[4];
            const status = Array.isArray(row[5]) ? row[5][0] : row[5];
            allMapped.push({ id, patientName, date, status });
          }
        }
      }
    } catch (e: any) {
      console.error('Erro na requisição para', variant, ':', e.message);
    }
  }

  console.log('\n=== Candidatos Mapeados Encontrados ===');
  console.log(JSON.stringify(allMapped, null, 2));

  // Aplicando filtros de validação
  const filtered = allMapped.filter(c => {
    const isRaiox = /RX|RAIO/i.test(c.patientName);
    const isTargetDate = c.date.includes('07/04/2026') || c.date.includes('2026-04-07');
    return isRaiox && isTargetDate;
  });

  console.log('\n=== Exame Correto Identificado e Validado ===');
  console.log(JSON.stringify(filtered, null, 2));
}

main().catch(err => {
  console.error(err);
});
