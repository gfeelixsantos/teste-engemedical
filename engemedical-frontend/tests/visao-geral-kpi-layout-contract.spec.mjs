import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs
  .readFileSync(
    path.join(here, "../app/dashboard/components/StatisticsSection.tsx"),
    "utf8",
  )
  .replace(/\r\n?/g, "\n");

const metricBlock = source.match(
  /const OperationalMetric[\s\S]*?\n\);\n\n\/\/ 📊 Barra de progresso horizontal/,
);

test("cards compactos preservam legibilidade e área estável para o ícone", () => {
  assert.ok(metricBlock, "não encontrou o componente OperationalMetric");

  const card = metricBlock[0];
  assert.match(card, /min-w-0/, "o conteúdo textual precisa permitir encolhimento seguro");
  assert.match(card, /leading-tight/, "os títulos precisam de entrelinha compacta");
  assert.match(card, /font-(?:semibold|bold)/, "títulos ou valores precisam de peso forte");
  assert.match(card, /h-8 w-8 shrink-0/, "o ícone precisa de uma área estável");
});
