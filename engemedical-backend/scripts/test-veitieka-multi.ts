import { VeitiekaScraper } from '../src/scrapers/providers/veitieka.scraper';
import * as dotenv from 'dotenv';
dotenv.config();

const testCases = [
  { name: 'ANTONIO PEREIRA GAMELEIRA JUNIOR', appointmentDate: '18/08/2026' },
  { name: 'ANDRE LUIZ SCATOLIN',              appointmentDate: '18/08/2026' },
  { name: 'RAMON GOMES DA SILVA',             appointmentDate: '14/08/2026' },
  { name: 'WALESON LUCAS DE SOUSA',           appointmentDate: '15/08/2026' },
];

async function run() {
  const scraper = new VeitiekaScraper();
  await scraper.login();

  for (const tc of testCases) {
    const results = await scraper.searchPatient(tc.name, { appointmentDate: tc.appointmentDate });
    console.log(`\n${tc.name} | window around ${tc.appointmentDate} → ${results.length} result(s)`);
    if (results.length > 0) {
      results.forEach((r: any, i: number) => {
        console.log(`  [${i}] studyDate=${r.studyDate} patientName=${r.patientName || r.patient?.name}`);
      });
    }
  }
  process.exit(0);
}
run().catch(console.error);
