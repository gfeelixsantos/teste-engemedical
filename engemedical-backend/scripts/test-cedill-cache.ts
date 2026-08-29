import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';

async function main() {
  const scraper = new CedillScraper();
  // Pacientes com ano do exame para testar cache de arquivo
  const patients = [
    { name: 'MARCIO', year: 2026 },
    { name: 'ADENILSON', year: 2026 },
    { name: 'ISABELLY', year: 2025 },
    { name: 'RAFAEL', year: 2025 },
  ];

  try {
    console.log('=== Cedill Cache Test (Principal + Archive per year) ===\n');

    // 1. Login
    console.log('[1] Login...');
    const start = Date.now();
    await scraper.login();
    console.log(`    OK (${Date.now() - start}ms)\n`);

    for (let i = 0; i < patients.length; i++) {
      const { name, year } = patients[i];
      const context = { appointmentDate: `01/01/${year}`, pendingGroups: ['Laboratório'] };
      const label = i === 0 ? '(must populate Principal cache)' : '(cache)';

      console.log(`[${i + 2}] searchPatient("${name}", ano=${year}) ${label}...`);
      const t = Date.now();
      const results = await scraper.searchPatient(name, context);
      const elapsed = Date.now() - t;

      if (results.length > 0) {
        console.log(`    Found ${results.length} match(es) in ${elapsed}ms`);
        results.forEach((r, j) => console.log(`    [${j}] nic=${r.nic} name="${r.name}" grupo="${r.grupo}"`));
      } else {
        console.log(`    No matches (${elapsed}ms)`);
      }
      console.log();
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await scraper.cleanup();
  }
}

main();
