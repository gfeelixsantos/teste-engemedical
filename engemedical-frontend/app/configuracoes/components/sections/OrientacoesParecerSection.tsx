"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Stethoscope, Plus, Pencil, Trash2, Mail } from "lucide-react";
import {
  Button, Input, Textarea, Select, SelectItem,
  Card, CardBody, Chip, Switch, Divider,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import CmsoCircularLoading from "@/components/shared/CmsoCircularLoading";
import { getCurrentUser } from "@/lib/utils";
import {
   fetchOrientacoesConfig, createOrientacaoConfig, updateOrientacaoConfig,
   deleteOrientacaoConfig,
   IOrientacaoConfig, IOrientacaoConfigFormData,
} from "@/lib/orientacoes-config/services/orientacoes-config.service";
import DeleteConfirmationModal from "@/app/relatorio/components/DeleteConfirmationModal";

const INITIAL_FORM: IOrientacaoConfigFormData = {
  categoria: "Geral",
  texto_tela: "",
  texto_email: "",
  libera_cliente: true,
  ordem: 0,
};

const CATEGORIAS = [
  "Geral",
  "Cardiologia",
  "Visão / Oftalmologia",
  "Trabalho em Altura",
  "Restrições Físicas",
  "Acompanhamento / Retorno",
  "PCD / Deficiência",
];

export function OrientacoesParecerSection() {
  const [orientacoes, setOrientacoes] = useState<IOrientacaoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IOrientacaoConfigFormData>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingOrientacao, setDeletingOrientacao] =
    useState<IOrientacaoConfig | null>(null);

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>(CATEGORIAS);
    orientacoes.forEach((o) => {
      if (o.categoria) set.add(o.categoria);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [orientacoes]);

  const filtered = useMemo(() => {
    return orientacoes.filter((o) => {
      const matchesSearch =
        !searchTerm ||
        o.texto_tela.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.categoria || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.texto_email || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategoria =
        selectedCategoria === "ALL" || o.categoria === selectedCategoria;

      return matchesSearch && matchesCategoria;
    });
  }, [orientacoes, searchTerm, selectedCategoria]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const user = getCurrentUser();
  const isMaster = user?.perfil === "MASTER";

  const load = useCallback(async () => {
    try {
      const data = await fetchOrientacoesConfig();
      const sorted = [...data].sort((a, b) => {
        const cat = (a.categoria || "").localeCompare(b.categoria || "", "pt-BR");
        if (cat !== 0) return cat;
        return (a.ordem ?? 0) - (b.ordem ?? 0);
      });
      setOrientacoes(sorted);
    } catch (err) {
      console.error("Erro ao carregar orientações de parecer:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleOpenCreate() {
    setCreatingNew(true);
    setEditingId(null);
    setForm(INITIAL_FORM);
    setError(null);
  }

  function handleOpenEdit(orientacao: IOrientacaoConfig) {
    setCreatingNew(false);
    setEditingId(orientacao.id);
    setForm({
      categoria: orientacao.categoria || "Geral",
      texto_tela: orientacao.texto_tela || "",
      texto_email: orientacao.texto_email || "",
      libera_cliente: orientacao.libera_cliente ?? true,
      ordem: orientacao.ordem ?? 0,
    });
    setError(null);
  }

  function handleClose() {
    setEditingId(null);
    setCreatingNew(false);
    setError(null);
  }

  async function handleSave() {
    if (!form.texto_tela.trim() || !form.texto_email.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (creatingNew) {
        await createOrientacaoConfig(form);
      } else if (editingId) {
        await updateOrientacaoConfig(editingId, form);
      }
      handleClose();
      load();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(orientacao: IOrientacaoConfig) {
    try {
      await updateOrientacaoConfig(orientacao.id, { ativo: !orientacao.ativo });
      load();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  }

  function openDelete(orientacao: IOrientacaoConfig) {
    setDeletingOrientacao(orientacao);
    setDeleteModalOpen(true);
  }

  async function handleDelete({
    password,
    motivo,
  }: {
    password: string;
    motivo: string;
  }) {
    if (!deletingOrientacao) throw new Error("Nenhuma orientação selecionada");
    await deleteOrientacaoConfig(deletingOrientacao.id, { password, motivo });
  }

  async function handleDeleteSuccess() {
    setDeleteModalOpen(false);
    setDeletingOrientacao(null);
    load();
  }

  function renderForm() {
    const isOpen = creatingNew || editingId !== null;
    const editing = editingId
      ? orientacoes.find((o) => o.id === editingId)
      : null;

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="2xl"
        backdrop="blur"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {creatingNew
              ? "Nova Orientação de Parecer"
              : `Editando: ${editing?.texto_tela}`}
          </ModalHeader>
          <ModalBody>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              <Select
                label="Categoria"
                placeholder="Selecione a categoria"
                selectedKeys={form.categoria ? [form.categoria] : []}
                onSelectionChange={(keys) =>
                  updateField("categoria", Array.from(keys)[0] as string || "Geral")
                }
              >
                {categoriasDisponiveis.map((c) => (
                  <SelectItem key={c}>{c}</SelectItem>
                ))}
              </Select>
              <Input
                label="Ordem"
                type="number"
                placeholder="0"
                value={String(form.ordem ?? 0)}
                onValueChange={(v) =>
                  updateField("ordem", Number(v.replace(/\D/g, "")) || 0)
                }
              />
              <div className="col-span-2">
                <Textarea
                  label="Texto de Tela"
                  placeholder="ex: Orientar acompanhamento com cardiologista"
                  value={form.texto_tela}
                  onValueChange={(v) => updateField("texto_tela", v)}
                  description="Exibido no prontuário e no ASO (PDF)."
                  isRequired
                />
              </div>
              <div className="col-span-2">
                <Textarea
                  label="Texto de E-mail"
                  placeholder="Texto profissional e completo enviado no e-mail..."
                  value={form.texto_email}
                  onValueChange={(v) => updateField("texto_email", v)}
                  description="Versão profissional usada no e-mail do parecer."
                  isRequired
                  minRows={4}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <Switch
                  isSelected={form.libera_cliente ?? true}
                  onValueChange={(v) => updateField("libera_cliente", v)}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium">Liberar para o cliente</p>
                  <p className="text-xs text-gray-400">
                    Quando ativo, o e-mail é roteado para o cliente (ASO_RELEASE).
                    Inativo envia à equipe (PARECER_MEDICO).
                  </p>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={handleClose} size="sm">
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={saving}
              isDisabled={!form.texto_tela.trim() || !form.texto_email.trim()}
              size="sm"
              style={{ backgroundColor: "#44735e" }}
            >
              {creatingNew ? "Criar" : "Atualizar"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  function updateField<K extends keyof IOrientacaoConfigFormData>(
    key: K,
    value: IOrientacaoConfigFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <CmsoCircularLoading fullHeight={false} />;
  }

  return (
    <>
      <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Stethoscope size={28} aria-hidden="true" style={{ color: "#44735e" }} />
            <h2 className="text-xl font-semibold text-gray-800">
              Orientações de Parecer
            </h2>
            <Chip size="sm" variant="flat">
              {orientacoes.length} orientações
            </Chip>
          </div>
          {isMaster && !creatingNew && editingId === null && (
            <Button
              color="primary"
              startContent={<Plus size={16} />}
              onPress={handleOpenCreate}
              size="sm"
              className="h-9 px-4 whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: "#44735e" }}
            >
              Nova Orientação
            </Button>
          )}
        </div>

        {!isMaster && (
          <p className="text-sm text-gray-400 mb-4">
            Visualização somente leitura. Apenas usuários MASTER podem gerenciar.
          </p>
        )}

        <Divider className="mb-4" />

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="md:col-span-2">
            <Input
              isClearable
              size="sm"
              placeholder="Buscar por texto de tela, categoria ou e-mail..."
              value={searchTerm}
              onValueChange={(val) => {
                setSearchTerm(val || "");
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <Select
              size="sm"
              placeholder="Todas as categorias"
              selectedKeys={[selectedCategoria]}
              onSelectionChange={(keys) => {
                const cat = Array.from(keys)[0] as string || "ALL";
                setSelectedCategoria(cat);
                setCurrentPage(1);
              }}
            >
              {[
                { value: "ALL", label: "Todas as categorias" },
                ...categoriasDisponiveis.map((c) => ({
                  value: c,
                  label: c,
                })),
              ].map((c) => (
                <SelectItem key={c.value}>{c.label}</SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {renderForm()}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            Nenhuma orientação encontrada.
          </div>
        )}

        <div className="space-y-3">
          {paginated.map((orientacao) => {
            const isEditing = editingId === orientacao.id && !creatingNew;

            return (
              <div
                key={orientacao.id}
                className={`rounded-lg border transition-colors ${
                  isEditing ? "border-primary-300 bg-primary-50/40" : "border-gray-200"
                } ${!orientacao.ativo ? "bg-gray-50" : "bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-semibold ${
                          !orientacao.ativo
                            ? "text-gray-400 line-through"
                            : "text-gray-800"
                        }`}
                      >
                        {orientacao.texto_tela}
                      </span>
                      {orientacao.categoria && (
                        <Chip size="sm" variant="flat" className="text-[11px]">
                          {orientacao.categoria}
                        </Chip>
                      )}
                      <Chip
                        size="sm"
                        variant="flat"
                        color={orientacao.libera_cliente ? "success" : "warning"}
                        className="text-[11px]"
                      >
                        {orientacao.libera_cliente ? "Cliente" : "Equipe"}
                      </Chip>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Mail size={12} className="mt-1 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {orientacao.texto_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium ${
                        orientacao.ativo ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {orientacao.ativo ? "Ativo" : "Inativo"}
                    </span>
                    {isMaster && (
                      <div className="flex gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleOpenEdit(orientacao)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => openDelete(orientacao)}
                        >
                          <Trash2 size={14} />
                        </Button>
                        <Switch
                          isSelected={orientacao.ativo}
                          onValueChange={() => handleToggleAtivo(orientacao)}
                          size="sm"
                          color="primary"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 mt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de{" "}
              {filtered.length} orientações
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                isDisabled={currentPage === 1}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="flex items-center px-3 text-xs font-medium text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="flat"
                isDisabled={currentPage === totalPages}
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>

      <DeleteConfirmationModal
        isOpenModalDelete={deleteModalOpen}
        onCloseModalDelete={() => {
          setDeleteModalOpen(false);
          setDeletingOrientacao(null);
        }}
        onConfirm={handleDelete}
        onDeleteSuccess={handleDeleteSuccess}
        confirmTitle="Excluir Orientação de Parecer"
        confirmDescription={
          <span>
            Esta ação irá excluir <strong>definitivamente</strong> a orientação{" "}
            <strong>{deletingOrientacao?.texto_tela}</strong>. Itens já
            usados em pareceres anteriores não serão afetados (o texto já
            foi congelado no momento da finalização).
          </span>
        }
        successMessage="Orientação excluída com sucesso."
        loadingTitle="Excluindo orientação"
        loadingMessage="Validando sua senha e registrando a exclusão..."
        confirmButtonText="Confirmar exclusão"
      />
    </>
  );
}
