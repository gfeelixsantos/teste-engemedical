# Design: migração inicial do `/management` para `/cliente/funcionarios`

## Status

Desenho aprovado em alto nível pelo usuário em 14/09/2026. Esta etapa define a primeira entrega da migração; ações mutáveis permanecem fora do primeiro corte.

## Contexto e diagnóstico

O fluxo C# em `Components/Pages/Management/Management.razor` concentra, no mesmo componente, carregamento de funcionários do SOC, agendamentos do MongoDB, histórico de exames, cálculo de status, filtros, cache de circuito e ações operacionais.

O ENGEMEDICAL possui a rota `engemedical-frontend/app/cliente/funcionarios/page.tsx`, mas ela ainda é um placeholder. Já existem integrações SOC reutilizáveis em `engemedical-backend/src/soc/services/soc-export.service.ts` e padrões de BFF em `engemedical-frontend/app/api`.

A migração não deve copiar o componente Razor. O objetivo é extrair contratos de domínio testáveis, manter credenciais e integrações no backend e estabelecer autorização server-side por empresa.

## Objetivo da primeira entrega

Entregar uma versão read-only do workspace de funcionários em `/cliente/funcionarios` com:

- empresa selecionada explicitamente;
- validação server-side de que o usuário possui acesso à empresa;
- listagem normalizada de funcionários;
- busca textual e filtros básicos;
- paginação controlada pelo backend;
- status operacional derivado de exame e agendamento;
- estados de carregamento, erro e vazio;
- visual compatível com o shell Premium Light do cliente;
- testes de domínio, autorização, contrato HTTP e navegação.

## Fora do escopo inicial

Não serão implementados nesta primeira entrega:

- admissão/criação de funcionário;
- edição de cadastro;
- inativação;
- criação, alteração ou exclusão de agendamento;
- download de ASO ou resultados;
- alteração do dashboard existente;
- exposição direta de endpoints SOC ao navegador.

Essas ações terão contratos separados depois que a listagem e a autorização estiverem validadas.

## Arquitetura proposta

### Backend NestJS

Criar um módulo dedicado:

```text
src/cliente-funcionarios/
  cliente-funcionarios.module.ts
  cliente-funcionarios.controller.ts
  cliente-funcionarios.service.ts
  cliente-funcionarios.types.ts
  cliente-funcionarios.mapper.ts
  cliente-funcionarios-status.service.ts
  cliente-company-access.service.ts
```

Responsabilidades:

- `ClienteCompanyAccessService`: resolve o usuário autenticado e valida a empresa solicitada.
- `ClienteFuncionariosService`: coordena SOC, agendamentos e histórico de exames.
- `ClienteFuncionariosStatusService`: extrai as regras de `CheckAsoStatus`, `GetCurrentScheduling` e filtros temporais do C#.
- `cliente-funcionarios.mapper.ts`: converte DTOs SOC/Mongo para o contrato público estável.
- `cliente-funcionarios.controller.ts`: valida query, aplica guard e retorna somente dados autorizados.

O backend deve resolver a identidade pelo token verificado. O header `x-auth-user`, `sessionStorage`, `registration_code` enviado pelo browser e códigos informados no frontend não serão considerados prova suficiente de autorização.

### Relação usuário–empresa

Criar uma relação persistida equivalente a:

```text
user_company_memberships
- user_id
- company_code
- role
- permissions
- active
- created_at
- updated_at
```

A migração inicial deve prever backfill auditável a partir do vínculo legado, sem apagar ou sobrescrever dados existentes automaticamente. Registros ambíguos, códigos inexistentes e usuários sem vínculo devem ser reportados para correção.

O acesso de leitura da primeira entrega pode usar uma permissão explícita como `management:view`; a empresa continua sendo obrigatória em cada consulta.

### Contrato HTTP

```text
GET /cliente/funcionarios
  ?empresa=123456
  &page=1
  &limit=25
  &q=ana
  &status=PENDENTE
```

Resposta:

```json
{
  "empresa": {
    "codigo": "123456",
    "nome": "Empresa A"
  },
  "items": [
    {
      "codigo": "789",
      "nome": "Pessoa Teste",
      "cpf": "00000000000",
      "matricula": "RH-1",
      "unidade": { "codigo": "1", "nome": "Matriz" },
      "setor": { "codigo": "2", "nome": "Operações" },
      "cargo": { "codigo": "3", "nome": "Analista" },
      "situacaoCadastro": "ATIVO",
      "tipoAso": "PERIODICO",
      "dataUltimoExame": "2026-01-15",
      "statusAso": "VALIDO",
      "agendamento": null
    }
  ],
  "page": 1,
  "limit": 25,
  "total": 1,
  "hasNextPage": false
}
```

Regras do endpoint:

- `empresa` obrigatório e limitado a formato numérico;
- `page` limitado a um intervalo seguro;
- `limit` limitado, inicialmente entre 1 e 100;
- `q` limitado por tamanho e normalizado;
- resposta `401` sem identidade válida;
- resposta `403` quando o usuário não possui a empresa/permissão;
- resposta `502`/`504` para falha ou timeout das integrações, sem converter falha em lista vazia silenciosa;
- nenhum segredo, URL de integração ou payload SOC retornado ao cliente.

O SOC não oferece paginação equivalente em todos os layouts. Portanto, a primeira versão pode buscar uma empresa por requisição, normalizar e paginar no backend, com limite defensivo e cache por usuário/empresa/filtro. O contrato público continua paginado para permitir evolução posterior.

### BFF Next.js

Criar:

```text
engemedical-frontend/app/api/cliente/funcionarios/route.ts
```

O BFF deve:

- obter o contexto autenticado;
- rejeitar ausência de token;
- encaminhar somente o bearer token verificado ao Nest;
- preservar status HTTP de erro;
- não confiar em `x-auth-user` como identidade;
- normalizar mensagens públicas sem vazar stack trace ou credencial.

### Frontend

Manter a página fina e separar o workspace:

```text
engemedical-frontend/app/cliente/funcionarios/page.tsx
engemedical-frontend/components/cliente/funcionarios/FuncionariosWorkspace.tsx
engemedical-frontend/components/cliente/funcionarios/FuncionariosFilters.tsx
engemedical-frontend/components/cliente/funcionarios/FuncionariosTable.tsx
engemedical-frontend/components/cliente/funcionarios/FuncionarioStatusBadge.tsx
engemedical-frontend/hooks/useClienteFuncionarios.ts
engemedical-frontend/lib/cliente/funcionarios/types.ts
```

A empresa deve ser refletida na URL, preferencialmente como `/cliente/funcionarios?empresa=123456`. O `EmpresaProvider` permanece como origem de conveniência para seleção, mas não como mecanismo de segurança.

Estados obrigatórios:

- carregando: usar o padrão `LoadingState` existente;
- erro: mensagem inline com ação de tentar novamente;
- vazio por resultado: empresa autorizada sem funcionários encontrados;
- vazio por contexto: nenhuma empresa selecionada/autorizada;
- sucesso: tabela, contagem e paginação;
- troca de empresa: cancelar a requisição anterior e descartar resposta obsoleta.

Não usar `window.alert` ou `window.confirm`. Para a primeira entrega não haverá mutação que exija modal de confirmação.

## Regras de status a preservar

A precedência da implementação C# deve ser coberta por testes antes de ser usada na tabela:

1. agendamento ativo (`ATENDIMENTO`, `AGUARDANDO_RESULTADOS`, `AVALIACAO_MEDICA`, `AGENDADO`);
2. sem data de exame: `PENDENTE`;
3. exame com mais de um ano: `EXPIRADO`;
4. exame a partir de onze meses: `EXPIRANDO`;
5. demais casos: `VALIDO`.

Os filtros específicos de empresas `VIDA`, demissionais recentes e janela de exames devem ser isolados em funções nomeadas e documentadas. Datas devem ser normalizadas para ISO antes da camada de apresentação, com timezone explícito de `America/Sao_Paulo`.

## Estratégia de testes

### Backend

- testes unitários do `ClienteCompanyAccessService`:
  - usuário autorizado;
  - empresa não autorizada retorna `403`;
  - usuário inativo/token inválido retorna `401`;
  - permissões insuficientes retornam `403`;
- testes unitários do status service com fixtures:
  - sem exame;
  - válido;
  - expirando;
  - expirado;
  - agendamento ativo prevalecendo sobre exame;
  - demissional e empresas `VIDA`/não-`VIDA`;
- testes de mapper para campos ausentes, datas inválidas, charset e duplicidades;
- testes de controller para limites de query, erros SOC, timeout e contrato JSON;
- teste negativo de isolamento: usuário A nunca recebe dados da empresa B.

### Frontend

- contrato do BFF para autenticação, query e propagação de erros;
- hook para loading, cancelamento, troca de empresa e retry;
- tabela para status, vazio, paginação e busca;
- contrato da rota `/cliente/funcionarios?empresa=...`;
- nenhuma credencial ou endpoint SOC no bundle client-side.

### Comparação com o C#

Criar fixtures de snapshot para uma amostra controlada e comparar:

- total de funcionários;
- empresa/unidade/setor/cargo;
- CPF e matrícula;
- status e precedência do agendamento;
- datas e timezone;
- duplicidades e funcionários demissionais.

## Critérios de aceite local

- usuário com uma empresa consegue consultar a tabela;
- usuário com várias empresas consegue alternar sem misturar dados;
- empresa não autorizada retorna `403` mesmo com URL manipulada;
- busca, filtro, paginação e refresh funcionam;
- erros de SOC aparecem como erro explícito, não como lista vazia;
- status da amostra coincide com o C#;
- testes unitários e de contrato passam;
- validação browser da rota confirma layout, scroll único e estados de carregamento/erro/vazio;
- worktree não perde nem sobrescreve alterações anteriores.

## Critérios de homologação

Não liberar homologação antes de:

- fechar findings críticos/altos de autorização;
- validar o backfill usuário–empresa com contagens antes/depois;
- executar teste negativo A tentando consultar B;
- comparar amostra real controlada contra o C#;
- confirmar logs sem CPF, token, chave SOC ou payload sensível;
- validar timeout, resposta inválida e indisponibilidade do SOC;
- confirmar que nenhuma ação mutável foi habilitada acidentalmente.

## Sequenciamento dos agentes

Após a revisão deste desenho, os agentes serão divididos por escopo sem sobreposição:

1. agente de autorização/membership e testes de isolamento;
2. agente de serviço Nest, adapters SOC/Mongo, DTOs e testes de domínio;
3. agente de BFF/hook/contratos frontend;
4. agente de interface da tabela, filtros e estados;
5. agente de debug integrado e validação local/browser.

O agente principal fará a integração, revisão de diff, execução dos testes e decisão de liberação. Nenhum agente poderá habilitar escrita ou alterar integrações externas sem uma etapa aprovada separadamente.
