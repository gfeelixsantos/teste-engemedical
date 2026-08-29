import test from "node:test";
import assert from "node:assert/strict";

const { handleAuditLogsProxy } = await import(
  "../app/api/audit-logs/handler.mjs"
);
const { resolveAuditLogsProxyAuthContext } = await import(
  "../app/api/audit-logs/proxy.mjs"
);

test("monta Authorization e x-auth-user a partir do auth_token valido", async () => {
  const authToken = "token-principal";
  const refreshToken = "token-refresh";

  const context = await resolveAuditLogsProxyAuthContext({
    authToken,
    refreshToken,
    verifyJwt: async (token) =>
      token === authToken
        ? {
            codigo: "123",
            nome: "Master Teste",
            perfil: "MASTER",
            cpf: "",
            conselho: "",
            ufconselho: "",
            exp: 2000000000,
            iat: 1999990000,
          }
        : null,
  });

  assert.deepEqual(context, {
    authorizationHeader: "Bearer token-principal",
    authUserHeader:
      '{"codigo":"123","nome":"Master Teste","perfil":"MASTER","cpf":"","conselho":"","ufconselho":""}',
  });
});

test("usa refresh_token para reconstruir x-auth-user quando auth_token nao estiver disponivel", async () => {
  const refreshToken = "token-refresh";

  const context = await resolveAuditLogsProxyAuthContext({
    refreshToken,
    verifyJwt: async (token) =>
      token === refreshToken
        ? {
            codigo: "321",
            nome: "Master Refresh",
            perfil: "MASTER",
            cpf: "",
            conselho: "",
            ufconselho: "",
            exp: 2000000000,
            iat: 1999990000,
          }
        : null,
  });

  assert.deepEqual(context, {
    authorizationHeader: "Bearer token-refresh",
    authUserHeader:
      '{"codigo":"321","nome":"Master Refresh","perfil":"MASTER","cpf":"","conselho":"","ufconselho":""}',
  });
});

test("retorna null quando nenhum token valido esta disponivel", async () => {
  const context = await resolveAuditLogsProxyAuthContext({
    authToken: "token-invalido",
    refreshToken: "refresh-invalido",
    verifyJwt: async () => null,
  });

  assert.equal(context, null);
});

test("retorna 401 quando nenhum token valido esta disponivel no BFF", async () => {
  const response = await handleAuditLogsProxy({
    requestUrl: "https://cmso360-backend.fly.dev/audit-logs?page=1",
    authToken: undefined,
    refreshToken: undefined,
    verifyJwt: async () => null,
    fetchImpl: async () => {
      throw new Error("Nao deveria chamar o backend");
    },
  });

  assert.equal(response.status, 401);
  assert.equal(
    response.body,
    JSON.stringify({ message: "Nao autenticado." }),
  );
});

test("encaminha 403 do backend Nest sem alterar o corpo", async () => {
  const response = await handleAuditLogsProxy({
    requestUrl: "https://cmso360-backend.fly.dev/audit-logs?page=2",
    authToken: "token-principal",
    refreshToken: undefined,
    verifyJwt: async () => ({
      codigo: "123",
      nome: "Master Teste",
      perfil: "MASTER",
      cpf: "",
      conselho: "",
      ufconselho: "",
      exp: 2000000000,
      iat: 1999990000,
    }),
    fetchImpl: async (_url, options) => {
      assert.equal(options.method, "GET");
      assert.equal(
        options.headers.get("Authorization"),
        "Bearer token-principal",
      );
      assert.equal(
        options.headers.get("x-auth-user"),
        '{"codigo":"123","nome":"Master Teste","perfil":"MASTER","cpf":"","conselho":"","ufconselho":""}',
      );

      return {
        status: 403,
        headers: new Headers({ "Content-Type": "application/json" }),
        text: async () => JSON.stringify({ message: "Acesso negado" }),
      };
    },
  });

  assert.equal(response.status, 403);
  assert.equal(response.body, JSON.stringify({ message: "Acesso negado" }));
});

test("retorna 500 generico quando o BFF falha ao chamar o backend", async () => {
  const response = await handleAuditLogsProxy({
    requestUrl: "https://cmso360-backend.fly.dev/audit-logs?page=1",
    authToken: "token-principal",
    refreshToken: undefined,
    verifyJwt: async () => ({
      codigo: "123",
      nome: "Master Teste",
      perfil: "MASTER",
      cpf: "",
      conselho: "",
      ufconselho: "",
      exp: 2000000000,
      iat: 1999990000,
    }),
    fetchImpl: async () => {
      throw new Error("backend indisponivel");
    },
  });

  assert.equal(response.status, 500);
  assert.equal(
    response.body,
    JSON.stringify({ message: "Falha ao consultar logs de auditoria." }),
  );
});
