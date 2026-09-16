import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboards = [
  ['convocacao', 'Controle de Convocações de Exames'],
  ['documentos', 'Documentos SST'],
  ['esocial', 'eSocial'],
  ['vidas', 'Gestão de Vidas'],
  ['profissionais', 'Profissionais'],
  ['volumetria', 'Volumetria de Agendamentos'],
];

for (const [name, title] of dashboards) {
  test(`${name} usa o header compartilhado de dashboards`, async () => {
    const source = await readFile(new URL(`../app/dashboards/${name}/page.tsx`, import.meta.url), 'utf8');
    assert.match(source, /DashboardPageHeader/);
    assert.match(source, new RegExp(`title="${title}"`));
  });
}
