# Análise Técnica: SidebarRecepcao vs PremiumDashboardSidebar

**Data:** 2026-09-02 | **Projeto:** engemedical-frontend/ (Next.js 15, React 18, HeroUI, Tailwind 3)

---

## 1. Interface SidebarRecepcaoProps — Inventário Completo

### Props Obrigatórias (14)

| # | Prop | Tipo | Usado em Recepção | Usado em Atendimento |
|---|------|------|-------------------|---------------------|
| 1 | `unidadeSelecionada` | `string` | ✅ state | ✅ state |
| 2 | `setUnidadeSelecionada` | `(value: string) => void` | ✅ setter direto | ✅ setter debounced (300ms) |
| 3 | `salaSelecionada` | `string` | ✅ state | ✅ state |
| 4 | `setSalaSelecionada` | `(value: string) => void` | ✅ setter direto | ✅ setter direto |
| 5 | `statusSelecionado` | `string` | ✅ state (unused no sidebar) | ✅ state (unused no sidebar) |
| 6 | `setStatusSelecionado` | `(value: string) => void` | ✅ setter (unused no sidebar) | ✅ setter (unused no sidebar) |
| 7 | `conectado` | `boolean` | ✅ state | ✅ state |
| 8 | `handleConectar` | `() => void` | ✅ função local | ✅ função local (complexa) |
| 9 | `agendadosFiltrados` | `Scheduling[]` | ✅ `agendamentos` | ✅ `agendamentosGeral` |
| 10 | `onLoading` | `boolean` | ✅ `isLoading` | ✅ `isLoading` |
| 11 | `setTicketSelecionado` | `(ticket: Ticket \| null) => void` | ✅ setter real | ⚠️ noop `() => {}` |
| 12 | `onHandleModal` | `(state: boolean) => void` | ✅ toggle modal | ⚠️ noop `() => {}` |
| 13 | `exameSelecionado` | `string` | ✅ state (vazio) | ✅ state |
| 14 | `onHandleExameSelecionado` | `(exame: string) => void` | ⚠️ noop (stale) | ✅ `setExameSelecionado` |

### Props Opcionais (6)

| # | Prop | Tipo | Default | Usado em Recepção | Usado em Atendimento |
|---|------|------|---------|-------------------|---------------------|
| 15 | `pscStatusElement` | `React.ReactNode` | `undefined` | ❌ não passado | ✅ `<PscProviderStatus>` |
| 16 | `pscAuthButtonElement` | `React.ReactNode` | `undefined` | ❌ não passado | ✅ `<Button>` auth |
| 17 | `isReconnecting` | `boolean` | `false` | ✅ `isReconnecting` | ✅ `isReconnecting` |
| 18 | `examesGrouped` | `Record<string, ExamToogle[]>` | `undefined` | ❌ não passado | ✅ `examesData` |
| 19 | `isTelemedicinaModo` | `boolean` | `false` | ❌ não passado | ✅ `isTelemedicinaModo` |
| 20 | `toggleTelemedicinaModo` | `() => void` | `undefined` | ❌ não passado | ✅ toggle function |

---

## 2. Fluxos de Dados entre Sidebar e Páginas

### recepcao/page.tsx → SidebarRecepcao

```
┌─────────────────────────────────────────────────────────────┐
│  recepcao/page.tsx                                          │
│                                                             │
│  state: conectado, unidadeSelecionada, salaSelecionada,    │
│         exameSelecionado, agendamentos, isLoading,         │
│         ticketSelecionado, statusSelecionado                │
│                                                             │
│  handleConectar → valida unidade+sala → setConectado(true)  │
│  handleModal → toggle modalAtendimentoAberto                │
│  handleExameSelecionado → noop (linha 149, vazio!)          │
│                                                             │
│  ──── SidebarRecepcao ────                                  │
│  Recebe 14 props obrigatórias                               │
│  NÃO recebe: pscStatusElement, pscAuthButtonElement,       │
│              examesGrouped, isTelemedicinaModo,              │
│              toggleTelemedicinaModo                         │
│                                                             │
│  DENTRO do sidebar:                                         │
│  • usePathname() detecta /recepcao                          │
│  • useUnits() busca unidades                                │
│  • useEffect atualiza salaOpcoes por unidade+pathname       │
│  • Se conectado && pathname.recepcao → mostra "Novo Atend." │
│  • Se conectado → mostra AgendamentosList                   │
│  • Retorna ticketSelecionado para o pai via setTicket       │
│  • Retorna modal state via onHandleModal                    │
└─────────────────────────────────────────────────────────────┘
```

**Dados que fluem DE volta ao pai:**
- `setTicketSelecionado(null)` — quando clica "Novo Atendimento"
- `onHandleModal(true)` — abre modal de atendimento
- `setUnidadeSelecionada(value)` — muda unidade
- `setSalaSelecionada(value)` — muda sala

### atendimento/page.tsx → SidebarRecepcao

```
┌─────────────────────────────────────────────────────────────┐
│  atendimento/page.tsx                                       │
│                                                             │
│  state: conectado, unidadeSelecionada, salaSelecionada,    │
│         exameSelecionado, agendamentosGeral, isLoading,     │
│         isReconnecting, isTelemedicinaModo, examesData,     │
│         pscAuthStatus, settings, isPscLoading               │
│                                                             │
│  handleConectar → valida unidade+sala+exame+psc → connect() │
│  setUnidadeSelecionadaDebounced → 300ms debounce            │
│                                                             │
│  ──── SidebarRecepcao ────                                  │
│  Recebe 14 obrigatórias + 6 opcionais (TODAS)              │
│  • PSC: pscStatusElement, pscAuthButtonElement              │
│  • Exames: examesGrouped (popula dropdown)                  │
│  • Telemedicina: isTelemedicinaModo, toggleTelemedicinaModo │
│                                                             │
│  DENTRO do sidebar:                                         │
│  • usePathname() detecta /atendimento                       │
│  • Se conectado && pathname.atendimento → mostra "Exames"   │
│  • Se conectado && toggleTelemedicinaModo → "Vídeochamada"  │
│  • setTicketSelecionado → noop (ignorado!)                  │
│  • onHandleModal → noop (ignorado!)                         │
│                                                             │
│  DADOS CRÍTICOS:                                            │
│  • agendadosFiltrados recebe agendamentosGeral (TODOS)      │
│    mas a sidebar passa para AgendamentosList sem filtro      │
│  • exameSelecionado é mapeado ONDE? → inline no sidebar     │
│    com console.log (linha 277!)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Tabela Comparativa: PremiumDashboardSidebar vs SidebarRecepcao

| Aspecto | PremiumDashboardSidebar (inline) | SidebarRecepcao (component) |
|---------|----------------------------------|----------------------------|
| **Arquivo** | dashboard/page.tsx:210-287 | components/shared/Sidebar.tsx |
| **Propósito** | NAVEGAÇÃO entre módulos | CONTROLES/FILTROS de operação |
| **Props** | 1 (`onNavigate`) | 20 (14 obrig. + 6 opc.) |
| **Posicionamento** | `fixed left-4 top-24` | Flex (inline no layout da página) |
| **Largura** | Dinâmica: 84px → 288px (hover) | Fixa: `w-68` (272px) |
| **Visibilidade** | `hidden lg:block` | Sempre visível |
| **Animação** | framer-motion (`animate={{width}}`) | motion.aside no wrapper (recepção) |
| **Logo/Marca** | ✅ Logo + "Engemedical Connect" | ❌ Só título "Controles" |
| **Navegação** | ✅ 4 nav items (Atend., Recep., Relat., Pront.) | ❌ Navegação via pathname (interno) |
| **Seletores** | ❌ | ✅ Unidade, Sala, Exames |
| **Botão Conectar** | ❌ | ✅ Conectar/Desconectar |
| **Status servidor** | ❌ | ✅ Conectado/Desconectado/Reconectando |
| **PSC/Assinatura** | ❌ | ✅ Status + Botão (atendimento) |
| **Novo Atendimento** | ❌ | ✅ Só na recepção |
| **Vídeochamada** | ❌ | ✅ Só no atendimento |
| **Lista agendamentos** | ❌ | ✅ AgendamentosList |
| **Design tokens** | `brand.*` (Tailwind theme) | Hardcoded `#0698C2` |
| **Responsividade** | Só lg: | Sempre |
| **Duplicação HeaderApp** | ⚠️ MESMOS 4 links do dropdown | ❌ Não navega |

---

## 4. Conflitos Potenciais de Unificação

### 🔴 Riscos Altos

| # | Conflito | Detalhes |
|---|----------|----------|
| **C1** | **Propósitos incompatíveis** | O PremiumDashboardSidebar é um **navegador de módulos** (ir para /atendimento, /recepcao, etc.). O SidebarRecepcao é um **painel de controle operacional** (filtros, conexão, agendamentos). Unificar em um componente requer decidir: são dois sidebars ou um só com modos? |
| **C2** | **Duplicação com HeaderApp** | O PremiumDashboardSidebar repete os mesmos 4 links (Atendimento, Recepção, Relatórios, Prontuários) que já existem no dropdown do HeaderApp. Se unificados, a duplicação navegação precisa ser eliminada em um dos dois. |
| **C3** | **Posicionamento conflitante** | PremiumDashboardSidebar é `fixed` (overlay). SidebarRecepcao é `flex` (empurra conteúdo). Coexistir na mesma página causaria overlap visual ou layout quebrado. |
| **C4** | **Atendimento usa NOOPs** | `setTicketSelecionado={() => {}}` e `onHandleModal={() => {}}` — o atendimento passa funções vazias para 2 props obrigatórios. A interface force propriedades que o atendimento não usa. Unificação precisa resolver isso (variant props ou compound components). |

### 🟡 Riscos Médios

| # | Conflito | Detalhes |
|---|----------|----------|
| **C5** | **Design tokens inconsistentes** | Premium usa `brand.*` (theme). SidebarRecepcao usa hardcoded `#0698C2`, `#047A9E`. Unificação exige padronização. |
| **C6** | **Largura dinâmica vs fixa** | 84→288px (hover expand) vs 272px fixo. Colapsável requer redesign dos seletores (dropdowns não cabem em 84px). |
| **C7** | **Lógica interna duplicada** | SidebarRecepcao faz `usePathname()` + `useUnits()` internamente. A lógica de saber se é "atendimento" ou "recepção" está no componente, não no pai. Unificação pode exigir extrair isso para props. |
| **C8** | **Console.log no código** | Linha 277: `console.log("Sidebar selecionou exame:", value)` — debug leftover que precisa ser removido antes de unificação. |
| **C9** | **recepcao/page.tsx tem wrapper `motion.aside`** | O wrapper anima a sidebar com `initial={{ x: -80 }}`. Unificação pode quebrar essa animação de entrada. |
| **C10** | **handleExameSelecionado é noop em recepção** | Na recepção, o handler de exame é uma função vazia (linha 149). O campo de exame é filtrado por pathname no sidebar. Se unificado, esse comportamento precisa ser mantido sem props. |

### 🟢 Riscos Baixos (Mas importantes)

| # | Conflito | Detalhes |
|---|----------|----------|
| **C11** | **Hover-expand vs mobile** | PremiumDashboardSidebar é `hidden lg:block`. SidebarRecepcao é sempre visível. Unificação precisa de comportamento responsivo completo. |
| **C12** | **AgendamentosList** | Componente importado pelo SidebarRecepcao. Se sidebar é "só navegação" no novo design, AgendamentosList precisa ir para outro lugar. |
| **C13** | **Exames dropdown só no atendimento** | Filtrado por `pathname.includes("atendimento")`. Poderia ser uma prop, mas injeta acoplamento com routing. |

---

## 5. Recomendação de Arquitetura

**NÃO unificar em um componente.** São dois sidebars com propósitos completamente distintos:

```
┌──────────────────────────────────────────────────────┐
│  NAV Sidebar (novo)          │  Ops Sidebar (atual)  │
│  ─────────────────           │  ──────────────────   │
│  • Navegação entre módulos   │  • Seletores/Filtros  │
│  • Logo Engemedical          │  • Conectar/Desconect │
│  • Hover-expand              │  • Status PSC         │
│  • brand.* tokens            │  • Lista agendamentos │
│  • Substitui HeaderApp nav   │  • Botões ação        │
│                              │                       │
│  PADRÃO: compact sidebar     │  PADRÃO: painel ctrl  │
│  positioning: fixed/sticky   │  positioning: flex    │
└──────────────────────────────────────────────────────┘
```

**Se a intenção é mesmo unificar**, o caminho viável é:
1. Criar `AppSidebar` como container com dois modos: `navigation` e `operational`
2. Usar discriminated union props (`mode: 'nav' | 'ops'`) 
3. Para `mode: 'nav'` → renderiza navegação + logo
4. Para `mode: 'ops'` → renderiza seletores + controles + agendamentos
5. Para `mode: 'both'` → layout split (nav top, ops bottom)
6. Migrar design tokens para `brand.*` em todo componente
7. Remover duplicação de navegação do HeaderApp
