import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("EmpresaProvider is a client component", async () => {
  const provider = await read("components/cliente/EmpresaProvider.tsx");

  assert.match(provider, /^"use client";/);
});

test("EmpresaProvider imports IndexDb and parseEmpresaCodes for client-side lookup", async () => {
  const provider = await read("components/cliente/EmpresaProvider.tsx");

  assert.match(provider, /import.*IndexDb.*from.*indexDb/);
  assert.match(provider, /import.*parseEmpresaCodes.*from.*empresa-parser/);
});

test("EmpresaProvider fetches companies from IndexedDB using getCompanyById", async () => {
  const provider = await read("components/cliente/EmpresaProvider.tsx");

  assert.match(provider, /IndexDb\.getCompanyById\(code\)/);
});

test("EmpresaProvider uses EmpresaStatus enum with all required states", async () => {
  const provider = await read("components/cliente/EmpresaProvider.tsx");

  assert.match(provider, /export type EmpresaStatus/);
  assert.match(provider, /"loading"/);
  assert.match(provider, /"empty_registration_code"/);
  assert.match(provider, /"no_companies"/);
  assert.match(provider, /"missing_companies"/);
  assert.match(provider, /"error"/);
  assert.match(provider, /"ok"/);
});

test("EmpresaProvider persists selected empresa in sessionStorage", async () => {
  const provider = await read("components/cliente/EmpresaProvider.tsx");

  assert.match(provider, /sessionStorage\.getItem\("selectedEmpresaId"\)/);
  assert.match(provider, /sessionStorage\.setItem\("selectedEmpresaId"/);
  assert.match(provider, /sessionStorage\.removeItem\("selectedEmpresaId"\)/);
});

test("EmpresaProvider exposes useEmpresas hook", async () => {
  const provider = await read("components/cliente/EmpresaProvider.tsx");

  assert.match(provider, /export function useEmpresas\(\)/);
  assert.match(provider, /return useContext\(EmpresaContext\)/);
});

test("EmpresaProvider validates codes with regex 3-10 digits", async () => {
  const provider = await read("components/cliente/EmpresaProvider.tsx");

  assert.match(provider, /\{3,10\}/);
});

test("EmpresaProvider reads empresas from user.empresas (server-delivered) first, IndexedDB as fallback", async () => {
  const provider = await read("components/cliente/EmpresaProvider.tsx");

  assert.match(provider, /serverEmpresas/);
  assert.match(provider, /IndexDb\.getCompanyById\(code\)/);
  assert.match(provider, /IndexDb\.saveCompanies\(serverEmpresas\)/);
});

test("SidebarCliente uses EmpresaProvider context", async () => {
  const sidebar = await read("components/cliente/SidebarCliente.tsx");

  assert.match(sidebar, /import.*useEmpresas.*from.*EmpresaProvider/);
  assert.match(sidebar, /useEmpresas\(\)/);
  assert.match(sidebar, /selectedEmpresa/);
});

test("SidebarCliente has empty state with support contact", async () => {
  const sidebar = await read("components/cliente/SidebarCliente.tsx");

  assert.match(sidebar, /SidebarEmptyState/);
  assert.match(sidebar, /suporte@engemedical\.com\.br/);
  assert.match(sidebar, /Contatar suporte/);
});

test("cliente layout wraps children in EmpresaProvider", async () => {
  const layout = await read("app/cliente/layout.tsx");

  assert.match(layout, /import.*EmpresaProvider/);
  assert.match(layout, /<EmpresaProvider>/);
  assert.match(layout, /<\/EmpresaProvider>/);
  assert.match(layout, /import.*SidebarCliente/);
  assert.match(layout, /import.*CompanySelector/);
});
