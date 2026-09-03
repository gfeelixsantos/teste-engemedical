import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("globals.css defines cyber-grid and brand-card-shine animations", async () => {
  const css = await readFile(
    new URL("../styles/globals.css", import.meta.url),
    "utf8"
  );

  // Typewriter still present
  assert.match(css, /tw-reveal/);
  assert.match(css, /\.typewriter-text/);

  // Cyber grid
  assert.match(css, /\.cyber-grid/);
  assert.match(css, /grid-drift/);
  assert.match(css, /background-image/);
  assert.match(css, /background-size: 72px 72px/);

  // Brand card shine
  assert.match(css, /\.brand-card-shine/);
  assert.match(css, /card-shine-spin/);
});

test("login.tsx uses cyber-grid and brand-card-shine classes", async () => {
  const login = await readFile(
    new URL("../components/login/login.tsx", import.meta.url),
    "utf8"
  );

  // BrandPanel has cyber-grid
  assert.match(login, /className="cyber-grid/);

  // Cards have brand-card-shine
  assert.match(login, /className="brand-card-shine/);

  // BrandPanel uses motion.section for animations
  assert.match(login, /motion\.section/);
  assert.match(login, /initial=\{\{ opacity: 0 \}\}/);
  assert.match(login, /animate=\{\{ opacity: 1 \}\}/);

  // ConnectSignal animated elements
  assert.match(login, /ConnectSignal/);

  // TypewriterTitle
  assert.match(login, /TypewriterTitle/);
  assert.match(login, /typewriter-text/);

  // Image with motion
  assert.match(login, /animate=\{\{ scale: \[1, 1\.025, 1\]/);

  // Brand pillars
  assert.match(login, /brandPillars/);
  assert.match(login, /whileHover/);
});
