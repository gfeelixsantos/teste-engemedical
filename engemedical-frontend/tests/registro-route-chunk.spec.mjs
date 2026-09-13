import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("registro route uses a server page wrapper and isolates client-only form code", async () => {
  const page = await readFile(
    new URL("../app/registro/page.tsx", import.meta.url),
    "utf8",
  );
  const client = await readFile(
    new URL("../components/registro/RegistroClient.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(page, /^"use client";/);
  assert.match(
    page,
    /import RegistroClient from "@\/components\/registro\/RegistroClient"/,
  );
  assert.match(page, /<RegistroClient \/>/);
  assert.match(client, /^"use client";/);
  assert.match(client, /useRouter/);
  assert.match(client, /RegistroBrandPanel/);
  assert.match(client, /cyber-grid/);
  assert.match(client, /engemedicalIcon/);
  assert.match(client, /bg-brand-surface/);
  assert.match(client, /bg-brand-midnight/);
  assert.match(client, /border-brand-line/);
  assert.match(client, /Conectando seu cadastro ao futuro SST/);
  assert.doesNotMatch(client, /EngemedicalConnectAnimation/);
  assert.doesNotMatch(client, /max-w-4xl mx-auto flex flex-col md:flex-row/);
});
