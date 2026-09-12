import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Sidebar has toggle between controls and menu navigation", async () => {
  const sidebar = await readFile(
    new URL("../components/shared/Sidebar.tsx", import.meta.url),
    "utf8"
  );

  // Toggle mode type and state
  assert.match(sidebar, /SidebarMode/);
  assert.match(sidebar, /sidebarMode/);
  assert.match(sidebar, /"controls"/);
  assert.match(sidebar, /"menu"/);

  // Toggle component exists
  assert.match(sidebar, /SidebarModeToggle/);

  // Toggle buttons labels
  assert.match(sidebar, /Controles/);
  assert.match(sidebar, /Menu/);

  // Toggle icons imported
  assert.match(sidebar, /SlidersHorizontal/);
  assert.match(sidebar, /LayoutGrid/);

  // Conditional rendering for menu mode
  assert.match(sidebar, /sidebarMode === "menu"/);

  // SidebarMenu imported and rendered
  assert.match(sidebar, /import.*SidebarMenu.*from/);
  assert.match(sidebar, /<SidebarMenu/);

  // No console.log debug left
  assert.doesNotMatch(sidebar, /console\.log/);
});

test("SidebarMenu has all navigation items with brand tokens", async () => {
  const menu = await readFile(
    new URL("../components/shared/SidebarMenu.tsx", import.meta.url),
    "utf8"
  );

  // Primary nav items (including renamed "Página Inicial")
  assert.match(menu, /Página Inicial/);
  assert.match(menu, /Atendimento/);
  assert.match(menu, /Recepção/);
  assert.match(menu, /Relatórios/);
  assert.match(menu, /Prontuários/);

  // Secondary nav items
  assert.match(menu, /Informativos/);
  assert.match(menu, /Automação/);
  assert.match(menu, /Agenda Compromissos/);
  assert.match(menu, /Configurações/);
  assert.match(menu, /Serviços/);

  // Routes
  assert.match(menu, /\/dashboard/);
  assert.match(menu, /\/atendimento/);
  assert.match(menu, /\/recepcao/);
  assert.match(menu, /\/relatorio/);
  assert.match(menu, /\/prontuarios/);
  assert.match(menu, /\/agenda/);
  assert.match(menu, /\/configuracoes/);
  assert.match(menu, /\/servicos/);

  const header = await readFile(
    new URL("../components/shared/HeaderApp.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(header, /Agenda de Compromissos/);
  assert.doesNotMatch(header, /handleNavigate\("\/configuracoes"\)/);
  assert.doesNotMatch(header, /handleNavigate\("\/servicos\/filas"\)/);
  assert.match(header, /SIDEBAR_GROUPS/);
  assert.match(header, /Grupo anterior/);
  assert.match(header, /Próximo grupo/);

  // Uses usePathname for active state
  assert.match(menu, /usePathname/);
  assert.match(menu, /isActive/);

  // Uses brand tokens (not hardcoded hex)
  assert.match(menu, /brand-/);
  assert.doesNotMatch(menu, /#0698C2/);
  assert.doesNotMatch(menu, /#047A9E/);

  // Accessibility
  assert.match(menu, /aria-label/);
  assert.match(menu, /aria-current/);
  assert.match(menu, /role="navigation"/);
});

test("Sidebar uses brand tokens throughout — no hardcoded hex", async () => {
  const sidebar = await readFile(
    new URL("../components/shared/Sidebar.tsx", import.meta.url),
    "utf8"
  );

  // No hardcoded brand hex colors
  assert.doesNotMatch(sidebar, /#0698C2/);
  assert.doesNotMatch(sidebar, /#047A9E/);
  assert.doesNotMatch(sidebar, /#E6F5FA/);
  assert.doesNotMatch(sidebar, /#005C7A/);

  // Uses brand.* tokens
  assert.match(sidebar, /brand-500/);
  assert.match(sidebar, /brand-600/);
  assert.match(sidebar, /brand-100/);
});

test("Sidebar PSC and Auth elements are hidden in menu mode", async () => {
  const sidebar = await readFile(
    new URL("../components/shared/Sidebar.tsx", import.meta.url),
    "utf8"
  );

  // PSC status only shown in controls mode
  assert.match(sidebar, /sidebarMode === "controls" && pscStatusElement/);

  // PSC auth button only shown in controls mode
  assert.match(sidebar, /sidebarMode === "controls" && pscAuthButtonElement/);
});
