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

test("aplica tratamento premium sem impor movimento", () => {
  const source = fs.readFileSync(loadingPath, "utf8");

  assert.match(source, /logo\.png/);
  assert.match(source, /backdrop-blur/);
  assert.match(source, /animate-shimmer/);
  assert.match(source, /motion-reduce/);
});
