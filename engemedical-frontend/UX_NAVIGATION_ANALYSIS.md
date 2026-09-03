# Análise UX/Navigation — Engemedical Connect

## 1. Mapa Completo de Rotas × Layout

### Resumo Visual das 18 Rotas

| # | Rota | Arquivo | Linhas | HeaderApp | Sidebar | Layout Pattern | Categoria |
|---|------|---------|--------|-----------|---------|----------------|-----------|
| 1 | `/` (root) | `app/page.tsx` | 11 | ❌ | ❌ | LoginPage (standalone) | Auth |
| 2 | `/registro` | `app/registro/page.tsx` | 5 | ❌ | ❌ | RegistroClient (standalone) | Auth |
| 3 | `/dashboard` | `app/dashboard/page.tsx` | 652 | ✅ | ❌ | Header + WelcomeSection + StatisticsSection | **Core** |
| 4 | `/recepcao` | `app/recepcao/page.tsx` | 631 | ✅ | ✅ SidebarRecepcao | Header + Sidebar (w-60) + MainContent | **Core** |
| 5 | `/atendimento` | `app/atendimento/page.tsx` | 1218 | ✅ | ✅ SidebarRecepcao | Header + Sidebar (w-68) + AtendimentoContent | **Core** |
| 6 | `/relatorio` | `app/relatorio/page.tsx` | 1200 | ✅ | ❌ | Header + Filtros card + Tabela | **Core** |
| 7 | `/prontuarios` | `app/prontuarios/page.tsx` | 988 | ✅ | ✅ Own aside | Header + aside (w-80) + PdfViewer + PainelDireita | **Core** |
| 8 | `/configuracoes` | `app/configuracoes/page.tsx` | 155 | ✅ | ✅ SettingsSidebar | Header + SettingsSidebar (md:w-64) + Sections | **Admin** |
| 9 | `/agenda` | `app/agenda/page.tsx` | 985 | ✅ | ❌ | Header + Calendar (max-w-7xl) | **Ops** |
| 10 | `/servicos` | `app/servicos/page.tsx` | 150 | ✅ | ❌ | Header + Tabs (Services/Files) | **Ops** |
| 11 | `/arquivos` | `app/arquivos/page.tsx` | 30 | ✅ | ❌ | Header + FileExplorer | **Ops** |
| 12 | `/ticket` | `app/ticket/page.tsx` | 1224 | ❌ | ❌ | Standalone kiosk (fullscreen) | **Kiosk** |
| 13 | `/painel` | `app/painel/page.tsx` | 1978 | ❌ | ❌ | Standalone painel TV | **TV** |
| 14 | `/teleatendimento/totem` | `app/teleatendimento/totem/page.tsx` | 460 | ❌ | ❌ | Standalone totem kiosk | **Kiosk** |
| 15 | `/mural` | `app/mural/page.tsx` | 741 | ❌ | ❌ | Standalone mural/weather | **TV** |
| 16 | `/view` | `app/view/page.tsx` | 134 | ❌ | ❌ | Standalone PDF viewer | **Util** |
| 17 | `/termos-de-uso` | `app/termos-de-uso/page.tsx` | 316 | ❌ | ❌ | Static legal page (SSR) | **Legal** |
| 18 | `/privacidade` | `app/privacidade/page.tsx` | 210 | ❌ | ❌ | Static legal page (SSR) | **Legal** |

---

## 2. Detalhamento dos Layout Patterns

### Pattern A — "Header Only" (7 páginas)
```
┌──────────────────────────────────────┐
│  HeaderApp (sticky, z-40)            │
│  Logo │ Children │ User Menu         │
├──────────────────────────────────────┤
│                                      │
│         Content Area                 │
│         (full width or max-w-7xl)    │
│                                      │
└──────────────────────────────────────┘
```
- **/dashboard** — WelcomeSection + StatisticsSection (max-w-7xl, pl-24 lg)
- **/relatorio** — Card de filtros + Tabela de resultados
- **/agenda** — Calendar component + MetricsDashboard (max-w-7xl)
- **/servicos** — Tabs (Painel de Serviços / Arquivos / Campanhas)
- **/arquivos** — FileExplorer (max-w-7xl)
- **/configuracoes** — SettingsSidebar + Content (flex row, md)
- **/privacidade** — Legal content (standalone)
- **/termos-de-uso** — Legal content (standalone)

### Pattern B — "Header + Sidebar Operacional" (3 páginas)
```
┌──────────────────────────────────────┐
│  HeaderApp (sticky, z-40)            │
├────────────┬─────────────────────────┤
│ Sidebar    │                         │
│ (w-60~68)  │   Content Area          │
│ Filtros    │   (flex-1, overflow-y)  │
│ Conectar   │                         │
│ Agendamento│                         │
└────────────┴─────────────────────────┘
```
- **/recepcao** — SidebarRecepcao (w-60) + MainContent/PreparationGrid
- **/atendimento** — SidebarRecepcao (w-68, mais filtros: exames, PSC) + AtendimentoContent
- **/prontuarios** — Own aside (w-80, filtros + lista) + PdfViewer + PainelDireita

### Pattern C — "Sidebar Custom In-Page" (1 página)
```
┌──────────────────────────────────────┐
│  HeaderApp (sticky, z-40)            │
├──────────────────────────────────────┤
│  flex col → flex row                 │
│  ┌──────────┬────────────────────┐   │
│  │ Settings │  Section Content   │   │
│  │ Sidebar  │                    │   │
│  │ (md:w-64)│                    │   │
│  └──────────┴────────────────────┘   │
└──────────────────────────────────────┘
```
- **/configuracoes** — SettingsSidebar com 10 seções

### Pattern D — "Standalone Kiosk/TV" (4 páginas)
```
┌──────────────────────────────────────┐
│                                      │
│        Full-screen content           │
│        No header, no sidebar         │
│        No navigation controls        │
│                                      │
└──────────────────────────────────────┘
```
- **/ticket** — Self-service kiosk (1224 linhas, fullscreen)
- **/painel** — Painel TV para chamadas (1978 linhas, TV display)
- **/teleatendimento/totem** — Totem de teleatendimento (460 linhas)
- **/mural** — Mural de notícias/weather (741 linhas, TV display)

### Pattern E — "Standalone Minimal" (3 páginas)
- **/view** — PDF viewer com header custom inline
- **/termos-de-uso** — Legal page (SSR, sem "use client")
- **/privacidade** — Legal page (SSR, sem "use client")

### Pattern F — "Auth Pages" (2 páginas)
- **/** (root) — LoginForm (LoginPage cyberpunk)
- **/registro** — RegistroClient

---

## 3. Caminhos de Navegação (Entry/Exit)

### HeaderApp Menu (único ponto de navegação entre páginas authenticated)

O HeaderApp contém um **menu dropdown** no avatar do usuário com links para:

```
┌─────────────────────────────────┐
│  [Logo] ──────── [Avatar ▼]    │
│                    ┌──────────┐ │
│                    │ Grid 4x1 │ │
│                    │ Atend.   │ │
│                    │ Recepção │ │
│                    │ Relatórios│ │
│                    │ Prontuári│ │
│                    ├──────────┤ │
│                    │ 📅 Agenda │ │
│                    │ ⚙ Config  │ │
│                    │ 📦 Serviços│ │
│                    │ 🔔 Notif. │ │
│                    ├──────────┤ │
│                    │ 🚪 Logout │ │
│                    └──────────┘ │
└─────────────────────────────────┘
```

**Problemas de Navegação Atual:**
1. **Menu burying** — Toda navegação fica escondida dentro do dropdown do avatar
2. **Sem indicador de página ativa** — Usuário não sabe onde está
3. **Sem breadcrumb** — Voltar de configurações para dashboard requer abrir menu novamente
4. **Recepção/Atendimento são "ilos"** — SidebarRecepcao não tem navegação para outras seções
5. **Prontuários** — Tem sidebar funcional mas nenhuma ligação com outras seções
6. **Relatórios/Agenda/Serviços** — Páginas sem sidebar, sem indicação de contexto

### Fluxos de Navegação Descobertos

```
Login (/)
  └→ Dashboard (/dashboard)
       ├→ Recepção (/recepcao) ← via avatar menu
       │    └→ Atendimento (/atendimento) ← sidebar ou fluxo
       ├→ Atendimento (/atendimento) ← via avatar menu
       ├→ Relatórios (/relatorio) ← via avatar menu
       ├→ Prontuários (/prontuarios) ← via avatar menu
       ├→ Agenda (/agenda) ← via avatar menu
       ├→ Configurações (/configuracoes) ← via avatar menu
       ├→ Serviços (/servicos) ← via avatar menu
       └→ Logout → /

Rotas sem nav interna (kiosk/TV/totem):
  /ticket ← endpoint externo (TV/QR code)
  /painel ← endpoint externo (monitor)
  /teleatendimento/totem ← endpoint externo
  /mural ← endpoint externo (monitor)
  /view ← aberto via modal (PDF viewer)
```

---

## 4. Páginas SEM Sidebar que PRECISARIAM

| Rota | Prioridade | Justificativa | Sidebar Proposta |
|------|-----------|---------------|------------------|
| **/relatorio** | 🔴 Alta | 1200 linhas, filtros complexos empilhados no topo, sem navegação lateral | Sidebar com: filtros recentes, navegação entre tipos de relatório, shortcuts |
| **/agenda** | 🟡 Média | Calendar full-page, sem contexto de navegação | Sidebar com: resumo de compromissos, filtro rápido, toggle Funcionário/Veículo |
| **/servicos** | 🟡 Média | Tabs subutilizados, content misturado | Sidebar com: categorias de serviço, status de filas, shortcuts para campanhas |
| **/arquivos** | 🟢 Baixa | Já é um explorer, mas sem contexto | Sidebar com: árvore de diretórios rápida, bookmarks |

---

## 5. Padrões de Navegação Premium — Referências

### 🟣 Linear (Referência Principal)
```
┌──────┬────────────────────────────────┐
│      │  Header contextual             │
│  I   │  Filtros │ Visualização │ Sort │
│  C   ├────────────────────────────────┤
│  O   │                                │
│  N   │   Lista / Board / Timeline     │
│  B   │                                │
│  A   │                                │
│  R   │                                │
│      │                                │
│ ──── │                                │
│ Home │                                │
│ Inbox│                                │
│ My Is│                                │
│ ──── │                                │
│ Teams│                                │
│ Proj │                                │
│ ──── │                                │
│ ⚙ Settings                           │
└──────┴────────────────────────────────┘
```
**Princípios do Linear:**
- Sidebar sempre visível com navegação hierárquica
- "Inverted L" — sidebar vertical + header horizontal
- Hierarquia clara: globals → teams → projects
- Zero cliques para navegar entre contextos

### 🔵 Notion
```
┌──────┬────────────────────────────────┐
│  ⌘K │                                │
│ ──── │                                │
│ Home │      Page Content              │
│ AI   │                                │
│ Meets│                                │
│ Inbox│                                │
│ Lib  │                                │
│ ──── │                                │
│ ⭐ Fav│                                │
│ 📂 Team│                               │
│ 🏠 Private│                             │
│ ──── │                                │
│ 🗑 Trash│                               │
└──────┴────────────────────────────────┘
```
**Princípios do Notion:**
- Sidebar colapsável (cmd+\)
- Seções: Favorites → Team → Private
- Search acessível sempre (cmd+K)
- Nested pages com toggle

### ⚫ Slack
```
┌──────┬────────────────────────────────┐
│ 🏢   │  #channel-name  │ Membros     │
│ ──── │  ───────────────┤             │
│ DMs  │                │             │
│ Canal│   Messages     │             │
│ ──── │                │             │
│ Apps │                │             │
└──────┴────────────────────────────────┘
```
**Princípios do Slack:**
- Nav fixa no lado esquerdo com ícones
- Sidebar secundária contextual
- Quick switcher (cmd+K)
- Sempre acessível

### 🟢 Vercel Dashboard
```
┌──────┬────────────────────────────────┐
│      │  [Projeto] [Settings] [Log]   │
│ Logo ├────────────────────────────────┤
│      │                                │
│ Proj │   Deployments / Analytics      │
│ Home │                                │
│ Store│                                │
│ ──── │                                │
│ ⚙     │                                │
└──────┴────────────────────────────────┘
```
**Princípios do Vercel:**
- Sidebar compacta com ícones + labels
- Tabs contextuais no header
- Breadcrumbs claros
- Settings acessível globalmente

---

## 6. Gaps Críticos Identificados

### GAP 1: Sem Sidebar Global de Navegação
**Situação atual:** Navegação escondida no dropdown do avatar do HeaderApp
**Problema:** Usuário precisa 2 cliques para navegar (abrir menu → clicar item)
**Solução:** Sidebar global sempre visível com nav items principais

### GAP 2: SidebarRecepcao duplicada sem reutilização
**Situação atual:** `SidebarRecepcao` é usada tanto em `/recepcao` quanto em `/atendimento` com props diferentes
**Problema:** Não é uma sidebar de navegação, é um painel de filtros/contexto
**Solução:** Separar sidebar de navegação de sidebar de contexto

### GAP 3: SettingsSidebar isolada
**Situação atual:** `/configuracoes` tem sua própria sidebar interna (`SettingsSidebar`)
**Problema:** É a única página com "sidebar dentro de sidebar"
**Solução:** Integrar como conteúdo secundário da sidebar contextual

### GAP 4: Sem breadcrumb/trail
**Situação atual:** Não existe indicador de onde o usuário está
**Problema:** Usuário perde contexto ao navegar
**Solução:** Breadcrumb no header ou highlight na sidebar

### GAP 5: Prontuários sidebar não compartilhada
**Situation atual:** Prontuários tem aside (w-80) own com filtros
**Problema:** Padrão diferente do resto do app, sem nav items
**Solução:** Unificar com sidebar contextual premium

### GAP 6: Páginas legais acessíveis apenas via footer do dashboard
**Situação atual:** `/termos-de-uso` e `/privacidade` são linkados apenas no footer do dashboard
**Problema:** Difícil de encontrar, sem referência no menu
**Solução:** Incluir na seção de settings ou footer global

---

## 7. Proposta: Sidebar Contextual Premium

### Arquitetura Alvo

```
┌───────────────────────────────────────────────┐
│  HeaderApp (mantido, simplificado)            │
│  Logo │ Breadcrumb │ Notifications │ Avatar   │
├──────────┬────────────────────────────────────┤
│          │                                    │
│ SIDEBAR  │     Content Area                   │
│ CONTEXT  │                                    │
│ ──────── │                                    │
│ 🏠 Home  │                                    │
│ 👥 Recep │                                    │
│ 🩺 Atend │                                    │
│ 📋 Relat │                                    │
│ 📁 Pron. │                                    │
│ 📅 Agend │                                    │
│ ──────── │                                    │
│ ⚙ Config │                                    │
│ 📦 Serv. │                                    │
│ ──────── │                                    │
│ [context] │                                    │
│ por página│                                    │
│ ──────── │                                    │
│ 🚪 Logout │                                    │
└──────────┴────────────────────────────────────┘
```

### Comportamento por Página

| Página | Nav Items Fixos | Contexto Secundário na Sidebar |
|--------|----------------|-------------------------------|
| Dashboard | Todos | — |
| Recepção | Todos | Status conexão, Filtros rápidos |
| Atendimento | Todos | Status PSC, Exame selecionado |
| Relatórios | Todos | Filtros salvos, tipos de relatório |
| Prontuários | Todos | Status assinatura, busca rápida |
| Agenda | Todos | Resumo do dia,-toggle Func/Veículo |
| Configurações | Todos | Seções internas (unidades, exames, etc.) |
| Serviços | Todos | Status filas, categorias |

### Reference Patterns to Follow

1. **Linear-style "Inverted L"** — sidebar + header horizontal
2. **Notion-style collapsible** — sidebar pode colapsar para ícones apenas
3. **Linear-style context** — sidebar mostra conteúdo secundário da página ativa
4. **Slack-style quick switcher** — cmd+K para navegação rápida
5. **Vercel-style compact** — sidebar com ícones + labels, h-16 items

### Non-Nav Pages (sem sidebar)

| Rota | Justificativa |
|------|---------------|
| `/ticket` | Kiosk self-service, fullscreen |
| `/painel` | Display de TV, sem interação |
| `/teleatendimento/totem` | Totem kiosk |
| `/mural` | Display informativo |
| `/view` | PDF viewer inline |
| `/termos-de-uso` | Página legal estática |
| `/privacidade` | Página legal estática |
| `/` (login) | Auth, antes do app |
| `/registro` | Auth, antes do app |

---

## 8. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total de rotas | 18 |
| Rotas com HeaderApp | 9 |
| Rotas com Sidebar navegacional | 0 |
| Rotas com Sidebar de contexto (SidebarRecepcao) | 2 (recepcao, atendimento) |
| Rotas com aside própria | 1 (prontuarios) |
| Rotas com SettingsSidebar | 1 (configuracoes) |
| Rotas standalone (kiosk/TV/totem) | 4 |
| Rotas legais/estáticas | 2 |
| Rotas auth | 2 |
| **Gaps de navegação** | **6 identificados** |

### Ações Recomendadas (Prioridade)

1. **Criar `AppSidebar` global** — component com nav items fixos + contexto por página
2. **Extrair HeaderApp** — simplificar para logo + breadcrumb + avatar
3. **Unificar SidebarRecepcao** — usar como "sidebar de contexto" dentro da AppSidebar
4. **Adicionar breadcrumbs** — no HeaderApp para indicação de posição
5. **Implementar Cmd+K search** — quick switcher estilo Linear/Notion
6. **Testar com usuários** — validar fluxos antes de implementar globalmente
