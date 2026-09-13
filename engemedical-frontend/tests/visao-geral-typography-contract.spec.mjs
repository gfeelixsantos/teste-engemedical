import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("visão geral aplica tipografia de destaque aos títulos principais", () => {
  const page = read("app/dashboard/page.tsx");
  const statistics = read("app/dashboard/components/StatisticsSection.tsx");

  const welcomeTitle = page.match(
    /<h1\n\s+className="([^"]+)"\n\s+id="welcome-title"/,
  );
  assert.ok(welcomeTitle, "não encontrou o título principal da visão geral");
  assert.match(welcomeTitle[1], /(?:^|\s)font-display(?:\s|$)/);
  assert.match(welcomeTitle[1], /font-(?:bold|extrabold)/);

  const operationalTitle = statistics.match(
    /<h2 className="([^"]+)">\s*Resumo Operacional/,
  );
  assert.ok(operationalTitle, "não encontrou o título Resumo Operacional");
  assert.match(operationalTitle[1], /(?:^|\s)font-display(?:\s|$)/);
  assert.match(operationalTitle[1], /font-(?:bold|extrabold)/);

  assert.match(statistics, /font-medium|font-semibold/);
});
