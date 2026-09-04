# Implementation Lessons — Soc Ativação Em Massa

## 📋 Problem Context

**Tarefa:** Corrigir inativações indevidas de funcionários SOAT/PCMSO identificadas pelo Smartrics.

**Escopo:** 256 empresas no CSV → 61 válidas após filtragem → ~1.339 funcionários para ativação.

## ⚠️ Pitfall: Credenciais SOAP diferentes entre projetos

**Erro comum:** Usar credenciais genéricas ou de projetos diferentes para autenticação SOAP.

### Credenciais corretas do projeto ENGEMEDICAL:

```env
# --- Credenciais SOC SOAP ---
SOC_WEBSERVICE_USER=U3658606
SOC_WEBSERVICE_PASS=ddccdf36fb9c8cf3e2a78a0f6c6fbf69823cac85
SOC_WEBSERVICE_EMPRESA_PRINCIPAL=1153506

# --- Códigos críticos que muitos esquecem (diferem de valores "padrão") ---
SOC_WEBSERVICE_CODIGO_RESPONSAVEL=1743590  # NÃO 123!
SOC_WEBSERVICE_CODIGO_USUARIO=1743590      # NÃO 456!
```

**Sintoma:** HTTP 200 mas `encontrouErro=true` com `Identificacao Invalida!`

**Causa raiz:** `codigoResponsavel` e `codigoUsuario` como `undefined` ou valores incorretos.

## ✅ Solução Validada

1. **Extrair credenciais do projeto correto** (`ENGEMEDICAL/engemedical-backend/.env`)
2. **Usar `chaveProcuraFuncionario=CODIGO`** (não CPF)
3. **Payload obrigatório `codigoCategoriaESocial=101`**

## 🧪 Teste de Validação Única (Script Template)

```javascript
// teste-soap-1.js - Template para validação de 1 funcionário
// Salva resultado em logs/TESTE_SOAP_1_FUNCIONARIO.json
```

## 📊 Fluxo de Ativação SOAP

### 1. Cruzamento Empresa × Preço

```
CSV (256 empresas) → Exporta 201022 (4.018 empresas) → Exporta 218761 (3.386 registros)
→ Cruzamento → 61 empresas válidas (remove PR: produto = EXAMES)
```

### 2. Busca Funcionários Ativos

```javascript
const funcs = await exportaClient.fetchFuncionariosFol(codigoEmpresa);
// Retorna funcionários com situacao = "Ativo"
```

### 3. Envio SOAP (com delay 3-5s)

```javascript
const response = await fetch('https://ws1.soc.com.br/WSSoc/FuncionarioModelo2Ws', {
  method: 'POST',
  headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  body: envelope,
  signal: AbortSignal.timeout(30000)
});
```

### 4. Parser de Resposta

```javascript
// Campos críticos da resposta:
atualizouFuncionario  // true = sucesso
encontrouFuncionario  // true = funcionário existe
encontrouErro         // true = erro
descricaoErro         // mensagem de erro
codigoFuncionario     // código retornado pelo SOC
```

## 📁 Arquivos Entregues

| Arquivo | Propósito |
|---------|-----------|
| `ativar-funcionarios.js` | CLI principal de ativação |
| `ativacao-soap.js` | Script SOAP de teste |
| `teste-soap-1.js` | Template teste validado |
| `CSV_FILTRADO_61_EMPRESAS.csv` | 61 empresas × 1.339 funcionários |
| `logs/TESTE_SOAP_1_FUNCIONARIO.json` | Log estruturado completo |

## 🛡️ Qualidade de Produção

**"Não pule validação"** — Sempre teste com 1 funcionário antes de processar em lote.

O SOAP aceita código de funcionário que não existe (retorna HTTP 200, mas `encontrouErro=true`). Verifique sempre `atualizouFuncionario=true` para confirmação real.

## 📌 Changelog

- **2026-09-03:** Corrigido problema de credenciais (CODIGO_RESPONSAVEL/Usuario diferentes do onboardingengemedical)
- **2026-09-03:** Template SOAP pronto com log estruturado para validação rápida