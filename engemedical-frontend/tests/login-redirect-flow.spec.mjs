import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("post-login redirect uses getHomeRoute for user-type-aware routing", async () => {
  const loginPage = await readFile(
    new URL("../components/login/login.tsx", import.meta.url),
    "utf8",
  );
  const dashboardPage = await readFile(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(loginPage, /getHomeRoute\(userLogged\.data\)/);
  assert.match(loginPage, /import.*getHomeRoute/);
  assert.doesNotMatch(loginPage, /router\.replace\("\/dashboard/);

  assert.doesNotMatch(dashboardPage, /PremiumCyberLoading/);
  assert.doesNotMatch(dashboardPage, /getHomeRoute/);
});
