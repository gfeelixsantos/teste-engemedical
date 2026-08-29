import { config } from 'dotenv';
config({ path: '.env' });
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { buildMedicalSearchVariants } from '../src/scrapers/utils/name-normalization.util';

async function run() {
  const scraper = new MedicalScraper();
  await scraper.login();

  const cases = [
    { nome: 'BRUNA VITTORIA LOUREIRO PENTEADO DA SILVA', esperado: 'encontrar laudo RX Coluna' },
    { nome: 'ANDRE LUIZ DE CAMARGO', esperado: 'nao vincular ANDRE LUIZ SANTANA CAMARA' },
  ];

  for (const caso of cases) {
    const variants = buildMedicalSearchVariants(caso.nome);
    console.log(`\n=== Caso: ${caso.nome} ===`);
    console.log(`Variantes: ${JSON.stringify(variants)}`);
    console.log(`Esperado: ${caso.esperado}`);
    const res = await scraper.searchPatient(caso.nome);
    if (res.length === 0) {
      console.log('  => RESULTADO: Nenhum candidato encontrado');
    } else {
      for (const r of res) {
        console.log(`  => RESULTADO: id=${r.id} | exame="${r.patientName}" | data=${r.date}`);
      }
    }
  }

  process.exit(0);
}
run();
