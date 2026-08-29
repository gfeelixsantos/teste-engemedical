import test from "node:test";
import assert from "node:assert/strict";

const { resolveAuditLogsErrorBehavior } = await import(
  "../app/configuracoes/components/sections/audit/error-behavior.mjs"
);

test("redireciona para login quando a consulta retorna 401", () => {
  assert.deepEqual(resolveAuditLogsErrorBehavior(401, "Nao autenticado"), {
    redirectTo: "/",
  });
});

test("redireciona para configuracoes quando a consulta retorna 403", () => {
  assert.deepEqual(resolveAuditLogsErrorBehavior(403, "Acesso negado"), {
    redirectTo: "/configuracoes",
  });
});

test("mostra mensagem generica quando a consulta retorna 5xx", () => {
  assert.deepEqual(resolveAuditLogsErrorBehavior(500, "Stack trace"), {
    message: "Erro ao carregar logs de auditoria.",
  });
});

test("preserva mensagem descritiva em erros 4xx nao autenticacao", () => {
  assert.deepEqual(resolveAuditLogsErrorBehavior(400, "Parametro invalido"), {
    message: "Parametro invalido",
  });
});
