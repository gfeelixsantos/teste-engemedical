import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("login uses connection language and has a recoverable request timeout", async () => {
  const login = await read("components/login/login.tsx");

  assert.match(login, /Conectar/);
  assert.match(login, /Conectando\.\.\./);
  assert.match(login, /AbortController/);
  assert.match(login, /LOGIN_REQUEST_TIMEOUT_MS\s*=\s*30000/);
});

test("expected aborts are not logged as raw console errors", async () => {
  const utils = await read("lib/utils.ts");

  assert.match(utils, /errorName !== ["']AbortError["']/);
});

test("auth route handles empty request bodies without throwing JSON parse errors", async () => {
  const authRoute = await read("app/api/auth/route.ts");

  assert.match(authRoute, /await req\.text\(\)/);
  assert.match(authRoute, /if \(!rawBody\.trim\(\)\)/);
  assert.match(authRoute, /JSON\.parse\(rawBody\)/);
});

test("SFTP treats an empty execution history as neutral state", async () => {
  const apiRoute = await read("app/sftp-integracao/api/route.ts");
  const page = await read("app/sftp-integracao/page.tsx");

  assert.match(
    apiRoute,
    /lastExecutionStatus:\s*kpisRuns\.runs\?\.\[0\]\?\.status\s*\|\|\s*null/,
  );
  assert.match(page, /Integração monitorada/);
  assert.match(page, /Sem histórico|Ainda não executada/);
});
