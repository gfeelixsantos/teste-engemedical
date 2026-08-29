import test from "node:test";
import assert from "node:assert/strict";

const { handleFacialProxy } = await import("../app/api/facial/proxy.mjs");

function createJsonRequest(method, body, url = "http://localhost/api/facial/session") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const authPayload = {
  codigo: "USR-001",
  nome: "Felix",
  perfil: "MASTER",
  cpf: "12345678909",
  conselho: "",
  ufconselho: "",
  exp: 2000000000,
  iat: 1999990000,
};

test("proxy facial exige autenticacao valida", async () => {
  const response = await handleFacialProxy({
    request: createJsonRequest("POST", { schedulingId: "sched-1" }),
    authToken: undefined,
    refreshToken: undefined,
    verifyJwt: async () => null,
    fetchImpl: async () => {
      throw new Error("nao deveria chamar o backend");
    },
    backendBaseUrl: "https://backend/",
    endpoint: "facial/session",
    method: "POST",
  });

  assert.equal(response.status, 401);
});

test("proxy facial encaminha Authorization e x-auth-user sem enviar user no body", async () => {
  const response = await handleFacialProxy({
    request: createJsonRequest("POST", {
      schedulingId: "sched-1",
      requestId: "req_123",
      documentNonce: "doc-1",
      user: { codigo: "forjado" },
    }, "http://localhost/api/facial/finalize"),
    authToken: "token",
    refreshToken: undefined,
    verifyJwt: async () => authPayload,
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://backend/facial/finalize");
      assert.equal(options.headers.get("Authorization"), "Bearer token");
      assert.equal(
        options.headers.get("x-auth-user"),
        JSON.stringify({
          codigo: "USR-001",
          nome: "Felix",
          perfil: "MASTER",
          cpf: "12345678909",
          conselho: "",
          ufconselho: "",
        }),
      );

      const proxiedBody = JSON.parse(options.body);
      assert.equal(proxiedBody.user, undefined);
      assert.equal(proxiedBody.schedulingId, "sched-1");
      assert.equal(proxiedBody.documentNonce, "doc-1");
      assert.equal(proxiedBody.requestId, "req_123");

      return {
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        text: async () => JSON.stringify({ ok: true }),
      };
    },
    backendBaseUrl: "https://backend/",
    endpoint: "facial/finalize",
    method: "POST",
  });

  assert.equal(response.status, 200);
});

test("proxy facial encaminha GET de status preservando autenticacao", async () => {
  const response = await handleFacialProxy({
    request: new Request("http://localhost/api/facial/status/req_1", {
      method: "GET",
    }),
    authToken: "token",
    refreshToken: undefined,
    verifyJwt: async () => authPayload,
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://backend/facial/status/req_1");
      assert.equal(options.method, "GET");
      assert.equal(options.headers.get("Authorization"), "Bearer token");
      assert.equal(options.headers.get("x-auth-user")?.includes('"codigo":"USR-001"'), true);

      return {
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        text: async () => JSON.stringify({ isComplete: false }),
      };
    },
    backendBaseUrl: "https://backend/",
    endpoint: "facial/status/req_1",
    method: "GET",
  });

  assert.equal(response.status, 200);
});
