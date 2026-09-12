import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("header oferece command palette para navegação global", () => {
  const header = read("components/shared/HeaderApp.tsx");
  const palette = read("components/shared/CommandPalette.tsx");

  assert.match(header, /CommandPalette/);
  assert.match(palette, /ctrlKey|metaKey/);
  assert.match(palette, /SIDEBAR_GROUPS/);
  assert.match(palette, /role="dialog"/);
});
