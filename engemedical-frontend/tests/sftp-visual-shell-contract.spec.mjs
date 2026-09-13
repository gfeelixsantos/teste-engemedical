import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pagePath = path.resolve("app/sftp-integracao/page.tsx");
const page = fs.readFileSync(pagePath, "utf8");
const layout = fs.readFileSync(
  path.resolve("app/sftp-integracao/layout.tsx"),
  "utf8",
);

test("SFTP uses the shared fixed application shell", () => {
  assert.match(page, /<HeaderApp[\s\S]*?fixed/);
  assert.match(page, /fixed left-0 top-16/);
  assert.match(page, /lg:ml-56/);
  assert.match(page, /bg-gradient-to-br from-gray-50 to-gray-100/);
  assert.match(page, /font-display/);
});

test("SFTP does not create a competing inner scroll container", () => {
  assert.doesNotMatch(page, /h-\[calc\(100vh-4rem\)\] overflow-y-auto/);
  assert.doesNotMatch(page, /sticky top-16 relative/);
  assert.doesNotMatch(layout, /h-full flex-col/);
});
