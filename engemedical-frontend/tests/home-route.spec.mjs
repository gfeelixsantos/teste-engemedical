import test from "node:test";
import assert from "node:assert/strict";

const source = await import("../lib/user/home-route.mjs");

test("direciona usuário interno para visão geral", () => {
  assert.equal(source.getHomeRoute({ tipoUsuario: "interno" }), "/visao-geral");
});

test("direciona cliente para /cliente", () => {
  assert.equal(source.getHomeRoute({ tipoUsuario: "cliente" }), "/cliente");
});

test("mantém usuários legados na visão geral", () => {
  assert.equal(source.getHomeRoute(null), "/visao-geral");
});
