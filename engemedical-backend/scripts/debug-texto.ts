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
    
    console.log('\n=== Download primeiro laudo ===');
    const pdf = await scraper.downloadReport({
      ...first,
      vetorLaudoT: first.vetorLaudoT,
      searchName,
    });
    if (pdf) {
      console.log(`\nBuffer baixado: ${pdf.length} bytes`);
      
      // Extrair texto como o scraper faz
      const firstBytes = pdf.slice(0, 4).toString('utf-8');
      const isPdf = pdf.slice(0, 4).toString() === '%PDF';
      console.log(`Formato: ${isPdf ? 'PDF' : 'HTML_LAMINA'}`);
      
      const text = pdf.toString('utf-8')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log(`\n--- Texto extraído (${text.length} chars) ---`);
      console.log(text.substring(0, 2000));
      
      // Procurar códigos de exames laboratoriais
      const codes = text.match(/\d{4,6}[-.]?\d{3}[-.]?\d{2,4}|PSA|Hemograma|Glicemia|Creatinina|Colesterol/gi);
      console.log(`\n--- Códigos/termos encontrados ---`);
      console.log(codes ? [...new Set(codes)] : 'Nenhum');
    }
  }
}

main().catch(console.error);
