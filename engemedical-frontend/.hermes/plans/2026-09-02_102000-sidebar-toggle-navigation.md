# Sidebar com Toggle de Navegação Premium

> **Para Hermes:** Usar subagent-driven-development para implementar este plano task-by-task.

**Goal:** Adicionar um toggle na `SidebarRecepcao` (usada em `/recepcao` e `/atendimento`) que alterna entre o painel operacional atual (filtros, conectar, agendamentos) e um menu de navegação premium, permitindo que o usuário transite entre páginas direto da sidebar — sem depender do dropdown do HeaderApp.

**Se o toggle não for viável:** Refatorar o layout visual da sidebar para align com os design tokens `brand.*` do projeto.

**Architecture:** Modificação direta do `SidebarRecepcao` em `components/shared/Sidebar.tsx`. Toggle com dois modos via state interno. Layout compacto, brand tokens, animação framer-motion.

**Tech Stack:** React 18, framer-motion (já presente), HeroUI, Tailwind 3, lucide-react

---

## 📊 Estado Atual da Sidebar

### O que existe hoje

```
┌─────────────────────────────────┐
│  SidebarRecepcao (w-68 / 272px) │
│                                  │
│  ┌ Header ────────────────────┐ │
│  │ "Controles"                │ │
│  │ Servidor: ✅ Conectado     │ │
│  │ Assinatura: ...            │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌ Filtros ───────────────────┐ │
│  │ Unidade: [select]          │ │
│  │ Sala:     [select]         │ │
│  │ Exames:   [select] (só     │ │
│  │           atendimento)     │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌ Botões ────────────────────┐ │
│  │ [Conectar/Desconectar]     │ │
│  │ [Novo Atendimento] (r)     │ │
│  │ [Vídeochamada] (a)         │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌ Agendamentos ─────────────┐ │
│  │ Lista de agendados...      │ │
│  └────────────────────────────┘ │
└─────────────────────────────────┘
```

### Navegação hoje (sem sidebar)
- Usuário clica no avatar → HeaderApp dropdown → 4 ícones (Atend., Recep., Relat., Pront.) + menu (Agenda, Config, Serviços)
- **Problema:** sidebar não oferece caminho de volta ao menu principal

---

## 🎯 Objeto de Implementação

```
┌─────────────────────────────────┐
│  SidebarRecepcao (w-68)         │
│                                  │
│  ┌ Toggle Bar ────────────────┐ │
│  │ [⚙️ Controles] [📋 Menu]   │  ← NOVO: toggle entre modos
│  └────────────────────────────┘ │
│                                  │
│  ┌ Se Modo "Menu": ──────────┐ │
│  │ 🏠 Dashboard              │ │
│  │ 🩺 Atendimento            │ │
│  │ 👥 Recepção               │ │
│  │ 📊 Relatórios             │ │
│  │ 📄 Prontuários            │ │
│  │ ─────────────             │ │
│  │ 📅 Agenda                 │ │
│  │ ⚙️ Configurações          │ │
│  │ 🏥 Serviços               │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌ Se Modo "Controles": ────┐ │
│  │ (conteúdo atual intacto)   │ │
│  │ Unidade, Sala, Exames...   │ │
│  │ Conectar, Agendamentos...  │ │
│  └────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 📋 Plano de Tarefas

### Task 1: Criar componente `SidebarMenu` — Menu de navegação premium

**Objective:** Criar o componente de menu que será exibido quando o toggle estiver no modo "Menu".

**Files:**
- Create: `engemedical-frontend/components/shared/SidebarMenu.tsx`

**Step 1: Criar SidebarMenu.tsx**

```tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Stethoscope,
  Users,
  ChartNoAxesCombined,
  FileText,
  CalendarDays,
  Settings,
  LayoutGrid,
} from "lucide-react";

const NAV_ITEMS = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Atendimento", icon: Stethoscope, path: "/atendimento" },
  { title: "Recepção", icon: Users, path: "/recepcao" },
  { title: "Relatórios", icon: ChartNoAxesCombined, path: "/relatorio" },
  { title: "Prontuários", icon: FileText, path: "/prontuarios" },
] as const;

const SECONDARY_ITEMS = [
  { title: "Agenda", icon: CalendarDays, path: "/agenda" },
  { title: "Configurações", icon: Settings, path: "/configuracoes" },
  { title: "Serviços", icon: LayoutGrid, path: "/servicos" },
] as const;

export function SidebarMenu() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + "/");

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <nav aria-label="Menu de navegação" className="space-y-1" role="navigation">
      {/* Nav items principais */}
      {NAV_ITEMS.map(({ title, icon: Icon, path }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            aria-current={active ? "page" : undefined}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0698C2]/40 ${
              active
                ? "bg-brand-50 text-brand-700 border border-brand-500/30"
                : "text-gray-600 hover:bg-brand-mist hover:text-gray-900 border border-transparent hover:border-brand-line"
            }`}
            type="button"
            onClick={() => handleNavigate(path)}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border shadow-sm transition-all ${
                active
                  ? "border-brand-500/40 bg-brand-100 text-brand-600"
                  : "border-brand-line bg-white text-brand-blue group-hover:border-brand-green-300 group-hover:bg-brand-mist group-hover:text-brand-green-600"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{title}</span>
          </button>
        );
      })}

      {/* Separador */}
      <div className="my-2 border-t border-gray-200" />

      {/* Nav items secundários */}
      {SECONDARY_ITEMS.map(({ title, icon: Icon, path }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0698C2]/40 ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
            type="button"
            onClick={() => handleNavigate(path)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{title}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

**Step 2: Commit**
```bash
git add engemedical-frontend/components/shared/SidebarMenu.tsx
git commit -m "feat: cria SidebarMenu — menu de navegação premium para sidebar"
```

---

### Task 2: Adicionar toggle e integrar SidebarMenu no SidebarRecepcao

**Objective:** Modificar `Sidebar.tsx` para incluir um toggle bar no topo que alterna entre o modo "Controles" (atual) e o modo "Menu" (novo SidebarMenu).

**Files:**
- Modify: `engemedical-frontend/components/shared/Sidebar.tsx`

**Step 1: Adicionar imports**
```tsx
import { useState } from "react"; // já existe
import { LayoutGrid, SlidersHorizontal } from "lucide-react"; // novos ícones para o toggle
import { SidebarMenu } from "./SidebarMenu"; // novo componente
```

**Step 2: Criar o componente `SidebarModeToggle`**

Adicionar após o `SelectField` e antes do `ActionButtonGroup`:

```tsx
type SidebarMode = "controls" | "menu";

const SidebarModeToggle: React.FC<{
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
}> = ({ mode, onModeChange }) => (
  <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 mb-4">
    <button
      aria-pressed={mode === "controls"}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 ${
        mode === "controls"
          ? "bg-white text-brand-600 shadow-sm ring-1 ring-brand-500/20"
          : "text-gray-500 hover:text-gray-700"
      }`}
      type="button"
      onClick={() => onModeChange("controls")}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
      Controles
    </button>
    <button
      aria-pressed={mode === "menu"}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 ${
        mode === "menu"
          ? "bg-white text-brand-600 shadow-sm ring-1 ring-brand-500/20"
          : "text-gray-500 hover:text-gray-700"
      }`}
      type="button"
      onClick={() => onModeChange("menu")}
    >
      <LayoutGrid className="h-3.5 w-3.5" />
      Menu
    </button>
  </div>
);
```

**Step 3: Integrar no componente `SidebarRecepcao`**

Dentro do componente principal:

```tsx
export function SidebarRecepcao({ ... }: SidebarRecepcaoProps) {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("controls");
  // ... restante do código existente ...

  return (
    <aside
      aria-label="Painel lateral"
      className="w-68 bg-white border-r border-gray-200 shadow-lg h-full overflow-y-auto transition-all relative"
      role="complementary"
    >
      <main className="p-4 pt-4">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#0698C2]">
              {sidebarMode === "controls" ? "Controles" : "Navegação"}
            </h2>
            {conectado && (
              <span className="flex h-2 w-2 rounded-full bg-brand-green-500" title="Conectado" />
            )}
          </div>

          {/* Status do servidor (sempre visível) */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[85px_minmax(0,1fr)] items-center gap-x-2">
              <span className="text-sm font-medium text-gray-700 text-left">
                Servidor:
              </span>
              <div className="justify-self-end flex items-center gap-2">
                {/* ... status connecting/connected/disconnected (manter código atual) ... */}
              </div>
            </div>

            {/* PSC status (sempre visível quando disponível) */}
            {pscStatusElement && sidebarMode === "controls" && (
              <div className="grid grid-cols-[85px_minmax(0,1fr)] items-center gap-x-2">
                <span className="text-sm font-medium text-gray-700 text-left pt-1">
                  Assinatura:
                </span>
                <div className="justify-self-end flex items-center gap-2">
                  {pscStatusElement}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* PSC Auth Button (só no modo controles) */}
        {sidebarMode === "controls" && pscAuthButtonElement && (
          <div className="mb-4 w-full px-5">
            {pscAuthButtonElement}
          </div>
        )}

        {/* ══════ TOGGLE ══════ */}
        <SidebarModeToggle mode={sidebarMode} onModeChange={setSidebarMode} />

        {/* ══════ CONTEÚDO CONDICIONAL ══════ */}
        {sidebarMode === "menu" ? (
          /* ---- MODO MENU ---- */
          <SidebarMenu />
        ) : (
          /* ---- MODO CONTROLES (código atual) ---- */
          <>
            {/* Filtros */}
            <section className="space-y-2 mb-3">
              <SelectField ... />
              <SelectField ... />
              {pathname && pathname.includes("atendimento") && (
                <SelectField ... />
              )}
            </section>

            {/* Botão Conectar */}
            <div className="mb-3">
              <Button ... />
            </div>

            {/* Botão Novo Atendimento */}
            {conectado && pathname?.includes("recepcao") && (
              <ActionButtonGroup ... />
            )}

            {/* Botão Vídeochamada */}
            {conectado && pathname?.includes("atendimento") && toggleTelemedicinaModo && (
              ...
            )}

            {/* Lista de Agendamentos */}
            {conectado && (
              <aside aria-label="Lista de agendamentos" className="mt-3">
                <AgendamentosList ... />
              </aside>
            )}
          </>
        )}
      </main>
    </aside>
  );
}
```

**Step 4: Remover console.log** (linha 277)

**Step 5: Commit**
```bash
git add engemedical-frontend/components/shared/Sidebar.tsx
git commit -m "feat: sidebar com toggle Controles/Menu — navegação premium integrada"
```

---

### Task 3: Atualizar testes existentes

**Objective:** Atualizar testes para validar o novo toggle e o SidebarMenu.

**Files:**
- Modify: `engemedical-frontend/tests/dashboard-premium-sidebar.spec.mjs`
- Create: `engemedical-frontend/tests/sidebar-toggle-menu.spec.mjs`

**Step 1: Criar teste do toggle + menu**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Sidebar has toggle between controls and menu navigation", async () => {
  const sidebar = await readFile(
    new URL("../components/shared/Sidebar.tsx", import.meta.url),
    "utf8"
  );

  // Toggle mode state
  assert.match(sidebar, /SidebarModeToggle/);
  assert.match(sidebar, /sidebarMode/);
  assert.match(sidebar, /"controls"/);
  assert.match(sidebar, /"menu"/);

  // Toggle buttons
  assert.match(sidebar, /Controles/);
  assert.match(sidebar, /Menu/);
  assert.match(sidebar, /SlidersHorizontal/);
  assert.match(sidebar, /LayoutGrid/);

  // Conditional rendering
  assert.match(sidebar, /sidebarMode === "menu"/);
  assert.match(sidebar, /SidebarMenu/);

  // SidebarMenu component exists
  const menu = await readFile(
    new URL("../components/shared/SidebarMenu.tsx", import.meta.url),
    "utf8"
  );
  assert.match(menu, /Dashboard/);
  assert.match(menu, /Atendimento/);
  assert.match(menu, /Recepção/);
  assert.match(menu, /Relatórios/);
  assert.match(menu, /Prontuários/);
  assert.match(menu, /Agenda/);
  assert.match(menu, /Configurações/);
  assert.match(menu, /Serviços/);
  assert.match(menu, /usePathname/);
  assert.match(menu, /isActive/);

  // No console.log debug
  assert.doesNotMatch(sidebar, /console\.log.*Sidebar/);
});
```

**Step 2: Rodar testes**
```bash
cd engemedical-frontend && node --test tests/sidebar-toggle-menu.spec.mjs
```

**Step 3: Commit**
```bash
git add engemedical-frontend/tests/
git commit -m "test: valida sidebar toggle controles/menu e SidebarMenu"
```

---

### Task 4: Refatorar design tokens da sidebar (brand.*)

**Objective:** Substituir hex hardcoded por design tokens do Tailwind config para consistência visual.

**Files:**
- Modify: `engemedical-frontend/components/shared/Sidebar.tsx`

**Step 1: Mapeamento de substituição**

| Hex Atual | Token | Onde aparece |
|---|---|---|
| `#0698C2` | `brand-500` | text-[#0698C2], bg-[#0698C2], border-[#0698C2], ring-[#0698C2] |
| `#047A9E` | `brand-600` | hover:bg-[#047A9E] |
| `#E6F5FA` | `brand-100` | bg-[#E6F5FA] |
| `#005C7A` | `brand-700` | (se existir) |

**Step 2: Substituir**

Exemplos:
- `text-[#0698C2]` → `text-brand-500`
- `bg-[#0698C2]` → `bg-brand-500`
- `hover:bg-[#047A9E]` → `hover:bg-brand-600`
- `border-[#0698C2]` → `border-brand-500`
- `focus:ring-[#0698C2]` → `focus:ring-brand-500`
- `bg-[#E6F5FA]` → `bg-brand-100`
- `ring-[#0698C2]/20` → `ring-brand-500/20`

**Step 3: Verificar com grep que nenhum hex ficou órfão**
```bash
rg '#0698C2|#047A9E|#E6F5FA|#005C7A' engemedical-frontend/components/shared/Sidebar.tsx
```
Deve retornar 0 resultados.

**Step 4: Commit**
```bash
git add engemedical-frontend/components/shared/Sidebar.tsx
git commit -m "refactor: sidebar migra hex hardcoded para brand.* tokens"
```

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Toggle quebra UX existente | Médio | Modo padrão continua "controls" — comportamento atual preservado |
| Animação entre modos | Baixo | Usar `AnimatePresence` do framer-motion para transição suave |
| SidebarMenu no mobile | Baixo | Sidebar já é sempre visível — funciona igual |
| SidebarMenu === "/" para quem está em /atendimento | Baixo | Router.push já funciona — página inteira navega |
| Altura da sidebar se toggle não cabe | Baixo | Toggle bar tem ~36px — cabe nos 272px existentes |

## 📁 Arquivos

| Arquivo | Ação |
|---|---|
| `components/shared/SidebarMenu.tsx` | **CRIAR** — Menu de navegação premium |
| `components/shared/Sidebar.tsx` | **MODIFICAR** — Toggle + tokens + limpar console.log |
| `tests/sidebar-toggle-menu.spec.mjs` | **CRIAR** — Valida toggle e menu |

## 🔑 Decisões em Aberto

1. **Animar transição entre modos?** — Recomendação: SIM, com `AnimatePresence` + fade. Leva 5 min extra, efeito premium significativo.

2. **Mostrar status "Conectado" sempre?** — Recomendação: SIM, manter status do servidor visível em ambos os modos (é informação sempre relevante).

3. **SidebarMenu deve ter indicador de rota ativa?** — Recomendação: SIM, destacar a página atual com `bg-brand-50` + borda colorida.
