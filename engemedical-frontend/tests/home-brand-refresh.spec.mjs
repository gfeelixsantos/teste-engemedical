import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("home login uses the Engemedical Connect brand system", async () => {
  const tailwindConfig = await readFile(
    new URL("../tailwind.config.js", import.meta.url),
    "utf8",
  );
  const loginPage = await readFile(
    new URL("../components/login/login.tsx", import.meta.url),
    "utf8",
  );

  for (const token of [
    "midnight",
    "deep",
    "blue",
    "cyan",
    "green",
    "lime",
    "surface",
    "line",
  ]) {
    assert.match(
      tailwindConfig,
      new RegExp(`${token}:\\s*["']#[0-9a-fA-F]{6}["']`),
      `Expected Tailwind brand token ${token}`,
    );
  }

  assert.match(loginPage, /engemedicalIcon from "@\/public\/images\/logo-vertical\.png"/);
  assert.doesNotMatch(loginPage, /Engemedical Connect/);
  assert.doesNotMatch(loginPage, /Portal operacional/);
  assert.doesNotMatch(loginPage, /Clínica ocupacional/);
  assert.match(loginPage, /Exames ocupacionais/);
  assert.match(loginPage, /ASO e documentos/);
  assert.match(loginPage, /PCMSO e conformidade/);
  assert.match(loginPage, /Rede de atendimento/);
  assert.match(loginPage, /Fluxo ágil para admissional, periódico e demissional/);
  assert.match(loginPage, /Emissão e organização para rotinas de RH e SST/);
  assert.match(loginPage, /Acompanhamento ocupacional alinhado às exigências legais/);
  assert.match(loginPage, /Estrutura para empresas, unidades e colaboradores/);
  assert.doesNotMatch(
    loginPage,
    /Cuidado ocupacional com tecnologia, presença clínica e gestão integrada/,
  );
  assert.doesNotMatch(
    loginPage,
    /Exames, ASO, PCMSO e rede credenciada em uma jornada mais simples/,
  );
  assert.doesNotMatch(
    loginPage,
    /Atendimento clínico, documentação ocupacional e conformidade/,
  );
  assert.match(loginPage, /cyber-grid/);
  assert.match(loginPage, /brand-card-shine/);
  assert.match(loginPage, /whileHover=\{\{ y: -4, scale: 1\.018 \}\}/);
  assert.match(loginPage, /motion\.section/);
  assert.match(loginPage, /motion\.div/);
  assert.match(loginPage, /repeat:\s*Infinity/);
});
