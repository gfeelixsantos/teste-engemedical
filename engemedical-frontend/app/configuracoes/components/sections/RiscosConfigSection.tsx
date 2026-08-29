"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Radiation, Plus, Pencil, Trash2, X } from "lucide-react";
import {
  Button, Input, Textarea, Select, SelectItem,
  Card, CardBody, Chip, Switch, Divider, Tabs, Tab,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import CmsoCircularLoading from "@/components/shared/CmsoCircularLoading";
import { getCurrentUser } from "@/lib/utils";
import {
  fetchRiscosConfig, createRiscoConfig, updateRiscoConfig, deleteRiscoConfig,
  IRiscoConfig, IRiscoConfigFormData, GRUPOS_RISCOS,
} from "@/lib/riscos-config/services/riscos-config.service";
import {
  normalizeRiskCode,
  normalizeRiskType,
} from "@/lib/riscos-config/utils";

const INITIAL_FORM: IRiscoConfigFormData = {
  tipo: "",
  descricao: "",
  codigos: [],
  grupo: "",
  parecer_opcoes: [],
  observacao: "",
  perigo_nome: "",
  perigo_tipo_exposicao: "",
  perigo_fonte_geradora: "",
  perigo_trajetoria_acao: "",
  perigo_tecnica_utilizada: "",
  perigo_possiveis_danos: "",
  perigo_medidas_administrativas: "",
  perigo_epc_eficaz: false,
  perigo_epc_descricao: "",
  perigo_epi_eficaz: false,
  perigo_epi_descricao: "",
  perigo_acoes_necessarias: "",
  perigo_criterio_monitoracao: "",
  perigo_observacao: "",
};

function getGrupoColor(grupo: string) {
  const cores: Record<string, string> = {
    FISICOS: "#22c55e",
    QUIMICOS: "#ef4444",
    BIOLOGICOS: "#d97706",
    ERGONOMICOS: "#f59e0b",
    ACIDENTES: "#3b82f6",
    INESPECIFICOS: "#8b5cf6",
  };
  return cores[grupo] || "#6b7280";
}

export function RiscosConfigSection() {
  const [configs, setConfigs] = useState<IRiscoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IRiscoConfigFormData>(INITIAL_FORM);
  const [formCodigosStr, setFormCodigosStr] = useState("");
  const [formParecerStr, setFormParecerStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredConfigs = useMemo(() => {
    return configs.filter((config) => {
      const matchesSearch =
        !searchTerm ||
        config.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (config.tipo && config.tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (config.codigos && config.codigos.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesGroup =
        selectedGroup === "ALL" ||
        config.grupo === selectedGroup;

      return matchesSearch && matchesGroup;
    });
  }, [configs, searchTerm, selectedGroup]);

  const totalPages = Math.ceil(filteredConfigs.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedConfigs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredConfigs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredConfigs, currentPage]);

  const user = getCurrentUser();
  const isMaster = user?.perfil === "MASTER";

  const load = useCallback(async () => {
    try {
      const data = await fetchRiscosConfig();
      const sorted = [...data].sort((a, b) =>
        a.descricao.localeCompare(b.descricao, "pt-BR"),
      );
      setConfigs(sorted);
    } catch (err) {
      console.error("Erro ao carregar configurações de risco:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleOpenCreate() {
    setCreatingNew(true);
    setExpandedId(null);
    setForm(INITIAL_FORM);
    setFormCodigosStr("");
    setFormParecerStr("");
    setError(null);
  }

  function handleOpenEdit(config: IRiscoConfig) {
    setCreatingNew(false);
    setExpandedId(config.id);
    setForm({
      tipo: config.tipo || "",
      descricao: config.descricao || "",
      codigos: config.codigos,
      grupo: config.grupo || "",
      parecer_opcoes: config.parecer_opcoes ?? [],
      observacao: config.observacao || "",
      perigo_nome: config.perigo_nome || "",
      perigo_tipo_exposicao: config.perigo_tipo_exposicao || "",
      perigo_fonte_geradora: config.perigo_fonte_geradora || "",
      perigo_trajetoria_acao: config.perigo_trajetoria_acao || "",
      perigo_tecnica_utilizada: config.perigo_tecnica_utilizada || "",
      perigo_possiveis_danos: config.perigo_possiveis_danos || "",
      perigo_medidas_administrativas: config.perigo_medidas_administrativas || "",
      perigo_epc_eficaz: config.perigo_epc_eficaz || false,
      perigo_epc_descricao: config.perigo_epc_descricao || "",
      perigo_epi_eficaz: config.perigo_epi_eficaz || false,
      perigo_epi_descricao: config.perigo_epi_descricao || "",
      perigo_acoes_necessarias: config.perigo_acoes_necessarias || "",
      perigo_criterio_monitoracao: config.perigo_criterio_monitoracao || "",
      perigo_observacao: config.perigo_observacao || "",
    });
    setFormCodigosStr(config.codigos.join(", "));
    setFormParecerStr((config.parecer_opcoes ?? []).join(", "));
    setError(null);
  }

  function handleClose() {
    setExpandedId(null);
    setCreatingNew(false);
    setError(null);
  }

  function updateField<K extends keyof IRiscoConfigFormData>(key: K, value: IRiscoConfigFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const codigosArray = Array.from(
      new Set(
        formCodigosStr
          .split(",")
          .map(normalizeRiskCode)
          .filter(Boolean),
      ),
    );
    const parecerOpcoes = Array.from(
      new Set(
        formParecerStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
    if (!form.descricao.trim() || codigosArray.length === 0 || !form.grupo) return;

    setSaving(true);
    setError(null);
    try {
      const payload: IRiscoConfigFormData = {
        ...form,
        tipo: normalizeRiskType(form.tipo),
        codigos: codigosArray,
        parecer_opcoes: parecerOpcoes.length > 0 ? parecerOpcoes : undefined,
      };

      if (creatingNew) {
        await createRiscoConfig(payload);
      } else if (expandedId) {
        await updateRiscoConfig(expandedId, payload);
      }
      handleClose();
      load();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(config: IRiscoConfig) {
    try {
      await updateRiscoConfig(config.id, { ativo: !config.ativo });
      load();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  }

  async function handleDelete(config: IRiscoConfig) {
    if (!confirm(`Inativar "${config.descricao}"?`)) return;
    try {
      await deleteRiscoConfig(config.id);
      load();
    } catch (err) {
      console.error("Erro ao inativar:", err);
    }
  }

  function renderForm() {
    const isOpen = creatingNew || expandedId !== null;
    const isEdit = expandedId !== null;
    const editingConfig = isEdit ? configs.find(c => c.id === expandedId) : null;

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
            {creatingNew ? "Nova Configuração de Risco" : `Editando Risco: ${editingConfig?.descricao}`}
          </ModalHeader>
          <ModalBody>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-2">
                {error}
              </div>
            )}

            <Tabs aria-label="Configuração do risco" className="w-full">
              <Tab key="config" title="Configuração">
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Input
                    label="Tipo"
                    placeholder="ex: ALTURA"
                    value={form.tipo}
                    onValueChange={(v) => updateField("tipo", v)}
                    description="Identificador único em maiúsculas. Opcional — usado apenas para pareceres especiais (ALTURA, CONFINADO)."
                  />
                  <Select
                    label="Grupo"
                    placeholder="Selecione o grupo"
                    selectedKeys={form.grupo ? [form.grupo] : []}
                    onSelectionChange={(keys) => updateField("grupo", Array.from(keys)[0] as string || "")}
                    isRequired
                  >
                    {GRUPOS_RISCOS.map((g) => (
                      <SelectItem key={g.value}>{g.label}</SelectItem>
                    ))}
                  </Select>
                  <div className="col-span-2">
                    <Input
                      label="Descrição"
                      placeholder="ex: Trabalho em Altura"
                      value={form.descricao}
                      onValueChange={(v) => updateField("descricao", v)}
                      isRequired
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Códigos SOC (separados por vírgula)"
                      placeholder="ex: 179, 213, 252"
                      value={formCodigosStr}
                      onValueChange={setFormCodigosStr}
                      isRequired
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Opções de Parecer (separadas por vírgula)"
                      placeholder="ex: APTO PARA TRABALHO EM ALTURA, INAPTO"
                      value={formParecerStr}
                      onValueChange={setFormParecerStr}
                      description="Cada opção vira um item no select do prontuário."
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Observação"
                      placeholder="Observações internas sobre este risco..."
                      value={form.observacao || ""}
                      onValueChange={(v) => updateField("observacao", v)}
                    />
                  </div>
                </div>
              </Tab>
              <Tab key="perigo" title="Perigo">
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="col-span-2">
                    <Input
                      label="Nome do Perigo"
                      placeholder="ex: Queda de Altura"
                      value={form.perigo_nome || ""}
                      onValueChange={(v) => updateField("perigo_nome", v)}
                    />
                  </div>
                  <Input
                    label="Tipo de Exposição"
                    placeholder="ex: Intermitente"
                    value={form.perigo_tipo_exposicao || ""}
                    onValueChange={(v) => updateField("perigo_tipo_exposicao", v)}
                  />
                  <Input
                    label="Fonte Geradora"
                    placeholder="ex: Processo Produtivo"
                    value={form.perigo_fonte_geradora || ""}
                    onValueChange={(v) => updateField("perigo_fonte_geradora", v)}
                  />
                  <Input
                    label="Trajetória / Meio de Propagação"
                    placeholder="ex: Ar"
                    value={form.perigo_trajetoria_acao || ""}
                    onValueChange={(v) => updateField("perigo_trajetoria_acao", v)}
                  />
                  <Select
                    label="Técnica Utilizada"
                    placeholder="Selecione a técnica"
                    selectedKeys={form.perigo_tecnica_utilizada ? [form.perigo_tecnica_utilizada] : []}
                    onSelectionChange={(keys) => updateField("perigo_tecnica_utilizada", Array.from(keys)[0] as string || "")}
                  >
                    <SelectItem key="QUALITATIVA">Qualitativa</SelectItem>
                    <SelectItem key="QUANTITATIVA">Quantitativa</SelectItem>
                  </Select>
                  <div className="col-span-2">
                    <Textarea
                      label="Possíveis Danos à Saúde"
                      placeholder="ex: Contusões, luxações, fraturas"
                      value={form.perigo_possiveis_danos || ""}
                      onValueChange={(v) => updateField("perigo_possiveis_danos", v)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Medidas Administrativas"
                      placeholder="ex: Treinamento, Ordem de Serviço"
                      value={form.perigo_medidas_administrativas || ""}
                      onValueChange={(v) => updateField("perigo_medidas_administrativas", v)}
                    />
                  </div>
                  <div className="col-span-2 flex gap-4 items-end">
                    <div className="flex items-center gap-2">
                      <Switch
                        isSelected={form.perigo_epc_eficaz || false}
                        onValueChange={(v) => updateField("perigo_epc_eficaz", v)}
                        size="sm"
                      />
                      <span className="text-xs font-medium">EPC Eficaz?</span>
                    </div>
                    <Input
                      label="Descrição EPC"
                      placeholder="ex: N/A"
                      className="flex-1"
                      value={form.perigo_epc_descricao || ""}
                      onValueChange={(v) => updateField("perigo_epc_descricao", v)}
                    />
                  </div>
                  <div className="col-span-2 flex gap-4 items-end">
                    <div className="flex items-center gap-2">
                      <Switch
                        isSelected={form.perigo_epi_eficaz || false}
                        onValueChange={(v) => updateField("perigo_epi_eficaz", v)}
                        size="sm"
                      />
                      <span className="text-xs font-medium">EPI Eficaz?</span>
                    </div>
                    <Input
                      label="Descrição EPI + CA"
                      placeholder="ex: Calçado de segurança CA: 36.1982"
                      className="flex-1"
                      value={form.perigo_epi_descricao || ""}
                      onValueChange={(v) => updateField("perigo_epi_descricao", v)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Ações Necessárias e Prioridades"
                      placeholder="ex: Manter o controle existente (P1)"
                      value={form.perigo_acoes_necessarias || ""}
                      onValueChange={(v) => updateField("perigo_acoes_necessarias", v)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Critério para Monitoração da Exposição"
                      placeholder="ex: Monitoramento periódico não necessário"
                      value={form.perigo_criterio_monitoracao || ""}
                      onValueChange={(v) => updateField("perigo_criterio_monitoracao", v)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Observação do Perigo"
                      placeholder="Notas normativas"
                      value={form.perigo_observacao || ""}
                      onValueChange={(v) => updateField("perigo_observacao", v)}
                    />
                  </div>
                </div>
              </Tab>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={handleClose} size="sm">
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={saving}
              isDisabled={!form.descricao.trim() || !formCodigosStr.trim() || !form.grupo}
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

  if (loading) {
    return <CmsoCircularLoading fullHeight={false} />;
  }

  return (
    <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Radiation size={28} aria-hidden="true" style={{ color: "#44735e" }} />
            <h2 className="text-xl font-semibold text-gray-800">Riscos</h2>
            <Chip size="sm" variant="flat">{configs.length} configurações</Chip>
          </div>
          {isMaster && !creatingNew && expandedId === null && (
            <Button
              color="primary"
              startContent={<Plus size={16} />}
              onPress={handleOpenCreate}
              size="sm"
              className="h-9 px-4 whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: "#44735e" }}
            >
              Novo Risco
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
              placeholder="Buscar por descrição, tipo ou código..."
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
              placeholder="Todos os grupos"
              selectedKeys={[selectedGroup]}
              onSelectionChange={(keys) => {
                const group = Array.from(keys)[0] as string || "ALL";
                setSelectedGroup(group);
                setCurrentPage(1);
              }}
            >
              {[{ value: "ALL", label: "Todos os grupos" }, ...GRUPOS_RISCOS].map((g) => (
                <SelectItem key={g.value}>{g.label}</SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {renderForm()}

        {filteredConfigs.length === 0 && (
          <div className="text-center py-8 text-gray-400">Nenhuma configuração encontrada.</div>
        )}

        <div className="space-y-3">
          {paginatedConfigs.map((config) => {
            const isEditing = expandedId === config.id && !creatingNew;

            return (
              <div
                key={config.id}
                className="rounded-lg border transition-colors"
                style={{
                  borderColor: isEditing ? (config.grupo ? `${getGrupoColor(config.grupo)}80` : "#93c5fd") : config.grupo ? `${getGrupoColor(config.grupo)}40` : undefined,
                  backgroundColor: isEditing ? `${getGrupoColor(config.grupo || "")}10` : !config.ativo ? "#f9fafb" : "white",
                }}
              >
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: !config.ativo ? "#9ca3af" : config.grupo ? getGrupoColor(config.grupo) : "#111827",
                          textDecoration: !config.ativo ? "line-through" : undefined,
                        }}
                      >
                        {config.descricao}
                      </span>
                      {config.tipo && (
                        <Chip size="sm" variant="flat" className="font-mono text-[11px]">
                          {config.tipo}
                        </Chip>
                      )}
                      {config.grupo && (
                        <Chip
                          size="sm"
                          variant="flat"
                          style={{ backgroundColor: `${getGrupoColor(config.grupo)}20`, color: getGrupoColor(config.grupo) }}
                          className="text-[11px] font-medium"
                        >
                          {config.grupo}
                        </Chip>
                      )}
                      {config.perigo_nome && (
                        <Chip size="sm" variant="flat" color="warning" className="text-[11px]">
                          Perigo
                        </Chip>
                      )}
                    </div>
                    {config.parecer_opcoes && config.parecer_opcoes.length > 0 && (
                      <div>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Pareceres</span>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {config.parecer_opcoes.map((op, i) => (
                            <Chip key={i} size="sm" variant="flat" className="text-[11px]">
                              {op}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}
                    {config.perigo_nome && (
                      <div>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Perigo</span>
                        <p className="text-[11px] text-gray-500">
                          {config.perigo_nome}
                          {config.perigo_possiveis_danos && (
                            <span className="text-gray-400"> — {config.perigo_possiveis_danos}</span>
                          )}
                        </p>
                      </div>
                    )}
                    {config.observacao && (
                      <div>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Observação</span>
                        <p className="text-[11px] text-gray-500 italic">{config.observacao}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium ${config.ativo ? "text-green-600" : "text-red-500"}`}>
                      {config.ativo ? "Ativo" : "Inativo"}
                    </span>
                    {isMaster && (
                      <div className="flex gap-1">
                        <Button isIconOnly size="sm" variant="light" onPress={() => handleOpenEdit(config)}>
                          <Pencil size={14} />
                        </Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(config)}>
                          <Trash2 size={14} />
                        </Button>
                        <Switch
                          isSelected={config.ativo}
                          onValueChange={() => handleToggleAtivo(config)}
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
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredConfigs.length)} de {filteredConfigs.length} riscos
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
  );
}
