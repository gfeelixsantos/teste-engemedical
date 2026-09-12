import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("sidebar principal usa superfícies dark da marca", () => {
  const sidebar = read("components/shared/SidebarMenu.tsx");
  const dashboards = read("app/dashboards/layout.tsx");

  assert.match(sidebar, /bg-brand-deep/);
  assert.match(sidebar, /text-white/);
  assert.match(sidebar, /bg-brand-teal/);
  assert.match(dashboards, /bg-brand-deep/);
});
