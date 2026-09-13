import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("post-login transition runs once inside the login route", async () => {
  const loginPage = await readFile(
    new URL("../components/login/login.tsx", import.meta.url),
    "utf8",
  );
  const dashboardPage = await readFile(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(loginPage, /PremiumCyberLoading/);
  assert.match(loginPage, /duration=\{1280\}/);
  assert.doesNotMatch(loginPage, /loginTransition/);
  assert.match(loginPage, /getHomeRoute\(userLogged\.data\)/);

  assert.doesNotMatch(dashboardPage, /PremiumCyberLoading/);
  assert.doesNotMatch(dashboardPage, /loginTransition/);
});
