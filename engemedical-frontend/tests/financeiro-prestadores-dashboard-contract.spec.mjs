import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboards financeiros e SOCNET possuem rota, padrão Power BI e refresh', () => {
  const financeiro = read('app/dashboards/financeiro/page.tsx');
  const socnet = read('app/dashboards/prestadores-socnet/page.tsx');
  for (const source of [financeiro, socnet]) {
    assert.match(source, /Power BI Integrated/);
    assert.match(source, /Atualizar Dados/);
    assert.match(source, /ResponsiveContainer/);
    assert.match(source, /useQuery/);
  }
  assert.match(financeiro, /financeiro\/dashboard/);
  assert.match(socnet, /prestadores-dashboard\/dashboard/);
});

test('menu e índice de dashboards exibem os nomes oficiais', () => {
  const menu = read('components/shared/SidebarMenu.tsx');
  const index = read('app/dashboards/page.tsx');
  for (const source of [menu, index]) {
    assert.match(source, /Gestão Financeira/);
    assert.match(source, /Prestadores SOCNET/);
  }
});
