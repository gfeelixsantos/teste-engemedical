import test from "node:test";
import assert from "node:assert/strict";

const { handleCriticalDeleteProxy } = await import(
  "../app/api/schedulings/_criticalDeleteProxy.mjs"
);

function createJsonRequest(body) {
  return new Request("http://localhost/api/schedulings/delete", {
    method: "DELETE",
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

test("exclusao critica exige motivo e senha de login", async () => {
  const response = await handleCriticalDeleteProxy({
    request: createJsonRequest({ schedulingId: "sched-1", motivo: "" }),
    endpoint: "schedulings/delete",
    method: "DELETE",
    authToken: "token",
    verifyJwt: async () => authPayload,
    reauthenticate: async () => ({ ok: true }),
    fetchImpl: async () => {
      throw new Error("nao deveria chamar o backend");
    },
    backendBaseUrl: "https://backend/",
  });

  assert.equal(response.status, 400);
});

test("senha incorreta bloqueia exclusao sem chamar o backend", async () => {
  let calledBackend = false;

  const response = await handleCriticalDeleteProxy({
    request: createJsonRequest({
      schedulingId: "sched-1",
      motivo: "duplicado",
      password: "errada",
    }),
    endpoint: "schedulings/delete",
    method: "DELETE",
    authToken: "token",
    verifyJwt: async () => authPayload,
    reauthenticate: async ({ cpf, password }) => {
      assert.equal(cpf, "12345678909");
      assert.equal(password, "errada");
      return { ok: false };
    },
    fetchImpl: async () => {
      calledBackend = true;
      throw new Error("nao deveria chamar o backend");
    },
    backendBaseUrl: "https://backend/",
  });

  assert.equal(response.status, 401);
  assert.equal(calledBackend, false);
});

test("senha correta permite exclusao e nao encaminha password ao Nest", async () => {
  const response = await handleCriticalDeleteProxy({
    request: createJsonRequest({
      schedulingId: "sched-1",
      motivo: "cadastro duplicado",
      password: "segredo",
    }),
    endpoint: "schedulings/delete",
    method: "DELETE",
    authToken: "token",
    verifyJwt: async () => authPayload,
    reauthenticate: async () => ({ ok: true }),
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://backend/schedulings/delete");
      assert.equal(options.method, "DELETE");
      assert.equal(options.headers.get("Authorization"), "Bearer token");
      assert.equal(options.headers.get("x-reauthenticated"), "true");
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

      const body = JSON.parse(options.body);
      assert.equal(body.password, undefined);
      assert.equal(body.motivo, "cadastro duplicado");
      assert.equal(body.reauthenticated, true);
      assert.match(body.requestId, /^req_\d+_[a-z0-9]{7}$/);
      assert.equal(options.headers.get("x-request-id"), body.requestId);

      return {
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        text: async () =>
          JSON.stringify({
            success: true,
            requestId: body.requestId,
            snapshotId: "snapshot_001",
          }),
      };
    },
    backendBaseUrl: "https://backend/",
  });

  assert.equal(response.status, 200);
  assert.match(
    JSON.parse(response.body).requestId,
    /^req_\d+_[a-z0-9]{7}$/,
  );
});

test("rota auditada reutiliza requestId informado quando existir", async () => {
  const response = await handleCriticalDeleteProxy({
    request: createJsonRequest({
      schedulingId: "sched-1",
      motivo: "cadastro duplicado",
      password: "segredo",
      requestId: "req_existente_001",
    }),
    endpoint: "schedulings/delete",
    method: "DELETE",
    authToken: "token",
    verifyJwt: async () => authPayload,
    reauthenticate: async () => ({ ok: true }),
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.requestId, "req_existente_001");
      return {
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        text: async () => JSON.stringify({ requestId: body.requestId }),
      };
    },
    backendBaseUrl: "https://backend/",
  });

  assert.equal(JSON.parse(response.body).requestId, "req_existente_001");
});
