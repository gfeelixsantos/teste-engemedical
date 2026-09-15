import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const page = fs.readFileSync(new URL('../app/automacao/importacao-historico/page.tsx', import.meta.url), 'utf8');
const sidebar = fs.readFileSync(new URL('../components/shared/SidebarMenu.tsx', import.meta.url), 'utf8');

test('importacao de historico oferece a revisao evidence review', () => {
  assert.match(sidebar, /Importação de Histórico/);
  assert.match(sidebar, /\/automacao\/importacao-historico/);
  for (const label of ['Unidades e colaboradores', 'Documentos identificados', 'Confirmar importação', 'Cancelar processamento', 'Empresa alvo no SOC', 'Selecione a empresa alvo', 'Página anterior', 'Próxima página', 'Somente ASO', 'Pendências', 'Todas as unidades', 'Todas situações', 'Arquivo recebido']) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /resource=companies/);
  assert.match(page, /soc-export/);
});
