import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("visão geral contextualiza ausência de dados dos indicadores", () => {
  const statistics = read("app/dashboard/components/StatisticsSection.tsx");

  assert.match(statistics, /Ainda não há atendimentos registrados hoje/);
  assert.match(statistics, /Aguardando dados do período/);
  assert.match(statistics, /statusTotal\.toLocaleString\("pt-BR"\)/);
  assert.doesNotMatch(statistics, /Nenhum status disponível/);
  assert.match(statistics, /totais\?\.atendimentosPrevistos > 0/);
  assert.match(statistics, /const hasEfficiencyBase = \(totais\?\.atendimentosPrevistos \?\? 0\) > 0/);
  assert.match(statistics, /hasEfficiencyBase \? `\$\{eficienciaOperacional\}%` : "—"/);
  assert.match(
    statistics,
    /!hasEfficiencyBase[\s\S]*Aguardando dados do período/
  );
  assert.match(statistics, /max-w-\[14rem\].*text-center/);
});
