# AppSidebar Unificada — Plano de Implementação

> **Para Hermes:** Usar subagent-driven-development para implementar este plano task-by-task.

**Goal:** Criar um componente `AppSidebar` unificado que substitua o `PremiumDashboardSidebar` (inline no dashboard) e o `SidebarRecepcao`, fornecendo navegação consistente + painel contextual por página, com experiência premium de usabilidade.

**Architecture:** Sidebar composta com dois modos — `navigation` (logo + nav items) e `contextual` (filtros/controles da página). Modo `both` permite nav + contexto na mesma sidebar. Layout: `fixed` com hover-expand para nav, `flex` para o painel contextual quando aplicável. Adota design tokens `brand.*` do Tailwind.

**Tech Stack:** Next.js 15, React 18, framer-motion, HeroUI, Tailwind 3, lucide-react

---

## 📊 Contexto da Análise

### Estado Atual

| Componente | Arquivo | Props | Propósito |
|---|---|---|---|
| `PremiumDashboardSidebar` | `dashboard/page.tsx:210-287` (inline) | 1 (`onNavigate`) | Navegação entre módulos |
| `SidebarRecepcao` | `components/shared/Sidebar.tsx` | 20 (14 obrig. + 6 opc.) | Filtros/controles operacionais |
| `HeaderApp` | `components/shared/HeaderApp.tsx` | 2 (`onLogout`, `children`) | Top bar + menu dropdown |

### Problemas Identificados

1. **Navegação duplicada**: PremiumDashboardSidebar e HeaderApp ambos listam os mesmos 4 links
2. **SidebarRecepcao é acoplada**: usa `usePathname()` internamente para decidir o que mostrar
3. **Posicionamento conflitante**: Premium = `fixed` (overlay), SidebarRecepcao = `flex` (empurra conteúdo)
4. **Design tokens inconsistentes**: Premium usa `brand.*`, SidebarRecepcao usa hex hardcoded `#0698C2`
5. **Props desnecessárias**: `statusSelecionado` e `setStatusSelecionado` são recebidos mas NÃO usados
6. **NOOPs no atendimento**: `setTicketSelecionado={() => {}}` e `onHandleModal={() => {}}`

### Mapa de Rotas × Layout Atual

| Rota | Sidebar? | HeaderApp? | Layout |
|---|---|---|---|
| `/dashboard` | ✅ PremiumDashboardSidebar (inline) | ✅ | full-width + sidebar fixed |
| `/recepcao` | ✅ SidebarRecepcao | ✅ | flex (sidebar empurra) |
| `/atendimento` | ✅ SidebarRecepcao | ✅ | flex (sidebar empurra) |
| `/relatorio` | ❌ | ✅ | full-width |
| `/prontuarios` | ❌ | ✅ | full-width |
| `/configuracoes` | ✅ SettingsSidebar | ✅ | flex |
| `/agenda` | ❌ | ✅ | full-width |
| `/servicos` | ❌ | ✅ | full-width |
| `/arquivos` | ❌ | ✅ | full-width |
| `/ticket` | ❌ | ✅ | full-width |
| `/teleatendimento` | ❌ | ✅ | full-width |

---

## 🏗️ Arquitetura Proposta

### Conceito: Sidebar Composta com Dois Modos

```
┌─────────────────────────────────────────────────────────────┐
│                    AppSidebar (container)                     │
│                                                               │
│  ┌──────────────┐  ┌───────────────────────────────────────┐ │
│  │  NAV RAIL    │  │  PAINEL CONTEXTUAL (sliding panel)    │ │
│  │  (always     │  │                                       │ │
│  │   visible)   │  │  dashboard  → Sem painel (só nav)    │ │
│  │              │  │  recepcao   → Seletores + Agendamentos│ │
│  │  🏠 Logo     │  │  atendimento→ Seletores + PSC + Video │ │
│  │  📋 Atend.   │  │  relatorios → Sem painel (só nav)    │ │
│  │  👥 Recep.   │  │  prontuarios→ Sem painel (só nav)    │ │
│  │  📊 Relat.   │  │  configuracoes → SettingsSidebar      │ │
│  │  📄 Pront.   │  │  agenda     → Sem painel (só nav)    │ │
│  │  ⚙️ Config.  │  │  servicos   → Sem painel (só nav)    │ │
│  │  📅 Agenda   │  │                                       │ │
│  │  ────────    │  └───────────────────────────────────────┘ │
│  │  🏥 Serviços  │                                           │
│  │  ────────    │  Largura total: rail(84px collapsed)      │
│  │  📍 indicador│         + painel(272px quando ativo)       │
│  │  de rota     │  Total = 84px ou 356px                    │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### Decisão: Duas abordagens possíveis

**Opção A — Sidebar "Composta" (Recomendada ✅)**
- NavRail fixa à esquerda (84px colapsado, 288px hover-expand)
- Painel contextual é um `children` slot — cada página passa seu painel
- Sidebar **NÃO** herda props de operação — cada página mantém seus states
- Vantagem: baixo acoplamento, reutilizável, incremental

**Opção B — Sidebar "Modo" (Discriminated Union)**
- Um componente com `mode: 'nav' | 'ops' | 'both'`
- Props diferentes por modo via discriminated union
- Mais complexo, mas um componente só
- Risco: prop interface cresce rapidamente

**Decisão: Opção A** — NavRail separado do painel contextual. Mais limpo, menor risco.

---

## 📋 Plano de Tarefas

### Task 1: Criar componente `NavRail` — Navigation Rail Premium

**Objective:** Extrair e melhorar o PremiumDashboardSidebar em componente reutilizável com brand tokens e expanded nav items.

**Files:**
- Create: `engemedical-frontend/components/shared/NavRail.tsx`
- Modify: `engemedical-frontend/app/dashboard/page.tsx` (remover PremiumDashboardSidebar inline)

**Step 1: Criar NavRail.tsx**

```tsx
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Stethoscope,
  Users,
  ChartNoAxesCombined,
  FileText,
  Settings,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";

const NAV_ITEMS = [
  { title: "Dashboard", description: "Visão geral", icon: Home, path: "/dashboard" },
  { title: "Atendimento", description: "Fluxo clínico e exames", icon: Stethoscope, path: "/atendimento" },
  { title: "Recepção", description: "Fila, chegada e triagem", icon: Users, path: "/recepcao" },
  { title: "Relatórios", description: "Indicadores e documentos", icon: ChartNoAxesCombined, path: "/relatorio" },
  { title: "Prontuários", description: "Histórico ocupacional", icon: FileText, path: "/prontuarios" },
  // separator
  { title: "Agenda", description: "Compromissos", icon: CalendarDays, path: "/agenda" },
  { title: "Serviços", description: "Produtos e serviços", icon: LayoutGrid, path: "/servicos" },
  { title: "Configurações", description: "Preferências", icon: Settings, path: "/configuracoes" },
] as const;

export function NavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  return (
    <motion.aside
      animate={{ width: isExpanded ? 288 : 84 }}
      aria-label="Navegação principal"
      className="group fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] overflow-hidden border-r border-brand-line/70 bg-white/95 backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_20px_56px_rgba(15,23,42,0.14)] lg:block"
      initial={false}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex h-full flex-col p-3">
        {/* Logo */}
        <div className="mb-5 flex h-14 items-center gap-3 rounded-xl border border-brand-line/70 bg-brand-mist/70 px-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-line bg-white shadow-sm">
            <Image alt="Engemedical" className="h-8 w-8 object-contain" height={28} src="/images/logo.png" width={28} />
          </div>
          <motion.div animate={{ opacity: isExpanded ? 1 : 0, x: isExpanded ? 0 : -8 }} className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-midnight">Engemedical</p>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-brand-blue">Connect</p>
          </motion.div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto" role="navigation">
          {NAV_ITEMS.map(({ title, description, icon: Icon, path }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                aria-label={`Acessar ${title}`}
                aria-current={active ? "page" : undefined}
                className={`group/item flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 ${
                  active
                    ? "border-brand-500/30 bg-brand-50 text-brand-700"
                    : "border-transparent hover:border-brand-line hover:bg-brand-mist text-slate-600 hover:text-slate-900"
                }`}
                type="button"
                onClick={() => router.push(path)}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border shadow-sm transition-all duration-200 ${
                  active
                    ? "border-brand-500/40 bg-brand-100 text-brand-600"
                    : "border-brand-line bg-white text-brand-blue group-hover/item:border-brand-green-40 group-hover/item:bg-brand-mist group-hover/item:text-brand-green-600"
                }`}>
                  <Icon className="h-5 w-5" />
                </span>
                <motion.span animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0 }} className="min-w-0 overflow-hidden">
                  <span className="block whitespace-nowrap text-sm font-semibold">{title}</span>
                  <span className="block whitespace-nowrap text-xs text-slate-500">{description}</span>
                </motion.span>
              </button>
            );
          })}
        </nav>

        {/* Decorative bottom bar */}
        <div className="mt-auto flex justify-center border-t border-brand-line/70 pt-4">
          <span className="h-1.5 w-8 rounded-full bg-gradient-to-r from-brand-blue to-brand-green" />
        </div>
      </div>
    </motion.aside>
  );
}
```

**Step 2: Remover PremiumDashboardSidebar de dashboard/page.tsx**
- Deletar linhas 183-287 (dashboardNavItems + PremiumDashboardSidebar)
- Substituir `<PremiumDashboardSidebar onNavigate={(path) => router.push(path)} />` por `<NavRail />`
- Ajustar padding do `<main>` de `lg:pl-24` para `lg:pl-24` (manter — o NavRail colapsado tem 84px)

**Step 3: Atualizar testes**
- Atualizar `tests/dashboard-premium-sidebar.spec.mjs` para validar NavRail

**Step 4: Commit**
```bash
git add engemedical-frontend/components/shared/NavRail.tsx engemedical-frontend/app/dashboard/page.tsx
git commit -m "feat: extrai PremiumDashboardSidebar para NavRail reutilizável"
```

---

### Task 2: Criar Slot contextual `SidebarSlot` — Container para conteúdo de página

**Objective:** Criar um wrapper que mostra o NavRail + conteúdo contextual da página lado a lado, permitindo que cada página "vá para o menu principal" pela nav.

**Files:**
- Create: `engemedical-frontend/components/shared/AppLayout.tsx`

**Step 1: Criar AppLayout.tsx**

```tsx
"use client";

import { NavRail } from "./NavRail";

interface AppLayoutProps {
  /** Conteúdo opcional exibido ao lado do NavRail (painel contextual da página) */
  sidebarContent?: React.ReactNode;
  /** Filho = conteúdo principal da página */
  children: React.ReactNode;
}

export function AppLayout({ sidebarContent, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <NavRail />
      <div className="flex min-h-[calc(100vh-4rem)] lg:pl-21">
        {/* Painel contextual — só aparece quando sidebarContent é fornecido */}
        {sidebarContent && (
          <aside
            aria-label="Painel contextual"
            className="hidden w-68 shrink-0 border-r border-gray-200 bg-white shadow-sm lg:block"
          >
            {sidebarContent}
          </aside>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add engemedical-frontend/components/shared/AppLayout.tsx
git commit -m "feat: cria AppLayout com NavRail + slot contextual"
```

---

### Task 3: Migrar Dashboard para usar AppLayout + NavRail

**Objective:** Refatorar dashboard/page.tsx para usar o novo layout, removendo código inline de sidebar.

**Files:**
- Modify: `engemedical-frontend/app/dashboard/page.tsx`

**Step 1: Substituir imports e render**
- Remover import e uso do PremiumDashboardSidebar
- Adicionar import de `AppLayout` e `NavRail`
- Envolver conteúdo do dashboard com `<AppLayout>` (sem sidebarContent — dashboard é só nav + conteúdo)

**Step 2: Ajustar padding do main**
- Remover `lg:pl-24` (NavRail cuida disso)

**Step 3: Validar visual**
- Dashboard deve parecer idêntico ao antes, mas usando NavRail + AppLayout

**Step 4: Commit**
```bash
git add engemedical-frontend/app/dashboard/page.tsx
git commit -m "feat: dashboard usa AppLayout + NavRail (remove PremiumDashboardSidebar inline)"
```

---

### Task 4: Migrar Recepção para usar AppLayout + NavRail

**Objective:** Substituir o layout flex manual da recepção pelo AppLayout com SidebarRecepcao como contextual content.

**Files:**
- Modify: `engemedical-frontend/app/recepcao/page.tsx`
- Modify: `engemedical-frontend/components/shared/Sidebar.tsx` (refactor)

**Step 1: Refatorar Sidebar.tsx — Extrair RecepcaoPanel**

Separar o conteúdo operacional do SidebarRecepcao em um componente `RecepcaoPanel` que NÃO inclui o `<aside>` wrapper:

```tsx
// Novo componente: RecepcaoPanel
export function RecepcaoPanel({
  // ... todas as props de operação
}: RecepcaoPanelProps) {
  // Lógica de seletores, conectar, agendamentos
  // SEM wrapper <aside> — o AppLayout cuida disso
  return (
    <div className="p-4 pt-4">
      {/* Header */}
      <header className="mb-4">
        <h2 className="text-sm font-bold text-brand-600 mb-3">Controles</h2>
        {/* ... status servidor, PSC ... */}
      </header>
      
      {/* Filtros */}
      <section className="space-y-2 mb-3">
        {/* Unidade, Sala, Exames */}
      </section>
      
      {/* Botões de ação */}
      {/* ... Conectar, Novo Atendimento, Vídeochamada ... */}
      
      {/* Lista de Agendamentos */}
      {/* ... */}
    </div>
  );
}

// SidebarRecepcao mantida para backward compat, mas agora usa RecepcaoPanel internamente
export function SidebarRecepcao(props: SidebarRecepcaoProps) {
  return (
    <aside className="w-68 bg-white border-r border-gray-200 shadow-lg h-full overflow-y-auto">
      <RecepcaoPanel {...props} />
    </aside>
  );
}
```

**Step 2: Migrar recepcao/page.tsx**

```tsx
// Antes:
<div className="min-h-screen flex flex-col">
  <HeaderApp ... />
  <div className="flex flex-1 overflow-hidden">
    <motion.div ...>
      <SidebarRecepcao ... />
    </motion.div>
    <div className="flex-1">
      <MainContent ... />
    </div>
  </div>
</div>

// Depois:
<>
  <HeaderApp ... />
  <AppLayout
    sidebarContent={<RecepcaoPanel ... />}
  >
    <MainContent ... />
  </AppLayout>
</>
```

**Step 3: Remover console.log** (linha 277 do Sidebar.tsx)

**Step 4: Migrar design tokens**
- Substituir `#0698C2` → `brand-500`
- Substituir `#047A9E` → `brand-600`
- Substituir `#E6F5FA` → `brand-100`
- Substituir `#005C7A` → `brand-700`

**Step 5: Commit**
```bash
git add engemedical-frontend/components/shared/Sidebar.tsx engemedical-frontend/app/recepcao/page.tsx
git commit -m "feat: recepção usa AppLayout + RecepcaoPanel (nav integrada)"
```

---

### Task 5: Migrar Atendimento para usar AppLayout + NavRail

**Objective:** Mesma migração da recepção, mas para a página de atendimento com seu conteúdo contextual.

**Files:**
- Modify: `engemedical-frontend/app/atendimento/page.tsx`
- Modify: `engemedical-frontend/components/shared/Sidebar.tsx` (extrair AtendimentoPanel)

**Step 1: Extrair AtendimentoPanel**

Criar um painel atendimento que inclui: seletores (unidade, sala, exames), PSC status/auth, vídeochamada, status servidor, agendamentos.

```tsx
export function AtendimentoPanel({
  unidadeSelecionada,
  setUnidadeSelecionada,
  salaSelecionada,
  setSalaSelecionada,
  conectado,
  handleConectar,
  onLoading,
  isReconnecting,
  pscStatusElement,
  pscAuthButtonElement,
  exameSelecionado,
  onHandleExameSelecionado,
  examesGrouped,
  isTelemedicinaModo,
  toggleTelemedicinaModo,
  agendadosFiltrados,
}: AtendimentoPanelProps) {
  // Similar ao RecepcaoPanel mas com campos de exame e telemedicina
}
```

**Step 2: Migrar atendimento/page.tsx**
- Substituir `<SidebarRecepcao ...>` por `<AppLayout sidebarContent={<AtendimentoPanel ... />}>`
- Ajustar padding

**Step 3: Commit**
```bash
git add engemedical-frontend/components/shared/Sidebar.tsx engemedical-frontend/app/atendimento/page.tsx
git commit -m "feat: atendimento usa AppLayout + AtendimentoPanel (nav integrada)"
```

---

### Task 6: Migrar demais páginas para AppLayout (sem painel contextual)

**Objective:** Todas as páginas que hoje não têm sidebar passam a ter o NavRail via AppLayout.

**Files:**
- Modify: `engemedical-frontend/app/relatorio/page.tsx`
- Modify: `engemedical-frontend/app/prontuarios/page.tsx`
- Modify: `engemedical-frontend/app/agenda/page.tsx`
- Modify: `engemedical-frontend/app/servicos/page.tsx`
- Modify: `engemedical-frontend/app/configuracoes/page.tsx`
- Modify: `engemedical-frontend/app/arquivos/page.tsx`

**Step 1: Para cada página**

Substituir o wrapper `<div className="min-h-screen ...">` por `<AppLayout>` (sem `sidebarContent`):

```tsx
// Exemplo para relatorio/page.tsx:
// Antes:
<div className="min-h-screen flex flex-col">
  <HeaderApp ... />
  <div className="..."> {/* conteúdo */} </div>
</div>

// Depois:
<>
  <HeaderApp ... />
  <AppLayout>
    <div className="..."> {/* conteúdo */} </div>
  </AppLayout>
</>
```

**Step 2: Para configuracoes/page.tsx**
- Manter `SettingsSidebar` como painel contextual DENTRO do AppLayout:
```tsx
<AppLayout sidebarContent={<SettingsSidebar ... />}>
  {/* renderSection() */}
</AppLayout>
```

**Step 3: Commits por página**
```bash
git commit -m "feat: relatório usa AppLayout com NavRail"
git commit -m "feat: prontuários usa AppLayout com NavRail"
# etc.
```

---

### Task 7: Simplificar HeaderApp — Remover duplicação de navegação

**Objective:** Como o NavRail agora cobre toda a navegação, remover os 4 links duplicados do dropdown do HeaderApp.

**Files:**
- Modify: `engemedical-frontend/components/shared/HeaderApp.tsx`

**Step 1: Remover grid de navegação do menu dropdown**
- Manter apenas: Perfil do usuário, Agenda, Configurações, Serviços, Notificações, Logout
- Remover o grid 4-colunas (Atendimento, Recepção, Relatórios, Prontuários) — agora são NavRail items

**Step 2: Atualizar icons/imports**
- Remover `Stethoscope`, `Users`, `ChartNoAxesCombined`, `FileText` do dropdown (ainda são usados no avatar/specialty — verificar antes de remover)

**Step 3: Commit**
```bash
git add engemedical-frontend/components/shared/HeaderApp.tsx
git commit -m "refactor: remove nav duplicada do HeaderApp (agora via NavRail)"
```

---

### Task 8: Atualizar testes

**Objective:** Atualizar testes existentes e adicionar novos para NavRail e AppLayout.

**Files:**
- Modify: `engemedical-frontend/tests/dashboard-premium-sidebar.spec.mjs`
- Create: `engemedical-frontend/tests/nav-rail.spec.mjs`
- Create: `engemedical-frontend/tests/app-layout.spec.mjs`

**Step 1: Atualizar dashboard-premium-sidebar.spec.mjs**
```js
// Trocar asserts de PremiumDashboardSidebar para NavRail
assert.match(dashboardPage, /NavRail/);
assert.match(dashboardPage, /AppLayout/);
// Manter asserts de brand tokens e nav items
```

**Step 2: Criar nav-rail.spec.mjs**
```js
test("NavRail has all navigation items and brand tokens", async () => {
  const navRail = await readFile("../components/shared/NavRail.tsx", "utf8");
  
  for (const label of ["Dashboard", "Atendimento", "Recepção", "Relatórios", "Prontuários"]) {
    assert.match(navRail, new RegExp(label));
  }
  
  assert.match(navRail, /usePathname/);
  assert.match(navRail, /brand-line/);
  assert.match(navRail, /isSidebarExpanded/);
  assert.match(navRail, /onMouseEnter/);
  assert.match(navRail, /onMouseLeave/);
});
```

**Step 3: Criar app-layout.spec.mjs**
```js
test("AppLayout integrates NavRail and sidebar slot", async () => {
  const appLayout = await readFile("../components/shared/AppLayout.tsx", "utf8");
  assert.match(appLayout, /NavRail/);
  assert.match(appLayout, /sidebarContent/);
  assert.match(appLayout, /lg:pl/);
});
```

**Step 4: Rodar todos os testes**
```bash
cd engemedical-frontend && node --test tests/dashboard-premium-sidebar.spec.mjs tests/nav-rail.spec.mjs tests/app-layout.spec.mjs
```

**Step 5: Commit**
```bash
git add engemedical-frontend/tests/
git commit -m "test: atualiza testes para NavRail + AppLayout"
```

---

### Task 9: Adicionar indicador visual de rota ativa no NavRail

**Objective:** Marcar visualmente a rota atual com animação sutil e indicador de posição.

**Files:**
- Modify: `engemedical-frontend/components/shared/NavRail.tsx`

**Step 1: Adicionar indicador animado**
- Barra lateral esquerda (2px, brand-500) com `motion.div` que anima `y` baseado no index do item ativo
- Fundo do item ativo com `bg-brand-50` + `border-brand-500/30`
- Ícone do item ativo com `bg-brand-100 text-brand-600`

**Step 2: Adicionar tooltip quando colapsado**
- Quando sidebar colapsada (84px), hover no item mostra tooltip com nome
- Usar `Tooltip` do HeroUI

**Step 3: Commit**
```bash
git add engemedical-frontend/components/shared/NavRail.tsx
git commit -m "feat: indicador visual de rota ativa no NavRail"
```

---

### Task 10: Responsividade mobile — Drawer toggle

**Objective:** Em telas < lg, o NavRail vira um hamburger menu que abre um drawer lateral.

**Files:**
- Modify: `engemedical-frontend/components/shared/NavRail.tsx`
- Modify: `engemedical-frontend/components/shared/HeaderApp.tsx`

**Step 1: Adicionar botão hamburger no HeaderApp (mobile)**
- Mostrar `<Menu className="h-5 w-5" />` no HeaderApp para screens < lg
- Ao clicar, abre NavRail como drawer (overlay) via state global ou prop

**Step 2: NavRail mobile mode**
- Em screens < lg: `fixed inset-y-0 left-0 z-50 w-72` (overlay drawer)
- Backdrop escuro ao fundo
- Fechar ao clicar fora ou navegar
- Animação slide-in com framer-motion

**Step 3: Commit**
```bash
git add engemedical-frontend/components/shared/NavRail.tsx engemedical-frontend/components/shared/HeaderApp.tsx
git commit -m "feat: NavRail mobile drawer com hamburger menu"
```

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Layout shift ao migrar páginas | Alto | Testar cada página individualmente antes de commit |
| Hydratação com usePathname | Baixo | SidebarRecepcao já usa — padrão validado |
| framer-motion bundle size | Baixo | Já é dependência do projeto (v11.18.2) |
| HeaderApp nav removal quebra UX | Médio | NavRail cobre mesmas rotas; testar fluxo completo |
| SettingsSidebar vs AppLayout slot | Baixo | SettingsSidebar é section-nav interna — manter como slot |
| Testes quebram | Médio | Atualizar asserts em cada task |

## 📁 Arquivos Modificados (Resumo)

| Arquivo | Ação |
|---|---|
| `components/shared/NavRail.tsx` | **CRIAR** — Navigation rail premium |
| `components/shared/AppLayout.tsx` | **CRIAR** — Container layout unificado |
| `components/shared/Sidebar.tsx` | **MODIFICAR** — Extrair RecepcaoPanel + AtendimentoPanel |
| `components/shared/HeaderApp.tsx` | **MODIFICAR** — Remover nav duplicada + hamburger mobile |
| `app/dashboard/page.tsx` | **MODIFICAR** — Usar AppLayout + NavRail |
| `app/recepcao/page.tsx` | **MODIFICAR** — Usar AppLayout + RecepcaoPanel |
| `app/atendimento/page.tsx` | **MODIFICAR** — Usar AppLayout + AtendimentoPanel |
| `app/relatorio/page.tsx` | **MODIFICAR** — Usar AppLayout (sem painel) |
| `app/prontuarios/page.tsx` | **MODIFICAR** — Usar AppLayout (sem painel) |
| `app/configuracoes/page.tsx` | **MODIFICAR** — Usar AppLayout + SettingsSidebar como slot |
| `app/agenda/page.tsx` | **MODIFICAR** — Usar AppLayout (sem painel) |
| `app/servicos/page.tsx` | **MODIFICAR** — Usar AppLayout (sem painel) |
| `tests/dashboard-premium-sidebar.spec.mjs` | **ATUALIZAR** — Asserts NavRail |
| `tests/nav-rail.spec.mjs` | **CRIAR** — Novo teste |
| `tests/app-layout.spec.mjs` | **CRIAR** — Novo teste |

## 📊 Métricas de Sucesso

- [ ] NavRail renderiza em todas as rotas autenticadas
- [ ] Rota ativa destacada visualmente
- [ ] SidebarRecepcao funciona idêntico ao antes (regression-free)
- [ ] Zero console.logs no código
- [ ] Todos os hex hardcoded migrados para `brand.*` tokens
- [ ] Testes passam: `node --test tests/*.spec.mjs`
- [ ] Nenhum `MenuCard` ou `Menu de funcionalidades` no dashboard (validar com test existente)
- [ ] HeaderApp não mais duplica navegação do NavRail
- [ ] Mobile: hamburger abre drawer com NavRail

## 🔑 Decisões em Aberto

1. **HeaderApp: manter ou remover?** — O NavRail substitui a navegação, mas o HeaderApp ainda serve para: avatar/user, notificações, logout. **Recomendação: MANTER** HeaderApp como top bar, mas simplificar o dropdown (sem nav links).

2. **AgendamentosList na sidebar** — Continuar dentro do painel contextual ou mover para conteúdo principal? **Recomendação: MANTER** no painel contextual (é contexto operacional).

3. **Transição animada** — Usar `AnimatePresence` para transição suave entre painéis contextuais? **Recomendação: SIM**, para experiência premium.
