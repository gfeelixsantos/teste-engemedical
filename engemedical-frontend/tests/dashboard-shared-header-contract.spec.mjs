import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const header = await readFile(new URL('../components/shared/DashboardPageHeader.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/dashboards/absenteismo/page.tsx', import.meta.url), 'utf8');

test('posiciona retorno à esquerda e ícone temático à direita', () => {
  assert.match(header, /DashboardPageHeader/);
  assert.match(header, /ArrowLeft/);
  assert.match(header, /RefreshCw/);
  assert.match(header, /onRefresh/);
  assert.match(header, /backHref/);
  assert.match(header, /backLabel = 'Voltar'/);
  assert.match(header, /justify-between/);
  assert.match(header, /Icon/);
  assert.match(header, /items-center justify-center gap-3/);
  assert.doesNotMatch(header, /bg-white shadow-sm/);
  assert.match(page, /DashboardPageHeader/);
  assert.doesNotMatch(page, /AutomationPageHeader/);
});
