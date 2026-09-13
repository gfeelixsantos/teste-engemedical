import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Atendimento e Recepção usam o shell operacional da marca", () => {
  const atendimento = read("app/atendimento/page.tsx");
  const recepcao = read("app/recepcao/page.tsx");
  const sidebar = read("components/shared/Sidebar.tsx");

  assert.match(atendimento, /bg-brand-surface/);
  assert.match(recepcao, /bg-brand-surface/);
  assert.match(recepcao, /w-64 shrink-0 bg-brand-navy/);
  assert.match(sidebar, /w-64 min-h-0 bg-brand-navy/);
  assert.doesNotMatch(recepcao, /bg-red/);
});
