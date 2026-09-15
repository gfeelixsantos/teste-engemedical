import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(testsDirectory, "..");
const routePath = path.join(
  frontendDirectory,
  "app",
  "api",
  "cliente",
  "funcionarios",
  "route.ts",
);
const typesPath = path.join(
  frontendDirectory,
  "lib",
  "cliente",
  "funcionarios",
  "types.ts",
);
const hookPath = path.join(frontendDirectory, "hooks", "useClienteFuncionarios.ts");

function readContractFile(filePath) {
  assert.ok(fs.existsSync(filePath), `arquivo de contrato ausente: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

test("BFF rejeita empresa ausente ou fora do formato numérico", () => {
  const route = readContractFile(routePath);

  assert.match(route, /searchParams\.get\(["']empresa["']\)/);
  assert.match(route, /empresa.*\\d\{3,10\}/s);
  assert.match(route, /status:\s*400/);
});

test("BFF encaminha somente a allowlist fixa e não repassa Authorization do cliente", () => {
  const route = readContractFile(routePath);

  assert.match(route, /new URL\(/);
  assert.match(route, /URLSearchParams/);
  assert.match(route, /empresa.*page.*limit.*q.*status/s);
  assert.doesNotMatch(route, /incomingUrl\.search/);
  assert.doesNotMatch(route, /req\.headers\s*\.get\(["']authorization["']\)/);
  assert.doesNotMatch(route, /\.headers\s*=\s*req\.headers/);
});

test("BFF usa cookies para o bearer, no-store e preserva status/content-type upstream", () => {
  const route = readContractFile(routePath);

  assert.match(route, /cookies\(\)/);
  assert.match(route, /JWT\.verifyJwt/);
  assert.match(route, /resolveAuthProxyContextFromTokens/);
  assert.match(route, /Authorization\s*[:=].*Bearer/s);
  assert.match(route, /cache:\s*["']no-store["']/);
  assert.match(route, /status:\s*response\.status/);
  assert.match(route, /response\.headers\.get\(["']Content-Type["']\)/);
  assert.match(route, /headers\.set\(["']Authorization["']/);
});

test("BFF converte falha local de fetch em JSON seguro 502", () => {
  const route = readContractFile(routePath);

  assert.match(route, /catch\s*\(/);
  assert.match(route, /status:\s*502/);
  assert.match(route, /NextResponse\.json\(\{\s*message:/s);
  assert.doesNotMatch(route, /error\.(?:stack|message)/);
});

test("BFF bloqueia sessão ausente ou inválida antes de chamar o Nest", () => {
  const route = readContractFile(routePath);

  assert.match(route, /if \(!bearerToken\)/);
  assert.match(route, /Sessão ausente ou inválida/);
  assert.match(route, /status:\s*401/);
});

test("tipos reproduzem o contrato público de funcionários", () => {
  const types = readContractFile(typesPath);

  for (const status of [
    "ATENDIMENTO",
    "AGUARDANDO_RESULTADOS",
    "AVALIACAO_MEDICA",
    "AGENDADO",
    "PENDENTE",
    "EXPIRADO",
    "EXPIRANDO",
    "VALIDO",
  ]) {
    assert.match(types, new RegExp(`['"]${status}['"]`));
  }

  for (const declaration of [
    "FuncionarioStatus",
    "ClienteFuncionarioItem",
    "ClienteFuncionariosResponse",
    "ClienteFuncionariosQuery",
    "ClienteFuncionariosError",
  ]) {
    assert.match(types, new RegExp(`(?:type|interface)\\s+${declaration}\\b`));
  }

  for (const field of [
    "empresa",
    "codigo",
    "nome",
    "matricula",
    "cpfMasked",
    "cargo",
    "unidade",
    "situacao",
    "dataAdmissao",
    "dataDemissao",
    "status",
    "statusLabel",
    "statusReason",
    "schedulingId",
    "schedulingDate",
    "page",
    "limit",
    "total",
    "hasNextPage",
  ]) {
    assert.match(types, new RegExp(`\\b${field}\\s*:`));
  }
});

test("hook é cancelável, não aplica paginação internamente e evita estado stale", () => {
  const hook = readContractFile(hookPath);

  assert.match(hook, /useClienteFuncionarios\s*\(/);
  assert.match(hook, /useEffect/);
  assert.match(hook, /new AbortController\(\)/);
  assert.match(hook, /signal:\s*controller\.signal/);
  assert.match(hook, /controller\.abort\(\)/);
  assert.match(hook, /(?:cancelled|active|requestId|generation)/);
  assert.match(hook, /\[.*empresaCodigo.*page.*limit.*q.*status.*\]/s);
  assert.doesNotMatch(hook, /setPage\s*\(/);
  assert.match(hook, /refetch/);
});

test("hook classifica acesso, upstream e demais erros", () => {
  const hook = readContractFile(hookPath);

  assert.match(hook, /401/);
  assert.match(hook, /403/);
  assert.match(hook, /502/);
  assert.match(hook, /504/);
  assert.match(hook, /kind:\s*["']access["']/);
  assert.match(hook, /kind:\s*["']upstream["']/);
  assert.match(hook, /kind:\s*["']unknown["']/);
});
