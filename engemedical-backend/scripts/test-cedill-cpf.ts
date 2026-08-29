import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';

async function main() {
  const scraper = new CedillScraper();
  
  console.log('=== Login Cedill ===');
  await scraper.login();
  
  const searchName = 'AWDERCLAYBER';
  console.log(`\n=== Busca por nome: ${searchName} ===`);
  const results = await scraper.searchPatient(searchName, { pendingGroups: [''] });
  
  console.log(`\nResultados encontrados: ${results.length}`);
  results.forEach((r, i) => {
    console.log(`  [${i + 1}] nic=${r.nic} date="${r.date}" seqEnvio=${r.seqEnvio} stt=${r.sttLaudoImagem}`);
  });
  
  if (results.length > 0) {
    const first = results[0];
    console.log(`\nvetorLaudoT: ${first.vetorLaudoT?.length || 0} items`);
    if (first.vetorLaudoT) {
      first.vetorLaudoT.forEach((v: string, i: number) => console.log(`  [${i}] ${v}`));
    }
    
    console.log('\n=== Download primeiro laudo ===');
    const pdf = await scraper.downloadReport({
      ...first,
      vetorLaudoT: first.vetorLaudoT,
      searchName,
    });
    if (pdf) {
      console.log(`\nBuffer baixado: ${pdf.length} bytes`);
      const isPdf = pdf.slice(0, 4).toString() === '%PDF';
      console.log(`Formato: ${isPdf ? 'PDF' : 'HTML_LAMINA'}`);
    } else {
      console.log('Falha ao baixar laudo');
    }
  }
}

main().catch(console.error);
