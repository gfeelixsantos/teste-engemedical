import { CedillScraper } from '../src/scrapers/providers/cedill.scraper';
import * as fs from 'fs';

async function main() {
  const scraper = new CedillScraper();
  
  console.log('=== Login Cedill ===');
  await scraper.login();
  
  const searchName = 'AWDERCLAYBER';
  console.log(`\n=== Busca por nome: ${searchName} ===`);
  const results = await scraper.searchPatient(searchName, { pendingGroups: [''] });
  
  if (results.length > 0) {
    const first = results[0];
    const pdf = await scraper.downloadReport({
      ...first,
      vetorLaudoT: first.vetorLaudoT,
      searchName,
    });
    
    if (pdf) {
      // Salvar HTML para analisar
      fs.writeFileSync('debug-lamina.html', pdf.toString('utf-8'));
      console.log('HTML salvo em debug-lamina.html');
      
      // Extrair texto
      const text = pdf.toString('utf-8')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Verificar se contém tokens esperados
      console.log('\n--- Verificando tokens ---');
      const checks = [
        { name: 'AWDERCLAYBER', check: text.toUpperCase().includes('AWDERCLAYBER') },
        { name: 'GLICOSE/Glicose', check: text.toUpperCase().includes('GLICOSE') || text.toUpperCase().includes('GLICEMIA') },
        { name: 'COLESTEROL', check: text.toUpperCase().includes('COLESTEROL') },
        { name: 'HEMOGRAMA', check: text.toUpperCase().includes('HEMOGRAMA') },
        { name: 'PSA', check: text.toUpperCase().includes('PSA') },
        { name: 'MINERACAO JUNDU', check: text.toUpperCase().includes('MINERACAO') || text.includes('JUNDU') },
      ];
      checks.forEach(c => console.log(`  ${c.name}: ${c.check ? 'OK' : 'FALTANDO'}`));
      
      // Mostrar trecho relevante
      const lines = text.split(' ').filter(w => w.length > 3);
      console.log('\n--- Palavras relevantes (50 primeiras) ---');
      console.log(lines.slice(0, 50).join(' '));
    }
  }
}

main().catch(console.error);
