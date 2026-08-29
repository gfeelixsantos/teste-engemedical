import test from "node:test";
import assert from "node:assert/strict";

const { getVisibleSettingsItems } = await import(
  "../app/configuracoes/components/settings-navigation.mjs"
);

test("exibe Auditoria para perfil MASTER", () => {
  const items = getVisibleSettingsItems("MASTER");

  assert.equal(items.some((item) => item.id === "auditoria"), true);
});

test("oculta Auditoria para perfis nao MASTER", () => {
  const items = getVisibleSettingsItems("MEDICO");

  assert.equal(items.some((item) => item.id === "auditoria"), false);
});
