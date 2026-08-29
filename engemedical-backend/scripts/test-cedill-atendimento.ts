
import 'dotenv/config';
import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';

const atendimento = {
  NOME: 'AWNDERCLAYBER DO NASCIMENTO',
  DATAAGENDAMENTO: '01/06/2026',
  CPFFUNCIONARIO: '67180108472',
};

async function main() {
  console.log('='.repeat(70));
  console.log('TESTE DE SCRAPER CEDILL - AWNDERCLAYBER DO NASCIMENTO');
  console.log('='.repeat(70));

  const scraper = new CedillScraper();

  try {
    console.log('\n[1] Login no portal Cedill...');
    await scraper.login();
    console.log('✅ Login OK\n');

    // Busca por nome
    console.log('[2] Busca por NOME:', atendimento.NOME);
    const nameResults = await scraper.searchPatient(atendimento.NOME);
    console.log(`    Resultados: ${nameResults.length}`);
    nameResults.forEach((r, i) => {
      console.log(`    [${i+1}] NIC=${r.nic} data=${r.date} nome=${r.name} posto=${r.posto}`);
    });

    // Busca por CPF
    console.log('\n[3] Busca por CPF:', atendimento.CPFFUNCIONARIO);
    const cpfResults = await scraper.searchPatient(atendimento.CPFFUNCIONARIO);
    console.log(`    Resultados: ${cpfResults.length}`);
    cpfResults.forEach((r, i) => {
      console.log(`    [${i+1}] NIC=${r.nic} data=${r.date} nome=${r.name} posto=${r.posto}`);
    });

    // Tentar download do primeiro resultado
    const allResults = [...nameResults, ...cpfResults];
    if (allResults.length > 0) {
      const first = allResults[0];
      console.log(`\n[4] Testando download do primeiro resultado (NIC=${first.nic})...`);
      const buffer = await scraper.downloadReport(first);
      if (buffer) {
        console.log(`    ✅ Download OK: ${buffer.length} bytes`);
        const preview = buffer.toString('utf-8').substring(0, 500);
        console.log(`    Preview: ${preview.replace(/\s+/g, ' ').substring(0, 200)}`);
      } else {
        console.log('    ❌ Download retornou null');
      }
    }

    await scraper.cleanup();
  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
