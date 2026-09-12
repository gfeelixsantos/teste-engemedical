import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../components/shared/SidebarMenu.tsx", import.meta.url), "utf8");

test("organiza a navegação por grupos funcionais premium", () => {
  assert.match(source, /title: "Atendimento"/);
  assert.match(source, /title: "Informativos"/);
  assert.match(source, /title: "Serviços"/);
  assert.match(source, /title: "Configurações"/);
  assert.match(source, /title: "Automação"/);
  assert.match(source, /title: "Coleta de Resultados".*path: "\/automacao\/coleta-resultados"/);
  assert.match(source, /path: "\/servicos\/campanhas"/);
  assert.match(source, /path: "\/arquivos"/);
  assert.match(source, /path: "\/servicos\/filas"/);
  assert.doesNotMatch(source, /\/servicos\?tab=/);
});

test("distribui os atalhos nos grupos corretos e em ordem alfabética", () => {
  assert.doesNotMatch(source, /title: "Agenda", icon: CalendarDays/);
  assert.match(source, /title: "Agenda Compromissos", icon: CalendarDays, path: "\/agenda"/);

  const atendimentoStart = source.indexOf('{ title: "Atendimento", icon: Stethoscope, items: [');
  const informativosStart = source.indexOf('{ title: "Informativos", icon: ChartNoAxesCombined, items: [');
  const servicosStart = source.indexOf('{ title: "Serviços", icon: LayoutGrid, items: [');
  const configuracoesStart = source.indexOf('{ title: "Configurações", icon: Settings, items: [');

  assert.ok(source.indexOf('title: "Convocação de exames"', informativosStart) < servicosStart);
  assert.ok(source.indexOf('title: "Agenda Compromissos"', servicosStart) < configuracoesStart);
  assert.ok(source.indexOf('title: "Convocação de exames"', atendimentoStart) > informativosStart);

  const informativosItems = ["Absenteísmo", "Convocação de exames", "Documentos SST", "eSocial", "Gestão de vidas", "Relatórios", "Volumetria"];
  const servicosItems = ["Agenda Compromissos", "Campanhas de e-mail", "Explorador de arquivos", "Filas de processamento"];
  for (const items of [informativosItems, servicosItems]) {
    const positions = items.map((item) => source.indexOf(`title: "${item}"`));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  }
});

test("submenu lateral oferece suporte a hover e teclado", () => {
  assert.match(source, /onMouseEnter/);
  assert.match(source, /onMouseLeave/);
  assert.match(source, /Escape/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /cursor-pointer/);
  assert.doesNotMatch(source, /const activeGroup = SIDEBAR_GROUPS\.find/);
});

test("automação usa o mesmo ícone da página de coleta", async () => {
  const scraperSource = await readFile(new URL("../app/dashboard/components/ScraperMonitor.tsx", import.meta.url), "utf8");

  assert.match(source, /title: "Automação", icon: Workflow/);
  assert.match(source, /title: "Coleta de Resultados", icon: ScanLine/);
  assert.doesNotMatch(scraperSource, /Inativação em massa: Todo dia 24 às 18:30/);
});

test("dashboard mantém a sidebar aberta e com rolagem própria", async () => {
  const dashboardSource = await readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

  assert.match(dashboardSource, /h-\[calc\(100vh-4rem\)\]/);
  assert.match(dashboardSource, /sticky top-16/);
  assert.match(dashboardSource, /overflow-y-auto/);
  assert.match(dashboardSource, /<SidebarMenu openOnHover \/>/);
  assert.doesNotMatch(dashboardSource, /SidebarMenu collapsed=\{!expanded\}/);
});
