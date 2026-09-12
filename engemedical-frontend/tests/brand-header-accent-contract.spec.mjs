import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("identidade do usuário usa a paleta Engemedical no dashboard e header", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const header = read("components/shared/HeaderApp.tsx");

  assert.match(dashboard, /from-brand-700/);
  assert.match(dashboard, /to-brand-green-600/);
  assert.match(header, /bg-brand-700/);
  assert.match(header, /bg-brand-green-500/);
});
