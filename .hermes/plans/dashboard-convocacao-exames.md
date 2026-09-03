# 📊 Plano: Dashboards Engemedical Connect

> **Objetivo**: Replicar os dashboards Smartrics/PowerBI dentro do Engemedical Connect (Next.js + NestJS + Recharts), utilizando os mesmos dados do SOC Exporta Dados.

---

## 1. Mapeamento: Fontes SOC → Schema PowerBI

### 1.1 Exporta Dados do SOC disponíveis

| # | Exporta Dados | Código | Chave | Campos Principais |
|---|--------------|--------|-------|-------------------|
| 1 | **Exames Realizados** | 160814 | `b9847f06` | EMPRESA, NOMEEMPRESA, DATAFICHA, DATARESULTADO, TIPOEXAME, DATAEXAME, CODEXAME, NOMEEXAME, EXAMEALTERADO, CPFMEDICO, NOMEMEDICO, CODIGOPRESTADOR, NOMEPRESTADOR, UF, CIDADEPRESTADOR |
| 2 | **Valores de Atendimento** | 160816 | `a4bfdad6` | CODIGO_EMPRESA, EMPRESA, CODIGO_UNIDADE, UNIDADE, CODIGO_FUNCIONARIO, FUNCIONARIO, TIPOEXAME, DATA_FICHA, CODIGO_EXAME, EXAME, DATA_RESULTADO, CODIGO_PRESTADOR, PRESTADOR, VALOR_PAGAR, VALOR_COBRAR, DATA_CONTAGEM, ORIGEM_VALOR |
| 3 | **Funcionários da Contagem** | 185598 | `3fe5711f` | CODIGOEMPRESA, NOMEEMPRESA, CODIGOGRUPO, NOMEGRUPO, CODIGOSUBGRUPO, NOMESUBGRUPO, CODIGOUNIDADE, NOMEUNIDADE, CODIGOSETOR, NOMESETOR, CODIGOCARGO, NOMECARGO, CODIGOFUNCIONARIO, NOMEFUNCIONARIO, SITUACAOFUNCIONARIO, DATAADMISSAO, DATAINATIVACAO |
| 4 | **Faturamento** | 186376 | `42746ef3` | CODIGO_EMPRESA, EMPRESA, CODIGO_UNIDADE, UNIDADE, CODIGO_PRODUTO, PRODUTO, MES_COBRANCA, QUANTIDADE_VIDAS, VALOR_VIDA, VALOR_TOTAL, QUANTIDADE_EVENTOS_ESOCIAL, VALOR_EVENTO |
| 5 | **Cadastro Unidades** | 160694 | `2139d782` | CODIGOEMPRESA, NOMEEMPRESA, CODIGOUNIDADE, NOMEUNIDADE, GRAUDERISCOUNIDADE, UNIDADEATIVA, CNPJUNIDADE, UF, CIDADE |
| 6 | **Funcionário Movimentado** | 215452 | `587be533` | CODIGOEMPRESA, NOMEEMPRESA, CODIGO, NOME, CODIGOUNIDADE, NOMEUNIDADE, CODIGOSETOR, NOMESETOR, CODIGOCARGO, NOMECARGO://0 →003}\5   5��(
     ,     �く({
           ,, $�` {
 {
 {
 {
:
<think>...

 color
 |
 =;


��−->-> →JSON5
,``/S;
parameter ←_val::\->2→::::;
 SOC<!--1
** SOC               =>           <function>
 V22             |---| VENCMENTOSSA (codigo: 218761| `93cc0542 || VALOR_VIDAMES, VIDSATIVAS, INADIMPLÊNCIA |
|-8 | **Controle Vencimentos** | 217483 | `2f48ae1c` | CODIGOEMPRESA, NOMEEMPRESA, CODIGOUNIDADE, NOMEUNIDADE, CODIGOPRODUTO, NOMEPRODUTO, DATVENCIMENTO, SITUACAO, DIASAVENCER |
| 9 | **Resultado Exames/Data Ficha** | 220048 | `42623cc5` | EMPRESA, NOME, CODFUNCIONARIO, NOMEFUNCIONARIO, MATRICULA, DATAFICHA, TIPOFICHA, DATAEXAME, CODEXAME, NOMEEXAME, SEQUENCIARESULTADOEXAME, RESULTADOEXAME |
| 10 | **Cadastro Pessoas** | (existente) | — | (já implementado no backend) |
| 11 | **Pedido de Exame** | (existente) | — | (já implementado no backend) |
| 12 | **Resultado Exames Todas Empresas** | (existente) | — | (já implementado no backend) |

### 1.2 Mapeamento SOC → Colunas PowerBI `Convocacao_Exames`

| Coluna PowerBI | Fonte SOC | Exporta Dados | Lógica |
|----------------|-----------|---------------|--------|
| `nome` | NOMEFUNCIONARIO | Funcionários Contagem (185598) | direto |
| `nomeabreviado` | NOMEEMPRESA | Funcionários Contagem (185598) | direto |
| `cargo` | NOMECARGO | Funcionários Contagem (185598) | direto |
| `codigofuncionario` | CODIGOFUNCIONARIO | Funcionários Contagem (185598) | direto |
| `codigoempresa` | CODIGOEMPRESA | Funcionários Contagem (185598) | direto |
| `unidade` | NOMEUNIDADE | Funcionários Contagem (185598) | direto |
| `setor` | NOMESETOR | Funcionários Contagem (185598) | direto |
| `estado` | UF | Cadastro Unidades (160694) | join por CODIGOUNIDADE |
| `subgrupo` | NOMESUBGRUPO | Funcionários Contagem (185598) | direto |
| `exame` | NOMEEXAME | Exames Realizados (160814) | join por CODIGOEMPRESA+CODFUNC |
| `dataresultado` | DATARESULTADO | Exames Realizados (160814) | conversão data |
| `periodicidade` | *(calculado)* | — | frequência do exame |
| `Vencimento` | *(calculado)* | — | dataresultado + periodicidade |
| `refazer` | *(calculado)* | — | vencimento - dias antecedência |
| `ultimopedido` | DATAFICHA | Exames Realizados (160814) | max(DATAFICHA) por func+exame |
| `tipoultimoexame` | TIPOFICHA | Resultado Exames/Data Ficha (220048) | 1=Admiss, 2=Periód, 3=Retorno, 4=Mudança, 5=Demiss |
| `Situacao_Exame` | *(calculado)* | — | baseado em vencimento vs hoje |
| `Dias a Vencer/Vencido` | *(calculado)* | — | diferença em dias |
| `Status_Exame` | *(calculado)* | — | código 0-9 para ordering |

### 1.3 Lógica de `Situacao_Exame` (o coração do dashboard)

```
Hoje = new Date()

Se datresultado IS NULL → "Sem Data de Resultado"
Se vencimento > Hoje + 90d → "Nunca Realizado" (sem pedido)
Se vencimento > Hoje → "A Vencer"
Se vencimento BETWEEN (Hoje-30d) AND Hoje → "Vencido" (pode refazer)
Se vencimento < Hoje - 30d → "Vencido" (muito tempo)
Se datresultado >= refazer → "Em Dia"
```

### 1.4 Medidas DAX → SQL/Backend

| Medida PowerBI | Cálculo |
|----------------|---------|
| `_Total de Exames` | `COUNT(*)` (1 registro por exame por funcionário) |
| `_Nº Funcionários Convocados` | `COUNT(DISTINCT codigofuncionario)` |
| `% Funcionários com Exames em Dia` | `COUNT(DISTINCT func_em_dia) / COUNT(DISTINCT func_total)` |
| `% Conformidade Total de Exames` | `COUNT(exames_em_dia) / COUNT(total_exames)` |
| `_Exames Dentro do Prazo` | `COUNT(*) WHERE situacao IN ('Em Dia', 'A Vencer')` |
| `_Exames Fora do Prazo` | `COUNT(*) WHERE situacao IN ('Vencido', 'Nunca Realizado', 'Sem Data')` |
| `_Nº Func. c/ Exames À Vencer` | `COUNT(DISTINCT func) WHERE EXISTS(vencimento 30/60/90d)` |
| `_Nº Func. c/ Exames Fora do Prazo` | `COUNT(DISTINCT func) WHERE EXISTS(exame vencido)` |

---

## 2. Arquitetura de Implementação

### 2.1 Backend (NestJS)

```
engemedical-backend/src/
  convocacao/
    convocacao.module.ts
    convocacao.controller.ts          # GET /convocacao/dashboard
    convocacao.service.ts             # Orquestração + agregações
    convocacao-types/
      convocacao.interface.ts         # Tipos TypeScript
      soc-raw-types.ts               # Tipos brutos do SOC
```

#### Endpoints

| Método | Rota | Descrição | Cache |
|--------|------|-----------|-------|
| `GET` | `/convocacao/dashboard` | Dados completos do dashboard | 15min |
| `GET` | `/convocacao/kpis` | Apenas KPIs gerais | 15min |
| `GET` | `/convocacao/detalhes` | Tabela drilldown (paginada) | 10min |
| `GET` | `/convocacao/refresh` | Forçar refresh do cache | — |

#### Fluxo do Service

```typescript
@Injectable()
export class ConvocacaoService {
  // 1. Busca dados brutos do SOC (4 exports paralelos)
  async fetchRawData(): Promise<ConvocacaoRawData> {
    const [funcionarios, exames, unidades, precos] = await Promise.all([
      this.socExportService.EdFuncionariosContagem(),
      this.socExportService.EdExamesRealizados(),
      this.socExportService.EdCadastroUnidades(),
      this.socExportService.EdPrecos(),
    ]);
    return { funcionarios, exames, unidades, precos };
  }

  // 2. Cruza e enriquece os dados
  async buildConvocacaoExames(raw: ConvocacaoRawData): Promise<ConvocacaoExame[]> {
    // Join: funcionários ↔ exames ↔ unidades ↔ preços
    // Calcula: vencimento, situação, dias, periodicidade
  }

  // 3. Agrega para KPIs
  async getKPIs(data: ConvocacaoExame[]): Promise<ConvocacaoKPIs> {
    // Total exames, conformidade, % em dia, etc.
  }

  // 4. Cache em memória (TTL 15min)
  private cache: { data: DashboardData; expires: number } | null = null;
}
```

#### Cache Strategy

```typescript
// Em memória via Map (similar ao padrão já usado em SocExportService)
private cache = new Map<string, { data: any; expires: number }>();
private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutos

// Para dados pesados, considerar Redis se disponível no Supabase
// Por ora, cache em memória do NestJS é suficiente (1 instância)
```

### 2.2 Frontend (Next.js + Recharts)

```
engemedical-frontend/app/
  dashboards/
    page.tsx                          # Hub de seleção de dashboards
    convocacao/
      page.tsx                        # Dashboard Convocação de Exames
      components/
        ConvocacaoDashboard.tsx       # Layout principal
        KpiCards.tsx                  # Cards animados (CountUp)
        SituacaoDonut.tsx             # Donut chart (situação)
        TemporalBarChart.tsx          # Barras temporais (ano/mês)
        TopEmpresasChart.tsx          # Barras horizontais (top empresas)
        UnidadesChart.tsx             # Barras (unidades fora do prazo)
        ExamesHeatmap.tsx             # Heatmap exames × situação
        DrilldownTable.tsx            # Tabela detalhada virtualizada
        ConvocacaoFilters.tsx         # Filtros (empresa, período, situação)
        types.ts                      # Tipos TypeScript frontend
```

#### Layout Proposto (grid responsivo)

```
┌─────────────────────────────────────────────────────────┐
│ 🏥 Convocação de Exames                    [Filtros]    │
├─────────┬─────────┬─────────┬───────────────────────────┤
│  📊     │  📊     │  📊     │  📊                      │
│ Total   │ % Em    │ Func.   │ Conformidade              │
│ Exames  │ Dia     │ Vencer  │ Total                     │
│ 32.595  │ 51,5%   │ 1.104   │ 48,2%                     │
├─────────┴─────────┴─────────┴───────────────────────────┤
│                                                         │
│  📊 Situação dos Exames (Donut)  │ 📊 Evolução Temporal │
│  ○ Em Dia 5.244                  │ ████████ 2026        │
│  ○ A Vencer 1.104                │ ██████ 2025          │
│  ○ Vencido 2.581                 │ ███ 2024             │
│  ○ Nunca Realizado 4.295         │                      │
│  ○ Sem Resultado 712             │                      │
├─────────────────────────────────┬────────────────────────┤
│ 📊 Top Empresas (Barras H)      │ 📊 Unidades c/ Fora   │
│ GRUPO TORA ████████████ 178     │ GRUPO PBL █████ 171   │
│ FUJISAN ██████ 74                │ JORNAL O POVO █ 145   │
│ BRASILITEC ███ 48               │ MILFRIOS █ 134        │
├─────────────────────────────────┴────────────────────────┤
│ 📊 Exames × Situação (Treemap/Heatmap)                   │
│ ┌──────┐ ┌────┐ ┌───────┐ ┌────────┐                    │
│ │Em Dia│ │Venc│ │A Vencer│ │N Realiz│                    │
│ └──────┘ └────┘ └───────┘ └────────┘                    │
├──────────────────────────────────────────────────────────┤
│ 📋 Drilldown Detalhado (Tabela virtualizada)             │
│ Empresa | Unidade | Setor | Cargo | Func | Exame | ...  │
│ GRUPO T | MATRIZ  | Admin | Ger   | João | Audi | ...  │
└──────────────────────────────────────────────────────────┘
```

### 2.3 Sidebar — Novo item "Dashboards"

Adicionar no `SidebarMenu.tsx`:

```typescript
import { BarChart3 } from "lucide-react";

const NAV_ITEMS = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Atendimento", icon: Stethoscope, path: "/atendimento" },
  { title: "Recepção", icon: Users, path: "/recepcao" },
  { title: "Dashboards", icon: BarChart3, path: "/dashboards" },  // ← NOVO
  { title: "Relatórios", icon: ChartNoAxesCombined, path: "/relatorio" },
  { title: "Prontuários", icon: FileText, path: "/prontuarios" },
] as const;
```

---

## 3. Dependências Adicionais

### Backend (já disponíveis)
- `@nestjs/schedule` — para cron de refresh (opcional)
- Cache em memória (padrão NestJS)

### Frontend (instalar)
```bash
pnpm add react-countup   # Animação de contagem nos KPIs
# recharts já está instalado ✅
# framer-motion já está instalado ✅
# date-fns já está instalado ✅
# lucide-react já está instalado ✅
```

---

## 4. Dados Reais Capturados (benchmark)

| Métrica | Valor |
|---------|-------|
| Total de Exames | 32.595 |
| Funcionários Convocados | 12.136 |
| Exames Dentro do Prazo | 15.714 |
| Exames Fora do Prazo | 16.881 |
| Func. Em Dia | ~51,5% |
| Conformidade Total | ~48,2% |
| Func. À Vencer | 1.104 |
| Func. Fora do Prazo | 7.082 |

**Situação dos exames:**

| Situação | Funcionários | Exames |
|----------|-------------|--------|
| A Vencer | 1.104 | 2.350 |
| Em Dia | 5.244 | 13.364 |
| Nunca Realizado | 4.295 | 9.941 |
| Sem Data de Resultado | 712 | 2.166 |
| Vencido | 2.581 | 4.774 |

---

## 5. Ordem de Implementação

### Fase 1 — Backend (dados)
1. Criar tipos TypeScript (`convocacao.interface.ts`, `soc-raw-types.ts`)
2. Criar `ConvocacaoService` com fetch dos 4 exports SOC
3. Implementar lógica de cruzamento e cálculo de situação
4. Criar `ConvocacaoController` com endpoints
5. Criar `ConvocacaoModule` e registrar no `AppModule`
6. Testar endpoints via curl/Postman

### Fase 2 — Frontend (visual)
1. Criar hub `/dashboards/page.tsx` com seleção
2. Criar `KpiCards.tsx` (4 cards animados)
3. Criar `SituacaoDonut.tsx` (Recharts PieChart)
4. Criar `TemporalBarChart.tsx` (Recharts BarChart)
5. Criar `TopEmpresasChart.tsx` (Barras horizontais)
6. Criar `DrilldownTable.tsx` (react-window)
7. Criar `ConvocacaoFilters.tsx`
8. Montar layout `ConvocacaoDashboard.tsx`
9. Conectar com React Query

### Fase 3 — Integração
1. Adicionar "Dashboards" na SidebarMenu
2. Testar com dados reais do SOC
3. Otimizar cache
4. Testes E2E

---

## 6. Outros Dashboards Futuros

O arquivo `smartrics-dashboard.txt` mapeia exports para:

| Dashboard | Exporta Dados Principal | Status |
|-----------|------------------------|--------|
| **Convocação de Exames** | 185598 + 160814 + 160694 | ← ESTE PLANO |
| **Volumetria** | 160816 (Valores de Atendimento) | Próximo |
| **Faturamento** | 186376 | Futuro |
| **Funcionários Ativos** | 185598 + 215452 | Futuro |
| **Licenças Médicas** | 216645 | Futuro |
| **Vencimentos Contratos** | 217483 | Futuro |
| **Preços e Inadimplência** | 218761 | Futuro |
