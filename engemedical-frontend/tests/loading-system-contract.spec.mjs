import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const loadingPath = path.join(root, "components", "shared", "LoadingState.tsx");

test("define o contrato das três variantes de carregamento", () => {
  const source = fs.readFileSync(loadingPath, "utf8");

  assert.match(source, /export type LoadingVariant = [\s\S]*page/);
  assert.match(source, /section/);
  assert.match(source, /action/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="status"/);
});

test("mantém a identidade Engemedical nas variantes de página e seção", () => {
  const source = fs.readFileSync(loadingPath, "utf8");

  assert.match(source, /icone\.png/);
  assert.doesNotMatch(source, /engemedical_icone\.png/);
  assert.match(source, /brand-cyan/);
  assert.match(source, /brand-lime/);
  assert.match(source, /variant === "page"/);
  assert.match(source, /section: "min-h-\[220px\]/);
});

test("mantém o carregamento interno premium e discreto", () => {
  const source = fs.readFileSync(loadingPath, "utf8");

  assert.match(source, /loading-circular-progress/);
  assert.match(source, /loading-circular-track/);
});

test("loading não carrega as cores institucionais antigas", () => {
  const source = fs.readFileSync(loadingPath, "utf8");

  assert.doesNotMatch(source, /#03121f|#052439|#071c1a|#0698C2/);
  assert.match(source, /bg-white/);
  assert.match(source, /brand-cyan|brand-green/);
});

test("loading interno usa composição leve sem tela cyber", () => {
  const source = fs.readFileSync(loadingPath, "utf8");

  assert.doesNotMatch(
    source,
    /loading-page-glow|loading-page-grid|backdrop-blur|loading-wave/,
  );
  assert.doesNotMatch(source, /src="\/images\/logo\.png"/);
  assert.match(source, /loading-circular-progress/);
  assert.match(source, /title = "Carregando"/);
});

test("loading interno usa anel circular maior, sem borda externa e com paleta do tema", () => {
  const source = fs.readFileSync(loadingPath, "utf8");

  assert.match(source, /loading-circular-progress/);
  assert.match(source, /h-16 w-16/);
  assert.match(source, /loading-circular-track/);
  assert.match(source, /loading-circular-progress/);
  assert.doesNotMatch(source, /rounded-2xl.*border|border.*rounded-2xl/);
});

test("loading de página usa o mesmo anel circular contextual", () => {
  const source = fs.readFileSync(loadingPath, "utf8");

  assert.match(source, /loading-circular-progress/);
  assert.match(source, /min-h-\[320px\]/);
  assert.doesNotMatch(source, /loading-progress/);
});
