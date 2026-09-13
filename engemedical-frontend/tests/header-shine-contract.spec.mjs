import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("header possui filete shine sutil alinhado à paleta", () => {
  const header = read("components/shared/HeaderApp.tsx");
  const styles = read("styles/globals.css");

  assert.match(header, /header-brand-shine/);
  assert.match(styles, /\.header-brand-shine::after/);
  assert.match(styles, /brand-cyan-rgb/);
  assert.match(styles, /brand-green-rgb/);
  assert.match(styles, /linear-gradient\(\s*90deg[\s\S]*brand-cyan-rgb[\s\S]*brand-green-rgb/);
  assert.match(styles, /height: 2px/);
  assert.match(styles, /opacity: 0\.9/);
  assert.match(styles, /prefers-reduced-motion/);
});
