import test from "node:test";
import assert from "node:assert/strict";

const { AUDIT_ACTION_OPTIONS } = await import(
  "../app/configuracoes/components/sections/audit/action-options.mjs"
);
const { buildAuditFilterParams } = await import(
  "../app/configuracoes/components/sections/audit/filter-params.mjs"
);
const {
  AUDIT_PRIMARY_COLUMNS,
  buildAuditExpandedDetails,
  hasExpandedAuditDetails,
} = await import(
  "../app/configuracoes/components/sections/audit/presentation.mjs"
);
const { createAuditRequestId } = await import(
  "../lib/audit-log/request-id.mjs"
);

test("ação é enviada pelo select com value técnico", () => {
  const option = AUDIT_ACTION_OPTIONS.find(
    (item) => item.value === "CONFIGURACAO_ALTERAR",
  );

  assert.deepEqual(option, {
    label: "Configuração alterada",
    value: "CONFIGURACAO_ALTERAR",
  });

  const params = buildAuditFilterParams({
    dataInicio: "",
    dataFim: "",
    userCodigo: "",
    acao: option.value,
    unidade: "",
    pacienteCodigo: "",
    requestId: "",
  });

  assert.equal(params.acao, "CONFIGURACAO_ALTERAR");
});

test("Recurso ID não aparece como filtro principal", () => {
  const params = buildAuditFilterParams({
    dataInicio: "2026-05-01",
    dataFim: "2026-05-02",
    userCodigo: "123",
    acao: "EXAME_ATUALIZAR",
    unidade: "RIO CLARO",
    pacienteCodigo: "999",
    requestId: "audit_1_abc1234",
    recursoId: "nao-deve-ir",
  });

  assert.equal("recursoId" in params, false);
});

  test("colunas principais da tabela foram reduzidas", () => {
    assert.deepEqual(AUDIT_PRIMARY_COLUMNS, [
      "Data/Hora",
      "Usuário",
      "Ação",
      "Funcionário",
      "Resultado/Detalhes",
    ]);
  });

test("campos técnicos aparecem apenas no detalhe expandido", () => {
  const details = buildAuditExpandedDetails({
    user_perfil: "MASTER",
    recurso_tipo: "config",
    recurso_id: "cfg-1",
    ip: "127.0.0.1",
    user_agent: "jest",
    request_id: "audit_1_abc1234",
    detalhes: { permitido: true },
  });

  assert.deepEqual(details, {
    perfil: "MASTER",
    unidade: null,
    paciente_nome: null,
    paciente_codigo: null,
    recurso_tipo: "config",
    recurso_id: "cfg-1",
    ip: "127.0.0.1",
    user_agent: "jest",
    request_id: "audit_1_abc1234",
    detalhes: { permitido: true },
  });
  assert.equal(hasExpandedAuditDetails(details), true);
});

  test("Código de rastreio usa request_id e não timestamp puro", () => {
    const a = createAuditRequestId();
    const b = createAuditRequestId("audit");

    assert.match(a, /^audit_\d+_[a-z0-9]{7}$/);
    assert.match(b, /^audit_\d+_[a-z0-9]{7}$/);
    assert.notEqual(a, b);
  });

  test("ações mapeadas correspondem ao backend", () => {
    const actions = [
      "USUARIO_ATUALIZADO",
      "USUARIO_EXCLUIDO",
    ];

    for (const acao of actions) {
      const option = AUDIT_ACTION_OPTIONS.find((item) => item.value === acao);
      if (!option) {
        throw new Error(`Missing action option for ${acao}`);
      }
    }
  });
