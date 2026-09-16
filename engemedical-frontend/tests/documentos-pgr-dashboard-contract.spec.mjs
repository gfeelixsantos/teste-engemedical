import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/dashboards/documentos/page.tsx', import.meta.url), 'utf8');
const component = await readFile(new URL('../app/dashboards/documentos/components/AcoesPgrSection.tsx', import.meta.url), 'utf8');
const table = await readFile(new URL('../app/dashboards/documentos/components/AcoesPgrTable.tsx', import.meta.url), 'utf8');

test('inclui a seção de gestão de ações PGR no dashboard de documentos', () => {
  assert.match(page, /AcoesPgrSection/);
  assert.match(page, /data\?\.acoesPgr/);
  assert.ok(page.indexOf('<VigenciaUnidadeCardsSection') < page.indexOf('<AcoesPgrSection'));
  assert.match(page, /DetalhamentoTab/);
  assert.match(page, /Documentos SST/);
  assert.match(page, /Ações do PGR/);
  assert.match(component, /Gestão de Ações - PGR/);
  assert.match(component, /Prioridade/);
  assert.match(component, /porSituacao/);
  assert.match(table, /Detalhamento das Ações do PGR/);
});
