const test = require("node:test");
const assert = require("node:assert/strict");

const {
  belongsToOtherOperationalContext,
} = require("../lib/atendimento/operational-context");

test("ignora diferencas de caixa e acento ao comparar o mesmo profissional na mesma sala", () => {
  const result = belongsToOtherOperationalContext(
    {
      status: "EM ATENDIMENTO",
      sala: "Sala 4",
      profissional: "Bi\u00e1nca Sabrina - CMSO",
    },
    {
      sala: "sala 4",
      profissional: "bianca sabrina - cmso",
    },
  );

  assert.equal(result, false);
});

test("classifica como outro contexto quando a sala difere", () => {
  const result = belongsToOtherOperationalContext(
    {
      status: "EM ATENDIMENTO",
      sala: "Sala 4",
      profissional: "Bianca Sabrina - CMSO",
    },
    {
      sala: "Sala 3",
      profissional: "Bianca Sabrina - CMSO",
    },
  );

  assert.equal(result, true);
});

test("classifica como outro contexto quando o profissional difere na mesma sala", () => {
  const result = belongsToOtherOperationalContext(
    {
      status: "EM CHAMADA",
      sala: "Sala 4",
      profissional: "Bianca Sabrina - CMSO",
    },
    {
      sala: "Sala 4",
      profissional: "Outro Profissional",
    },
  );

  assert.equal(result, true);
});

test("usa a sala como fallback quando o ticket ativo nao tem profissional", () => {
  const result = belongsToOtherOperationalContext(
    {
      status: "EM CHAMADA",
      sala: "Sala 4",
      profissional: "",
    },
    {
      sala: "Sala 2",
      profissional: "",
    },
  );

  assert.equal(result, true);
});

test("usa o profissional como fallback quando o ticket ativo nao tem sala", () => {
  const result = belongsToOtherOperationalContext(
    {
      status: "EM CHAMADA",
      sala: "",
      profissional: "Bianca Sabrina - CMSO",
    },
    {
      sala: "",
      profissional: "Outro Profissional",
    },
  );

  assert.equal(result, true);
});

test("trata contexto totalmente vazio como transitorio sem conflito visual", () => {
  const result = belongsToOtherOperationalContext(
    {
      status: "EM CHAMADA",
      sala: "",
      profissional: "",
    },
    {
      sala: "Sala 4",
      profissional: "Bianca Sabrina - CMSO",
    },
  );

  assert.equal(result, false);
});
