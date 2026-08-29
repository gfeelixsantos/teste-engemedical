import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';

async function main() {
  const scraper = new CedillScraper();
  const patientName = 'ADENILSON DE SOUZA RAMOS';

  try {
    console.log('=== Teste Cedill: ADENILSON DE SOUZA RAMOS (com paginacao) ===\n');

    await scraper.login();
    console.log('[OK] Login\n');

    const t1 = Date.now();
    const context = {
      appointmentDate: '01/07/2026',
      pendingGroups: ['Laboratório'],
    };
    const results = await scraper.searchPatient(patientName, context);
    const elapsed = Date.now() - t1;

    console.log(`Tempo total: ${elapsed}ms`);
    console.log(`Resultados: ${results.length}\n`);

    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`[${i}] nic=${r.nic} name="${r.name}" grupo=${r.grupo}`);
      });
    } else {
      console.log('NENHUM resultado encontrado.');
    }
  } catch (error) {
    console.error('ERRO:', error.message);
  } finally {
    await scraper.cleanup();
  }
}

main();
