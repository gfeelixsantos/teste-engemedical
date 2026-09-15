import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const frontendDirectory = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(frontendDirectory, relativePath), "utf8");
}

test("a página de funcionários expõe o workspace Premium Light read-only", () => {
  const page = read("app/cliente/funcionarios/page.tsx");
  const workspace = read("components/cliente/funcionarios/FuncionariosWorkspace.tsx");
  const filters = read("components/cliente/funcionarios/FuncionariosFilters.tsx");
  const table = read("components/cliente/funcionarios/FuncionariosTable.tsx");
  const badge = read("components/cliente/funcionarios/FuncionarioStatusBadge.tsx");

  assert.match(page, /FuncionariosWorkspace/);
  assert.match(workspace, /useEmpresas/);
  assert.match(workspace, /selectedEmpresa/);
  assert.match(workspace, /useClienteFuncionarios/);
  assert.match(workspace, /new URLSearchParams/);
  assert.match(workspace, /searchParams\.set\(["']empresa["']/);
  assert.match(workspace, /setPage\(1\)/);
  assert.match(workspace, /Building2/);
  assert.match(workspace, /Nenhuma empresa selecionada/);
  assert.match(workspace, /Funcionários/);
  assert.match(workspace, /funcionário/);
  assert.match(workspace, /LoadingState/);
  assert.match(workspace, /PremiumFeedbackModal/);
  assert.match(workspace, /refetch/);
  assert.match(workspace, /Anterior/);
  assert.match(workspace, /Próxima/);
  assert.match(workspace, /Página/);

  assert.match(filters, /Buscar por nome, código ou matrícula/);
  assert.match(filters, /Todos/);
  for (const status of [
    "ATENDIMENTO",
    "AGUARDANDO_RESULTADOS",
    "AVALIACAO_MEDICA",
    "AGENDADO",
    "PENDENTE",
    "EXPIRADO",
    "EXPIRANDO",
    "VALIDO",
  ]) {
    assert.match(filters, new RegExp(status));
  }
  assert.match(filters, /\[10, 25, 50, 100\]/);

  assert.match(table, /<table/);
  assert.match(table, /Nome|Funcionário/);
  assert.match(table, /Código/);
  assert.match(table, /Unidade/);
  assert.match(table, /Cargo/);
  assert.match(table, /Admissão/);
  assert.match(table, /Situação/);
  assert.match(table, /Status/);
  assert.match(badge, /statusLabel/);
  assert.doesNotMatch(`${page}\n${workspace}\n${filters}\n${table}\n${badge}`, /window\.(alert|confirm)/);
  assert.doesNotMatch(`${page}\n${workspace}\n${filters}\n${table}\n${badge}`, /item\.(cpf|endereco|endereço)\b/);
  assert.doesNotMatch(`${page}\n${workspace}\n${filters}\n${table}\n${badge}`, /on(?:Edit|Delete|Inactivate|Schedule|Download)/i);
});
