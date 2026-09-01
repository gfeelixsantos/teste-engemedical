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
  assert.match(client, /EngemedicalConnectAnimation/);
});
