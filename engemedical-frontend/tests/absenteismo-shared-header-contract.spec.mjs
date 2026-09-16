import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/dashboards/absenteismo/page.tsx', import.meta.url), 'utf8');

test('usa o cabeçalho compartilhado de dashboard no dashboard de absenteísmo', () => {
  assert.match(page, /DashboardPageHeader/);
  assert.match(page, /title="Absenteísmo"/);
  assert.match(page, /subtitle=/);
  assert.match(page, /UserX/);
});
