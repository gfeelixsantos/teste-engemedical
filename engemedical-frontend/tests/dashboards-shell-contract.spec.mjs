import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const layoutPath = path.join(root, "app", "dashboards", "layout.tsx");
const pagePaths = fs
  .readdirSync(path.join(root, "app", "dashboards"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(root, "app", "dashboards", entry.name, "page.tsx"))
  .filter((file) => fs.existsSync(file));

test("dashboard usa HeaderApp acima da área com sidebar", () => {
  const source = fs.readFileSync(layoutPath, "utf8");

  assert.match(source, /import \{ HeaderApp \}/);
  assert.match(source, /<HeaderApp onLogout=/);
  assert.match(source, /<SidebarMenu \/>/);
  assert.match(source, /flex min-h-0 flex-1/);
});

test("páginas internas de dashboard não duplicam HeaderApp", () => {
  for (const pagePath of pagePaths) {
    const source = fs.readFileSync(pagePath, "utf8");
    assert.doesNotMatch(source, /import .*HeaderApp/);
    assert.doesNotMatch(source, /<HeaderApp/);
  }
});

