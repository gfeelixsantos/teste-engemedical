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

  assert.match(loginPage, /cmso_icone\.png/);
  assert.match(loginPage, /Engemedical Connect/);
  assert.match(loginPage, /Portal operacional/);
  assert.match(loginPage, /Clínica ocupacional/);
  assert.match(loginPage, /Exames ocupacionais/);
  assert.match(loginPage, /ASO digital/);
  assert.match(loginPage, /PCMSO/);
  assert.match(loginPage, /Rede credenciada/);
  assert.match(loginPage, /Cuidado ocupacional com tecnologia, presença clínica e gestão integrada/);
  assert.match(loginPage, /cyber-grid/);
  assert.match(loginPage, /motion\.section/);
  assert.match(loginPage, /motion\.div/);
  assert.match(loginPage, /repeat:\s*Infinity/);
});
