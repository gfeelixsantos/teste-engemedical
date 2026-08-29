"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FlaskConical, Plus, Pencil, Trash2, ChevronDown, ChevronRight, FolderPlus, FolderEdit, Search } from "lucide-react";
import {
  Button, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody,
  ModalFooter, Card, CardBody, Chip, Switch, Divider, Textarea,
} from "@heroui/react";
import CmsoCircularLoading from "@/components/shared/CmsoCircularLoading";
import { getCurrentUser } from "@/lib/utils";
import { fetchExames, createExame, updateExame, deleteExame, IExame, IExameFormData } from "@/lib/exames/services/exames.service";
import { invalidateExamsCatalog } from "@/lib/exames/utils/exames-catalog-cache";
import { fetchGruposFromAPI, createGrupo, updateGrupo, deleteGrupo, IGrupo } from "@/lib/grupos/services/grupos.service";

const TEMPLATE_OPTIONS = [
  { value: "", label: "Nenhum" },
  { value: "acuidade", label: "Acuidade Visual" },
  { value: "audiometria", label: "Audiometria" },
  { value: "dinamometria", label: "Dinamometria" },
  { value: "espirometria", label: "Espirometria" },
  { value: "exameClinico", label: "Exame Clínico" },
  { value: "fichaAssistencial", label: "Ficha Assistencial Especialista" },
  { value: "psicossocial", label: "Psicossocial" },
  { value: "ultrassom", label: "Ultrassom" },
];

const STATUS_OPTIONS = [
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "AGUARDANDO_RESULTADO", label: "Aguardando Resultado" },
];

function emptyForm(): IExameFormData {
  return {
    grupo: "", nome: "", codigos: [],
    status_finalizacao: "AGUARDANDO_RESULTADO",
    enviar_para_azure: false, requer_assinatura: false,
    template_key: null, estimativa_minutos: null, preparacao: null,
  };
}

export function ExamesSection() {
  const [exames, setExames] = useState<IExame[]>([]);
  const [grupos, setGrupos] = useState<IGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IExame | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IExameFormData>(emptyForm());
  const [newGrupoName, setNewGrupoName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [grupoModalOpen, setGrupoModalOpen] = useState(false);
  const [grupoModalMode, setGrupoModalMode] = useState<"create" | "rename">("create");
  const [editingGrupo, setEditingGrupo] = useState<IGrupo | null>(null);
  const [grupoFormNome, setGrupoFormNome] = useState("");

  const user = getCurrentUser();
  const isMaster = user?.perfil === "MASTER";

  const load = useCallback(async () => {
    try {
      const [data, grupoData] = await Promise.all([fetchExames(), fetchGruposFromAPI()]);
      setExames(data);
      setGrupos(grupoData);
      setExpandedGrupos(new Set(grupoData.filter((g) => g.ativo).map((g) => g.nome)));
    } catch (err) {
      console.error("Erro ao carregar exames:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const [searchQuery, setSearchQuery] = useState("");

  const gruposAtivos = grupos.filter((g) => g.ativo);
  const gruposInativos = grupos.filter((g) => !g.ativo);

  const filteredExames = useMemo(() => {
    if (!searchQuery.trim()) return exames;
    const q = searchQuery.toLowerCase().trim();
    return exames.filter((e) => e.nome.toLowerCase().includes(q));
  }, [exames, searchQuery]);

  const examesPorGrupo = useMemo(() => {
    return gruposAtivos
      .map((g) => ({
        grupo: g.nome,
        exames: filteredExames.filter((e) => e.grupo === g.nome),
      }))
      .filter((g) => g.exames.length > 0);
  }, [gruposAtivos, filteredExames]);

  // Auto-expand groups when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const matchingGroups = new Set(filteredExames.map((e) => e.grupo));
      setExpandedGrupos(matchingGroups as Set<string>);
    } else {
      setExpandedGrupos(new Set(gruposAtivos.map((g) => g.nome)));
    }
  }, [searchQuery, filteredExames, gruposAtivos]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setNewGrupoName("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(exame: IExame) {
    setEditing(exame);
    setForm({
      grupo: exame.grupo,
      nome: exame.nome,
      codigos: exame.codigos,
      status_finalizacao: exame.status_finalizacao,
      enviar_para_azure: exame.enviar_para_azure,
      requer_assinatura: exame.requer_assinatura,
      template_key: exame.template_key,
      estimativa_minutos: exame.estimativa_minutos,
      preparacao: exame.preparacao,
    });
    setNewGrupoName("");
    setError(null);
    setModalOpen(true);
  }

  function toggleGrupo(nome: string) {
    setExpandedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  }

  function getGrupoOptions() {
    return [
      ...gruposAtivos.map((g) => ({ value: g.nome, label: g.nome })),
      { value: "__new__", label: "+ Novo grupo..." },
    ];
  }

  function handleGrupoChange(value: string) {
    if (value === "__new__") {
      setForm((f) => ({ ...f, grupo: "" }));
    } else {
      setNewGrupoName("");
      setForm((f) => ({ ...f, grupo: value }));
    }
  }

  function toggleExpandedAll(expand: boolean) {
    if (expand) setExpandedGrupos(new Set(grupos.map((g) => g.nome)));
    else setExpandedGrupos(new Set());
  }

  async function handleSave() {
    const grupoFinal = form.grupo || newGrupoName.trim();
    if (!grupoFinal || !form.nome.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, grupo: grupoFinal };
      if (editing) {
        await updateExame(editing.id, payload);
      } else {
        await createExame(payload);
      }
      invalidateExamsCatalog();
      setModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar exame");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(exame: IExame) {
    try {
      await updateExame(exame.id, { ativo: !exame.ativo });
      invalidateExamsCatalog();
      load();
    } catch (err) {
      console.error("Erro ao alterar status do exame:", err);
    }
  }

  async function handleDelete(exame: IExame) {
    if (!confirm(`Desativar "${exame.nome}"?`)) return;
    try {
      await deleteExame(exame.id);
      invalidateExamsCatalog();
      load();
    } catch (err) {
      console.error("Erro ao desativar exame:", err);
    }
  }

  function openCreateGrupo() {
    setGrupoModalMode("create");
    setEditingGrupo(null);
    setGrupoFormNome("");
    setError(null);
    setGrupoModalOpen(true);
  }

  function openRenameGrupo(grupo: IGrupo) {
    setGrupoModalMode("rename");
    setEditingGrupo(grupo);
    setGrupoFormNome(grupo.nome);
    setError(null);
    setGrupoModalOpen(true);
  }

  async function handleGrupoSave() {
    if (!grupoFormNome.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (grupoModalMode === "create") {
        await createGrupo({ nome: grupoFormNome.trim() });
      } else if (editingGrupo) {
        await updateGrupo(editingGrupo.id, { nome: grupoFormNome.trim() });
      }
      setGrupoModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar grupo");
    } finally {
      setSaving(false);
    }
  }

  async function handleInactivateGrupo(grupo: IGrupo) {
    if (!confirm(`Inativar grupo "${grupo.nome}"?\n\nOs exames deste grupo NÃO serão afetados.\nApenas o grupo deixará de aparecer nas listas.`)) return;
    try {
      await deleteGrupo(grupo.id);
      load();
    } catch (err) {
      console.error("Erro ao inativar grupo:", err);
    }
  }

  if (loading) {
    return <CmsoCircularLoading fullHeight={false} />;
  }

  return (
    <>
      <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <FlaskConical size={28} aria-hidden="true" style={{ color: "#44735e" }} />
              <h2 className="text-xl font-semibold text-gray-800">Exames</h2>
              <Chip size="sm" variant="flat">{exames.length} exames</Chip>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                size="sm"
                placeholder="Buscar exame..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                startContent={<Search size={16} className="text-gray-400" />}
                isClearable
                onClear={() => setSearchQuery("")}
                className="w-full md:w-64"
              />
              <Button variant="flat" size="sm" onPress={() => toggleExpandedAll(true)}>
                Expandir Todos
              </Button>
              <Button variant="flat" size="sm" onPress={() => toggleExpandedAll(false)}>
                Recolher Todos
              </Button>
              {isMaster && (
                <>
                  <Button
                    variant="flat"
                    size="sm"
                    startContent={<FolderPlus size={16} />}
                    onPress={openCreateGrupo}
                  >
                    Novo Grupo
                  </Button>
                  <Button
                    color="primary"
                    startContent={<Plus size={18} />}
                    onPress={openCreate}
                    size="sm"
                    className="h-9 px-3"
                    style={{ backgroundColor: "#44735e" }}
                  >
                    Novo Exame
                  </Button>
                </>
              )}
            </div>
          </div>

          {!isMaster && (
            <p className="text-sm text-gray-400 mb-4">
              Visualização somente leitura. Apenas usuários MASTER podem gerenciar exames.
            </p>
          )}

          <Divider className="mb-4" />

          {examesPorGrupo.length === 0 && gruposInativos.length === 0 && (
            <div className="text-center py-8 text-gray-400">Nenhum exame cadastrado.</div>
          )}

          {examesPorGrupo.map(({ grupo, exames: examesDoGrupo }) => {
            const grupoObj = grupos.find((g) => g.nome === grupo);
            const isExpanded = expandedGrupos.has(grupo);
            return (
              <div key={grupo} className="mb-2">
                <div
                  className={[
                    "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors",
                    isExpanded
                      ? "border-emerald-200 bg-emerald-50/80"
                      : "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  <button
                    onClick={() => toggleGrupo(grupo)}
                    className="flex flex-1 items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-emerald-700" />
                    ) : (
                      <ChevronRight size={18} className="text-emerald-700" />
                    )}
                    <span className="font-medium text-emerald-900">{grupo}</span>
                    <Chip size="sm" variant="flat" className="bg-white/70 text-emerald-800">
                      {examesDoGrupo.length} exames
                    </Chip>
                  </button>
                  {isMaster && grupoObj && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        className="bg-white/70 text-emerald-700 hover:bg-white"
                        onPress={() => openRenameGrupo(grupoObj)}
                      >
                        <FolderEdit size={14} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        className="bg-white/70 text-emerald-700 hover:bg-white"
                        onPress={() => handleInactivateGrupo(grupoObj)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {examesDoGrupo.map((exame) => (
                      <div
                        key={exame.id}
                        className={`rounded-lg px-3 py-3 ${!exame.ativo ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-2">
                            <span className={`block text-sm font-medium ${!exame.ativo ? "line-through text-gray-400" : "text-gray-800"}`}>
                              {exame.nome}
                            </span>
                            <div className="space-y-1">
                              <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                Códigos SOC
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {exame.codigos.filter(Boolean).length > 0 ? (
                                  exame.codigos.filter(Boolean).map((cod) => (
                                    <Chip
                                      key={cod}
                                      size="sm"
                                      variant="flat"
                                      className="font-mono text-[11px]"
                                    >
                                      {cod}
                                    </Chip>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400 italic">
                                    Sem códigos cadastrados
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {exame.enviar_para_azure && (
                              <Chip size="sm" variant="flat" color="primary">
                                Integração SOC
                              </Chip>
                            )}
                            {exame.requer_assinatura && (
                              <Chip size="sm" variant="flat" color="warning">
                                Assinatura
                              </Chip>
                            )}
                            {exame.template_key && (
                              <Chip size="sm" variant="flat">PDF</Chip>
                            )}
                            {exame.estimativa_minutos && (
                              <span className="text-xs text-gray-400">{exame.estimativa_minutos}min</span>
                            )}
                            <Chip
                              size="sm"
                              variant="flat"
                              color={exame.ativo ? "success" : "danger"}
                            >
                              {exame.ativo ? "Ativo" : "Inativo"}
                            </Chip>
                            {isMaster && (
                              <div className="flex gap-1">
                                <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(exame)}>
                                  <Pencil size={14} />
                                </Button>
                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(exame)}>
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {gruposInativos.length > 0 && (
            <>
              <Divider className="my-4" />
              <div className="px-3 py-2">
                <span className="text-sm text-gray-400 font-medium">Grupos Inativos</span>
                <div className="flex gap-2 flex-wrap mt-2">
                  {gruposInativos.map((g) => (
                    <Chip key={g.id} size="sm" variant="flat" color="danger" className="text-xs">
                      {g.nome}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={grupoModalOpen} onOpenChange={setGrupoModalOpen} size="sm">
        <ModalContent>
          <ModalHeader>{grupoModalMode === "create" ? "Novo Grupo" : "Renomear Grupo"}</ModalHeader>
          <ModalBody>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
            )}
            <Input
              label="Nome do Grupo"
              placeholder="Digite o nome do grupo"
              value={grupoFormNome}
              onValueChange={setGrupoFormNome}
              isRequired
              autoFocus
            />
            {grupoModalMode === "rename" && editingGrupo && (
              <p className="text-xs text-gray-400 mt-2">
                Ao renomear, todos os exames com grupo "{editingGrupo.nome}" serão atualizados.
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setGrupoModalOpen(false)}>Cancelar</Button>
            <Button
              color="primary"
              onPress={handleGrupoSave}
              isLoading={saving}
              isDisabled={!grupoFormNome.trim()}
              style={{ backgroundColor: "#44735e" }}
            >
              {grupoModalMode === "create" ? "Criar" : "Renomear"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{editing ? "Editar Exame" : "Novo Exame"}</ModalHeader>
          <ModalBody>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Grupo</label>
                <Select
                  placeholder="Selecione o grupo"
                  selectedKeys={form.grupo ? [form.grupo] : []}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0] as string;
                    handleGrupoChange(val);
                  }}
                >
                  {getGrupoOptions().map((opt) => (
                    <SelectItem key={opt.value}>{opt.label}</SelectItem>
                  ))}
                </Select>
              </div>
              {form.grupo === "" && (
                <div className="col-span-2">
                  <Input
                    label="Novo grupo"
                    placeholder="Digite o nome do novo grupo"
                    value={newGrupoName}
                    onValueChange={setNewGrupoName}
                    isRequired
                  />
                </div>
              )}
              <div className="col-span-2">
                <Input
                  label="Nome do Exame"
                  value={form.nome}
                  onValueChange={(v) => setForm((f) => ({ ...f, nome: v }))}
                  isRequired
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Códigos SOC (separados por vírgula)"
                  placeholder="ex: 51.01.004-6, 50c, 10014"
                  value={form.codigos.join(", ")}
                  onValueChange={(v) => setForm((f) => ({
                    ...f,
                    codigos: v.split(",").map((s) => s.trim()).filter(Boolean),
                  }))}
                />
              </div>
              <Select
                label="Status de Finalização"
                selectedKeys={[form.status_finalizacao]}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0] as string;
                  setForm((f) => ({ ...f, status_finalizacao: val as any }));
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value}>{opt.label}</SelectItem>
                ))}
              </Select>
              <Select
                label="Template PDF"
                selectedKeys={form.template_key ? [form.template_key] : [""]}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0] as string;
                  setForm((f) => ({ ...f, template_key: val || null }));
                }}
              >
                {TEMPLATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value}>{opt.label}</SelectItem>
                ))}
              </Select>
              <Input
                label="Estimativa (minutos)"
                type="number"
                value={form.estimativa_minutos?.toString() ?? ""}
                onValueChange={(v) => setForm((f) => ({
                  ...f,
                  estimativa_minutos: v ? parseInt(v, 10) : null,
                }))}
              />
              <div className="col-span-2">
                <Textarea
                  label="Preparação (instruções para o paciente)"
                  placeholder="ex: Jejum de 8 horas, repouso auditivo de 14 horas..."
                  value={form.preparacao || ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, preparacao: v || null }))}
                />
              </div>
              <div className="flex items-center gap-6 pt-4">
                <Switch
                  isSelected={form.enviar_para_azure}
                  onValueChange={(v) => setForm((f) => ({ ...f, enviar_para_azure: v }))}
                  color="primary"
                >
                  <span className="text-sm">Gera PDF e Integra SOC</span>
                </Switch>
                <Switch
                  isSelected={form.requer_assinatura}
                  onValueChange={(v) => setForm((f) => ({ ...f, requer_assinatura: v }))}
                  color="warning"
                >
                  <span className="text-sm">Requer Assinatura</span>
                </Switch>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={saving}
              isDisabled={!form.nome.trim() || (!form.grupo && !newGrupoName.trim())}
              style={{ backgroundColor: "#44735e" }}
            >
              {editing ? "Atualizar" : "Criar"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
