import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const headerPath = path.join(
  root,
  "components/shared/AutomationPageHeader.tsx",
);
const pages = [
  ["automacao/coleta-resultados", "Coleta de Resultados", "ScanLine"],
  ["automacao/importacao-historico", "Importação de Histórico", "FileText"],
  ["automacao/inativacao-massa", "Inativação em Massa", "UserMinus"],
  ["sftp-integracao", "Integrações SFTP", "Server"],
];

assert.equal(
  fs.existsSync(headerPath),
  true,
  "cabeçalho compartilhado ausente",
);
const header = fs.readFileSync(headerPath, "utf8");
assert.match(header, /export function AutomationPageHeader/);
assert.match(header, /text-brand-700/);
assert.match(header, /text-\[#00A63C\]/);
assert.match(header, /strokeWidth=\{3\}/);

for (const [route, title, icon] of pages) {
  const page = fs.readFileSync(
    path.join(root, `app/${route}/page.tsx`),
    "utf8",
  );
  assert.match(page, /AutomationPageHeader/);
  assert.match(page, new RegExp(`title=["']${title}["']`));
  assert.match(page, new RegExp(`icon=\\{${icon}\\}`));
}

console.log("automation pages visual contract ok");
