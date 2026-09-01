import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("post-login transition runs inside the authenticated dashboard route", async () => {
  const loginPage = await readFile(
    new URL("../components/login/login.tsx", import.meta.url),
    "utf8",
  );
  const dashboardPage = await readFile(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    loginPage,
    /PremiumCyberLoading/,
    "The public login route should not own the post-login loading screen.",
  );
  assert.match(
    loginPage,
    /router\.replace\(["']\/dashboard\?loginTransition=1["']\)/,
  );
  assert.doesNotMatch(loginPage, /setShowPostLoginTransition/);

  assert.match(
    dashboardPage,
    /PremiumCyberLoading/,
    "The authenticated dashboard route should own the post-login transition.",
  );
  assert.match(dashboardPage, /loginTransition/);
  assert.match(dashboardPage, /router\.replace\(["']\/dashboard["']/);
});
