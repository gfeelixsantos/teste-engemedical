import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const tailwind = fs.readFileSync(path.join(root, "tailwind.config.js"), "utf8");
const globals = fs.readFileSync(path.join(root, "styles", "globals.css"), "utf8");

test("tokens de marca refletem as cores principais do logo", () => {
  assert.match(tailwind, /#28B1CF/i);
  assert.match(tailwind, /#006782/i);
  assert.match(tailwind, /#00C853/i);
  assert.match(tailwind, /#0B9516/i);
  assert.match(tailwind, /#04151F/i);
});

test("tema claro e dark possuem superfícies e contraste próprios", () => {
  assert.match(globals, /--brand-cyan/);
  assert.match(globals, /--brand-teal/);
  assert.match(globals, /--brand-green/);
  assert.match(globals, /--app-surface/);
  assert.match(globals, /\.dark/);
});

