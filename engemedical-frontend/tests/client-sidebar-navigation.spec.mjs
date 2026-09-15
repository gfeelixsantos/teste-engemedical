import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sidebar = await readFile(
  new URL("../components/cliente/SidebarCliente.tsx", import.meta.url),
  "utf8",
);

test("incorpora admissão ao grupo de funcionários por empresa", () => {
  assert.doesNotMatch(
    sidebar,
    /\{ title: "Admissão", icon: UserPlus, path: "\/cliente\/admissao" \}/,
  );
  assert.match(
    sidebar,
    /\{ title: "Funcionários", icon: Users, path: "\/cliente\/funcionarios", showAdmission: true \}/,
  );
  assert.match(sidebar, /showAdmission/);
  assert.match(sidebar, /goTo\("\/cliente\/admissao", empresa\)/);
  assert.match(sidebar, /className="flex items-center gap-1\.5"/);
  assert.match(sidebar, /className=\{`group flex min-w-0 flex-1/);
  assert.match(sidebar, /className="group flex shrink-0/);
});

test("mantém a gestão como ação principal da empresa e abre submenu para uma única empresa", () => {
  assert.match(sidebar, /onClick=\{\(\) => goTo\(item\.path, empresa\)\}/);
  assert.match(sidebar, /empresas\.length === 1 && !item\.showAdmission/);
});
