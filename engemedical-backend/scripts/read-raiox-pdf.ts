import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';

async function main() {
  const pdfPath = 'C:\\Users\\FELIX\\Downloads\\raiox.pdf';

  if (!fs.existsSync(pdfPath)) {
    console.error(`Arquivo não encontrado: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Lendo: ${pdfPath}`);
  const buffer = fs.readFileSync(pdfPath);
  console.log(`Tamanho: ${buffer.length} bytes\n`);

  const data = await pdfParse(buffer);
  const text = data?.text || '';

  console.log('='.repeat(80));
  console.log('TEXTO EXTRAÍDO DO PDF');
  console.log('='.repeat(80));
  console.log(text);
  console.log('='.repeat(80));
  console.log(`\nTotal de caracteres: ${text.length}`);

  // Análise de tokens relevantes para RAIOX
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  console.log('\n' + '='.repeat(80));
  console.log('ANÁLISE DE TOKENS PARA RAIOX');
  console.log('='.repeat(80));

  const checks = [
    { token: 'raio', label: 'Indicador RX' },
    { token: 'rx', label: 'Indicador RX (sigla)' },
    { token: 'radiograf', label: 'Indicador RX (radiografia)' },
    { token: 'torax', label: 'Corpo: tórax' },
    { token: 'toracica', label: 'Corpo: torácica' },
    { token: 'toracico', label: 'Corpo: torácico' },
    { token: 'coluna', label: 'Corpo: coluna' },
    { token: 'vertebral', label: 'Corpo: vertebral' },
    { token: 'lombo', label: 'Corpo: lombo' },
    { token: 'lombar', label: 'Corpo: lombar' },
    { token: 'costela', label: 'Corpo: costela' },
    { token: 'dorsal', label: 'Corpo: dorsal' },
    { token: 'pulmao', label: 'Corpo: pulmão' },
    { token: 'pulmonar', label: 'Corpo: pulmonar' },
    { token: 'cardiaca', label: 'Corpo: cardíaca' },
    { token: 'cardiaco', label: 'Corpo: cardíaco' },
    { token: 'coracao', label: 'Corpo: coração' },
    { token: 'mediastino', label: 'Corpo: mediastino' },
    { token: 'diafragma', label: 'Corpo: diafragma' },
    { token: 'base', label: 'Anatomia: base' },
    { token: 'apice', label: 'Anatomia: ápice' },
    { token: 'hilus', label: 'Anatomia: hilo' },
    { token: 'hilar', label: 'Anatomia: hilar' },
    { token: 'arvore', label: 'Anatomia: árvore' },
    { token: 'brônquica', label: 'Anatomia: brônquica' },
    { token: 'bronquica', label: 'Anatomia: brônquica (s/ acento)' },
  ];

  for (const check of checks) {
    const found = normalized.includes(check.token);
    console.log(`  ${found ? '✓' : '✗'} ${check.label} ("${check.token}"): ${found ? 'ENCONTRADO' : 'não encontrado'}`);
  }

  // Detectar anos
  const yearMatches = text.match(/\b20\d{2}\b/g) || [];
  const years = [...new Set(yearMatches)].sort();
  console.log(`\n  Anos encontrados: [${years.join(', ')}]`);

  // Detectar se tem indicação de exame
  const examIndicators = ['solicitacao', 'pedido', 'exame', 'tipo de exame', 'modalidade'];
  console.log('\n  Indicadores de exame:');
  for (const indicator of examIndicators) {
    const found = normalized.includes(indicator);
    console.log(`    ${found ? '✓' : '✗'} "${indicator}": ${found ? 'ENCONTRADO' : 'não encontrado'}`);
  }
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
