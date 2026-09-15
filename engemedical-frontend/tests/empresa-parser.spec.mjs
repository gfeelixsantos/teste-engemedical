import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("parseEmpresaCodes splits dash-separated company codes", async () => {
  const source = await read("lib/user/empresa-parser.ts");

  assert.match(source, /export function parseEmpresaCodes/);
  assert.match(source, /\.split\("-"\)/);
  assert.match(source, /\.map\(\(c\) => c\.trim\(\)\)/);
  assert.match(source, /\.filter\(Boolean\)/);
});

test("fetchEmpresasFromBackend calls NEST_URL soc/empresas", async () => {
  const source = await read("lib/user/empresa-parser.ts");

  assert.match(source, /export async function fetchEmpresasFromBackend/);
  assert.match(source, /fetch\(\`\$\{NEST_URL\}soc\/empresas\`\)/);
  assert.match(source, /codes\.includes\(String\(e\.CODIGO\)\)/);
});

test("getEmpresasFromRegistrationCode uses backend on server, IndexedDB on client", async () => {
  const source = await read("lib/user/empresa-parser.ts");

  assert.match(source, /export async function getEmpresasFromRegistrationCode/);
  assert.match(source, /typeof window === "undefined"/);
  assert.match(source, /fetchEmpresasFromBackend\(validCodes\)/);
  assert.match(source, /await import\("\.\.\/indexDb\/indexdb"\)/);
});

test("empresa-parser validates company codes are 3-10 digit numbers", async () => {
  const source = await read("lib/user/empresa-parser.ts");

  assert.match(source, /function isValidEmpresaCode/);
  assert.match(source, /\{3,10\}/);
});

test("getEmpresaCodes is a thin wrapper around parseEmpresaCodes", async () => {
  const source = await read("lib/user/empresa-parser.ts");

  assert.match(source, /export function getEmpresaCodes/);
  assert.match(source, /return parseEmpresaCodes\(registrationCode\)/);
});

test("isRegistrationCodeEmpty handles undefined and empty strings", async () => {
  const source = await read("lib/user/empresa-parser.ts");

  assert.match(source, /export function isRegistrationCodeEmpty/);
  assert.match(source, /!registrationCode/);
  assert.match(source, /!registrationCode\.trim\(\)/);
});

test("EmpresaParseResult interface has required fields", async () => {
  const source = await read("lib/user/empresa-parser.ts");

  assert.match(source, /export interface EmpresaParseResult/);
  assert.match(source, /empresas: CadastroEmpresa\[\]/);
  assert.match(source, /missingCodes: string\[\]/);
  assert.match(source, /invalidCodes: string\[\]/);
  assert.match(source, /originalCode: string/);
});
