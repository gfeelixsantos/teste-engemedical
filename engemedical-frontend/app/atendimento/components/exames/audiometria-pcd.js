const TEXTO_INDETERMINADO =
  "Crit\u00e9rio legal de defici\u00eancia auditiva n\u00e3o p\u00f4de ser determinado devido \u00e0 aus\u00eancia de resposta nas frequ\u00eancias obrigat\u00f3rias (500, 1000, 2000 e 3000 Hz). Recomenda-se reavalia\u00e7\u00e3o audiol\u00f3gica para fins legais.";
const TEXTO_BILATERAL =
  "Atende aos crit\u00e9rios legais de defici\u00eancia auditiva bilateral (m\u00e9dia tonal \u2265 41 dB NA em ambas as orelhas), conforme Decreto 5.296/2004.";
const TEXTO_UNILATERAL =
  "Atende aos crit\u00e9rios legais de defici\u00eancia auditiva unilateral profunda (\u2265 91 dB NA em uma orelha), conforme par\u00e2metros t\u00e9cnicos compat\u00edveis com a Lei 14.768/2023.";

const FREQUENCIAS_OBRIGATORIAS = [500, 1000, 2000, 3000];
const AUSENCIA_TOTAL = new Set([null, undefined, "", "-", "--", "---"]);

function isAusenciaResposta(valor) {
  return AUSENCIA_TOTAL.has(valor);
}

function possuiAusenciaTotalObrigatoria(limiares) {
  return FREQUENCIAS_OBRIGATORIAS.every((freq) =>
    isAusenciaResposta(limiares[freq]),
  );
}

function possuiAusenciaParcialObrigatoria(limiares) {
  const ausencias = FREQUENCIAS_OBRIGATORIAS.filter((freq) =>
    isAusenciaResposta(limiares[freq]),
  ).length;

  return ausencias > 0 && ausencias < FREQUENCIAS_OBRIGATORIAS.length;
}

function avaliarCriterioPcdAuditivo({ mediaOD, mediaOE, od, oe }) {
  const odSemRespostaTotal = possuiAusenciaTotalObrigatoria(od);
  const oeSemRespostaTotal = possuiAusenciaTotalObrigatoria(oe);

  if (odSemRespostaTotal && oeSemRespostaTotal) {
    return TEXTO_BILATERAL;
  }

  if (odSemRespostaTotal !== oeSemRespostaTotal) {
    return TEXTO_UNILATERAL;
  }

  if (
    mediaOD === null ||
    mediaOE === null ||
    possuiAusenciaParcialObrigatoria(od) ||
    possuiAusenciaParcialObrigatoria(oe)
  ) {
    return TEXTO_INDETERMINADO;
  }

  const melhorOrelha = Math.min(mediaOD, mediaOE);
  const piorOrelha = Math.max(mediaOD, mediaOE);

  if (melhorOrelha >= 41) {
    return TEXTO_BILATERAL;
  }

  if (piorOrelha >= 91 && melhorOrelha < 41) {
    return TEXTO_UNILATERAL;
  }

  return "";
}

module.exports = {
  avaliarCriterioPcdAuditivo,
  TEXTO_BILATERAL,
  TEXTO_INDETERMINADO,
  TEXTO_UNILATERAL,
};
