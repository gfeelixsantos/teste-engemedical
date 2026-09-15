import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("user.service uses getEmpresasFromRegistrationCode (fetches from backend on server)", async () => {
  const userService = await read("lib/user/services/user.service.ts");

  assert.match(userService, /import.*getEmpresasFromRegistrationCode.*from.*empresa-parser/);
  assert.match(userService, /await getEmpresasFromRegistrationCode\(registrationCode\)/);
});

test("user.service does not import or reference IndexDb", async () => {
  const userService = await read("lib/user/services/user.service.ts");

  assert.doesNotMatch(userService, /import.*IndexDb.*from/);
  assert.doesNotMatch(userService, /IndexDb\./);
  assert.doesNotMatch(userService, /openDB/);
});

test("user.service attaches empresa data to userInfo for client users", async () => {
  const userService = await read("lib/user/services/user.service.ts");

  assert.match(userService, /empresaResult\.empresas/);
  assert.match(userService, /empresas: empresaResult\.empresas/);
});

test("empresa-parser has fetchEmpresasFromBackend for server-side fetch", async () => {
  const parser = await read("lib/user/empresa-parser.ts");

  assert.match(parser, /export async function fetchEmpresasFromBackend/);
  assert.match(parser, /NEST_URL/);
});

test("empresa-parser dynamically imports IndexDb only inside getEmpresasFromRegistrationCode", async () => {
  const parser = await read("lib/user/empresa-parser.ts");

  assert.match(parser, /await import\("\.\.\/indexDb\/indexdb"\)/);
  assert.match(parser, /typeof window === "undefined"/);
});

test("api/auth route does not directly import empresa-parser or IndexDb", async () => {
  const authRoute = await read("app/api/auth/route.ts");

  assert.doesNotMatch(authRoute, /import.*empresa-parser/);
  assert.doesNotMatch(authRoute, /import.*IndexDb/);
  assert.doesNotMatch(authRoute, /import.*indexdb/);
});
