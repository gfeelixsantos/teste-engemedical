import { VeitiekaScraper } from '../src/scrapers/providers/veitieka.scraper';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const scraper = new VeitiekaScraper();
    await scraper.login();
    
    const results = await scraper.searchPatient('LEONARDO CHAVONI ZACHETTI', {
      appointmentDate: '18/08/2026'
    });
    
    console.log("Veitieka search results count:", results.length);
    if (results.length > 0) {
      console.log("First result sample keys:", Object.keys(results[0]));
      console.log("First result studyDate:", results[0].studyDate);
      console.log("First result patientName:", results[0].patientName);
      console.log("First result full:", JSON.stringify(results[0], null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}
run();
