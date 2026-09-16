import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../app/dashboards/', import.meta.url);
const tableFiles = [
  'absenteismo/components/DetalhesTable.tsx',
  'absenteismo/components/TabelaGeralAbsenteismo.tsx',
  'convocacao/page.tsx',
  'documentos/components/DetalhamentoTable.tsx',
  'documentos/components/DetalhamentoDocumentosTable.tsx',
  'esocial/components/TabelaEventosDetalhados.tsx',
  'profissionais/components/DadosGeraisProfissionaisTable.tsx',
  'vidas/components/RegistrosTable.tsx',
  'vidas/components/TabelaGeralVidas.tsx',
  'volumetria/components/DrilldownTable.tsx',
  'volumetria/components/DadosGeraisTable.tsx',
];

test('tabelas finais usam paginação de 10 itens', () => {
  for (const relativePath of tableFiles) {
    const source = fs.readFileSync(new URL(relativePath, root), 'utf8');
    assert.match(source, /(?:PAGE_SIZE|limit:\s*)\s*[:=]?\s*['"]?10\b/, relativePath);
  }
});

test('tabelas finais usam tipografia operacional padronizada', () => {
  for (const relativePath of tableFiles) {
    const source = fs.readFileSync(new URL(relativePath, root), 'utf8');
    assert.match(source, /text-xs|text-\[12px\]/, relativePath);
  }
});
