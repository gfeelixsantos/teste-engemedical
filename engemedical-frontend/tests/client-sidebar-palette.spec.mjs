import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sidebar = await readFile(new URL("../components/cliente/SidebarCliente.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/cliente/layout.tsx", import.meta.url), "utf8");

test("sidebar cliente usa uma superfície clara com acentos verdes", () => {
  assert.match(layout, /bg-\[linear-gradient\(180deg,#F6FBF8_0%,#EDF7F1_100%\)\]/);
  assert.match(sidebar, /bg-\[#F9FDFC\]/);
  assert.match(sidebar, /bg-\[#2F7D56\][^\n]*text-white/);
  assert.doesNotMatch(sidebar, /flex flex-col overflow-hidden rounded-2xl border[^\n]*bg-\[#2F7D56\]/);
  assert.match(sidebar, /bg-\[#D6EDE0\]/);
  assert.match(sidebar, /text-\[#173D2B\]/);
  assert.match(sidebar, /text-\[#16804D\]/);
  assert.match(sidebar, /text-\[#173D2B\] placeholder-\[#6A8A78\]/);
  assert.doesNotMatch(sidebar, /border-transparent text-white\/75 hover:border-white\/20/);
  assert.doesNotMatch(sidebar, /border-l-2/);
  assert.match(sidebar, /tracking-\[0\.16em\] text-white/);
});
