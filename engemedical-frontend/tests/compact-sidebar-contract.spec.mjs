import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("shells de navegação usam sidebar compacta e superfície dark suavizada", () => {
  const dashboardLayout = read("app/dashboards/layout.tsx");
  const dashboardPage = read("app/dashboard/page.tsx");
  const servicesLayout = read("app/servicos/layout.tsx");
  const automationPage = read("app/automacao/coleta-resultados/page.tsx");

  for (const source of [dashboardLayout, dashboardPage, servicesLayout, automationPage]) {
    assert.match(source, /w-56/);
    assert.match(source, /bg-brand-deep/);
  }
});
