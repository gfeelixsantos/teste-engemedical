import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../app/dashboard/components/StatisticsSection.tsx", import.meta.url),
  "utf8",
);

test("resume os indicadores em um painel operacional compacto", () => {
  assert.match(source, /Resumo operacional/);
  assert.match(source, /Distribuição dos atendimentos/);
  assert.match(source, /PieChart/);
  assert.match(source, /Atendimentos previstos/);
  assert.match(source, /Exames realizados/);
  assert.match(source, /Aguardando resultados/);
  assert.match(source, /Aguardando avaliação médica/);
  assert.doesNotMatch(source, /name: "D-4"/);
});
