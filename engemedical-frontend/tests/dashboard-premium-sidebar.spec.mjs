import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("dashboard has DashboardNavSidebar with primary/secondary nav, active route detection, and premium styling", async () => {
  const dashboardPage = await readFile(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8",
  );
  const statisticsSection = await readFile(
    new URL(
      "../app/dashboard/components/StatisticsSection.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(dashboardPage, /DashboardNavSidebar/);
  assert.match(dashboardPage, /isSidebarExpanded/);
  assert.match(dashboardPage, /onMouseEnter/);
  assert.match(dashboardPage, /onMouseLeave/);
  assert.match(dashboardPage, /\/images\/logo\.png/);

  for (const label of [
    "Atendimento",
    "Recepção",
    "Relatórios",
    "Prontuários",
  ]) {
    assert.match(dashboardPage, new RegExp(label));
  }

  // Secondary nav items
  for (const label of [
    "Dashboards",
    "Agenda",
    "Configurações",
    "Serviços",
  ]) {
    assert.match(dashboardPage, new RegExp(label));
  }

  // Active route detection via usePathname
  assert.match(dashboardPage, /usePathname/);

  // Primary nav items render with description
  assert.match(dashboardPage, /Fluxo clínico e exames/);
  assert.match(dashboardPage, /Fila, chegada e triagem/);
  assert.match(dashboardPage, /Indicadores e documentos/);
  assert.match(dashboardPage, /Histórico ocupacional/);

  // Secondary nav items render without description (title only)
  assert.match(dashboardPage, /Navegação secundária/);

  // Active item styling
  assert.match(dashboardPage, /border-brand-500\/30/);
  assert.match(dashboardPage, /bg-brand-50/);
  assert.match(dashboardPage, /bg-brand-100/);
  assert.match(dashboardPage, /text-brand-600/);

  // Hover styling for green accent
  assert.match(dashboardPage, /hover:border-brand-green-300/);

  // Visual separator between primary and secondary nav
  assert.match(dashboardPage, /border-brand-line\/50/);

  assert.doesNotMatch(dashboardPage, /MenuCard/);
  assert.doesNotMatch(dashboardPage, /Menu de funcionalidades/);
  assert.doesNotMatch(
    dashboardPage,
    /Acesse as funcionalidades do sistema abaixo/,
  );
  assert.match(dashboardPage, /lg:pl-24/);
  assert.match(dashboardPage, /bg-white\/95/);
  assert.match(dashboardPage, /border-brand-line\/70/);
  assert.match(dashboardPage, /shadow-\[0_18px_48px_rgba\(15,23,42,0\.10\)\]/);
  assert.match(dashboardPage, /group-hover\/item:bg-brand-mist/);
  assert.doesNotMatch(dashboardPage, /Menu hover/);
  assert.doesNotMatch(dashboardPage, /bg-\[#020817\]/);
  assert.doesNotMatch(dashboardPage, /radial-gradient/);
  assert.doesNotMatch(dashboardPage, /blur-2xl/);
  assert.doesNotMatch(
    dashboardPage,
    /hover:shadow-\[0_24px_70px_rgba\(6,152,194,0\.24\)\]/,
  );

  assert.match(statisticsSection, /PowerBiKpiPanel/);
  assert.match(statisticsSection, /ResponsiveContainer/);
  assert.match(statisticsSection, /AreaChart/);
  assert.match(statisticsSection, /RadialBarChart/);
  assert.doesNotMatch(statisticsSection, /Consolidado operacional/);
  assert.doesNotMatch(
    statisticsSection,
    /Visão executiva de atendimentos, exames e prontuários/,
  );
  assert.doesNotMatch(statisticsSection, /Power BI style/);
  assert.doesNotMatch(statisticsSection, /LINHA 1: 3 CARDS PRINCIPAIS/);
  assert.doesNotMatch(statisticsSection, /LINHA 2: 3 CARDS DE EXAMES E STATUS/);
});
