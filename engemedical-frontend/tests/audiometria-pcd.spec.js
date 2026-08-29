const test = require("node:test");
const assert = require("node:assert/strict");

const {
  avaliarCriterioPcdAuditivo,
} = require("../app/atendimento/components/exames/audiometria-pcd");

const TEXTO_INDETERMINADO =
  "Crit\u00e9rio legal de defici\u00eancia auditiva n\u00e3o p\u00f4de ser determinado devido \u00e0 aus\u00eancia de resposta nas frequ\u00eancias obrigat\u00f3rias (500, 1000, 2000 e 3000 Hz). Recomenda-se reavalia\u00e7\u00e3o audiol\u00f3gica para fins legais.";
const TEXTO_BILATERAL =
  "Atende aos crit\u00e9rios legais de defici\u00eancia auditiva bilateral (m\u00e9dia tonal \u2265 41 dB NA em ambas as orelhas), conforme Decreto 5.296/2004.";
const TEXTO_UNILATERAL =
  "Atende aos crit\u00e9rios legais de defici\u00eancia auditiva unilateral profunda (\u2265 91 dB NA em uma orelha), conforme par\u00e2metros t\u00e9cnicos compat\u00edveis com a Lei 14.768/2023.";

function criarLimiar(od500, od1000, od2000, od3000, oe500, oe1000, oe2000, oe3000) {
  return {
    od: {
      500: od500,
      1000: od1000,
      2000: od2000,
      3000: od3000,
    },
    oe: {
      500: oe500,
      1000: oe1000,
      2000: oe2000,
      3000: oe3000,
    },
  };
}

test("sinaliza unilateral profunda quando ha ausencia total de resposta em uma orelha", () => {
  const criterio = avaliarCriterioPcdAuditivo({
    mediaOD: null,
    mediaOE: 13,
    ...criarLimiar("---", "---", "---", "---", "10", "10", "15", "15"),
  });

  assert.equal(criterio, TEXTO_UNILATERAL);
});

test("sinaliza bilateral quando ha ausencia total de resposta em ambas as orelhas", () => {
  const criterio = avaliarCriterioPcdAuditivo({
    mediaOD: null,
    mediaOE: null,
    ...criarLimiar("---", "---", "---", "---", "---", "---", "---", "---"),
  });

  assert.equal(criterio, TEXTO_BILATERAL);
});

test("mantem indeterminado quando falta apenas parte das frequencias obrigatorias", () => {
  const criterio = avaliarCriterioPcdAuditivo({
    mediaOD: 40,
    mediaOE: 10,
    ...criarLimiar("40", "40", "40", "---", "10", "10", "10", "10"),
  });

  assert.equal(criterio, TEXTO_INDETERMINADO);
});

test("mantem texto bilateral quando ambas as orelhas atendem por media tonal", () => {
  const criterio = avaliarCriterioPcdAuditivo({
    mediaOD: 45,
    mediaOE: 50,
    ...criarLimiar("45", "45", "45", "45", "50", "50", "50", "50"),
  });

  assert.equal(criterio, TEXTO_BILATERAL);
});

test("mantem texto unilateral quando a pior orelha atende ao criterio configurado", () => {
  const criterio = avaliarCriterioPcdAuditivo({
    mediaOD: 95,
    mediaOE: 10,
    ...criarLimiar("95", "95", "95", "95", "10", "10", "10", "10"),
  });

  assert.equal(criterio, TEXTO_UNILATERAL);
});

test("nao retorna texto quando nao ha sugestao de enquadramento", () => {
  const criterio = avaliarCriterioPcdAuditivo({
    mediaOD: 25,
    mediaOE: 20,
    ...criarLimiar("25", "25", "25", "25", "20", "20", "20", "20"),
  });

  assert.equal(criterio, "");
});
