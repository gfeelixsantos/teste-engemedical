const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appModulePath = path.join(__dirname, "..", "src", "app.module.ts");
const appModuleSource = fs.readFileSync(appModulePath, "utf8");

test("AppModule importa o BlobProxyModule", () => {
  assert.match(
    appModuleSource,
    /import\s+\{\s*BlobProxyModule\s*\}\s+from\s+['"]\.\/blob-proxy\/blob-proxy\.module['"]/,
  );
});

test("AppModule registra o BlobProxyModule no array de imports", () => {
  assert.match(appModuleSource, /imports:\s*\[[\s\S]*\bBlobProxyModule\b[\s\S]*\]/);
});
