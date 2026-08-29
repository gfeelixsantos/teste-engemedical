import test from "node:test";
import assert from "node:assert/strict";

const {
  GED_START_DATE,
  buildAvailableYears,
  buildAvailableMonths,
  buildBlobPeriodPrefix,
} = await import("../app/arquivos/lib/blob-explorer-periods.mjs");

test("usa 01/06/2025 como data inicial do GED", () => {
  assert.equal(GED_START_DATE, "2025-06-01");
});

test("gera anos disponiveis em ordem decrescente no intervalo historico", () => {
  const years = buildAvailableYears({
    startDate: GED_START_DATE,
    endDate: "2026-05-28",
  });

  assert.deepEqual(years, ["2026", "2025"]);
});

test("gera meses validos para o primeiro ano parcial", () => {
  const months = buildAvailableMonths("2025", {
    startDate: GED_START_DATE,
    endDate: "2026-05-28",
  });

  assert.deepEqual(months, ["12", "11", "10", "09", "08", "07", "06"]);
});

test("gera meses validos para o ano corrente parcial", () => {
  const months = buildAvailableMonths("2026", {
    startDate: GED_START_DATE,
    endDate: "2026-05-28",
  });

  assert.deepEqual(months, ["05", "04", "03", "02", "01"]);
});

test("monta prefixo do blob por periodo", () => {
  assert.equal(buildBlobPeriodPrefix({ ano: "2026", mes: "05" }), "aso/2026/05/");
});
