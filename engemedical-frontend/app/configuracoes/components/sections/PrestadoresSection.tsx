"use client";

import { useState, useEffect, useCallback } from "react";
import { Handshake, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Button, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody,
  ModalFooter, Card, CardBody, Chip, Switch, Divider, Textarea,
} from "@heroui/react";
import CmsoCircularLoading from "@/components/shared/CmsoCircularLoading";
import { getCurrentUser } from "@/lib/utils";
import { fetchPrestadores, createPrestador, updatePrestador, deletePrestador, IPrestador, IPrestadorFormData } from "@/lib/prestadores/services/prestadores.service";
import { fetchGruposFromAPI, IGrupo } from "@/lib/grupos/services/grupos.service";
import { useUnits } from "@/lib/config/useUnits";

function emptyForm(): IPrestadorFormData {
  return { nome: "", unidade: "", endereco: null, horario: null, referencia: null, grupos: [] };
}

export function PrestadoresSection() {
  const [prestadores, setPrestadores] = useState<IPrestador[]>([]);
  const [grupos, setGrupos] = useState<IGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IPrestador | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IPrestadorFormData>(emptyForm());
  const [error, setError] = useState<string | null>(null);

  const user = getCurrentUser();
  const isMaster = user?.perfil === "MASTER";
  const { units } = useUnits(true);
  const unidadesAtivas = units.filter((unit) => unit.ativo);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [prestadoresResult, gruposResult] = await Promise.allSettled([
        fetchPrestadores(),
        fetchGruposFromAPI(),
      ]);

      if (prestadoresResult.status === "fulfilled") {
        setPrestadores(prestadoresResult.value);
      } else {
        console.error("Erro ao carregar prestadores:", prestadoresResult.reason);
      }

      if (gruposResult.status === "fulfilled") {
        setGrupos(gruposResult.value.filter((g) => g.ativo));
      } else {
        console.error("Erro ao carregar grupos:", gruposResult.reason);
      }

      if (
        prestadoresResult.status === "rejected" ||
        gruposResult.status === "rejected"
      ) {
        setError("Não foi possível carregar todos os dados. Tente atualizar a página.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  }

  function openEdit(prestador: IPrestador) {
    setEditing(prestador);
    setForm({
      nome: prestador.nome,
      unidade: prestador.unidade || "",
      endereco: prestador.endereco,
      horario: prestador.horario,
      referencia: prestador.referencia,
      grupos: prestador.grupos,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) return;
    if (!form.unidade?.trim()) {
      setError("Selecione a unidade do prestador");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updatePrestador(editing.id, form);
      } else {
        await createPrestador(form);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar prestador");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(prestador: IPrestador) {
    try {
      await updatePrestador(prestador.id, { ativo: !prestador.ativo });
      load();
    } catch (err) {
      console.error("Erro ao alterar status do prestador:", err);
    }
  }

  async function handleDelete(prestador: IPrestador) {
    if (!confirm(`Desativar "${prestador.nome}"?`)) return;
    try {
      await deletePrestador(prestador.id);
      load();
    } catch (err) {
      console.error("Erro ao desativar prestador:", err);
    }
  }

  if (loading) {
    return <CmsoCircularLoading />;
  }

  return (
    <>
      <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Handshake size={28} aria-hidden="true" style={{ color: "#44735e" }} />
              <h2 className="text-xl font-semibold text-gray-800">Prestadores</h2>
              <Chip size="sm" variant="flat">{prestadores.length} prestadores</Chip>
            </div>
            {isMaster && (
              <Button
                color="primary"
                startContent={<Plus size={18} />}
                onPress={openCreate}
                style={{ backgroundColor: "#44735e" }}
              >
                Novo Prestador
              </Button>
            )}
          </div>

          {!isMaster && (
            <p className="text-sm text-gray-400 mb-4">
              Visualização somente leitura. Apenas usuários MASTER podem gerenciar prestadores.
            </p>
          )}

          <Divider className="mb-4" />

          {prestadores.length === 0 && (
            <div className="text-center py-8 text-gray-400">Nenhum prestador cadastrado.</div>
          )}

          <div className="space-y-2">
            {prestadores.map((prestador) => (
              <div
                key={prestador.id}
                className={`flex items-center justify-between px-3 py-3 rounded-lg ${!prestador.ativo ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div>
                    <span className={`text-sm font-medium ${!prestador.ativo ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {prestador.nome}
                    </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {prestador.unidade && (
                        <Chip size="sm" variant="flat" color="success" className="text-xs">
                          {prestador.unidade}
                        </Chip>
                      )}
                      {prestador.grupos.filter(Boolean).map((g) => (
                        <Chip key={g} size="sm" variant="flat" className="text-xs">{g}</Chip>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {prestador.endereco && (
                    <span className="text-xs text-gray-400 hidden md:block max-w-[200px] truncate">{prestador.endereco}</span>
                  )}
                  <Chip size="sm" variant="flat" color={prestador.ativo ? "success" : "danger"}>
                    {prestador.ativo ? "Ativo" : "Inativo"}
                  </Chip>
                  {isMaster && (
                    <div className="flex gap-1">
                      <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(prestador)}>
                        <Pencil size={14} />
                      </Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(prestador)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{editing ? "Editar Prestador" : "Novo Prestador"}</ModalHeader>
          <ModalBody>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Nome"
                  value={form.nome}
                  onValueChange={(v) => setForm((f) => ({ ...f, nome: v }))}
                  isRequired
                />
              </div>
              <div className="col-span-2">
                <Select
                  label="Unidade de atendimento"
                  placeholder="Selecione a unidade"
                  selectedKeys={form.unidade ? new Set([form.unidade]) : new Set<string>()}
                  onSelectionChange={(keys) => {
                    const unidade = Array.from(keys)[0] as string | undefined;
                    setForm((f) => ({ ...f, unidade: unidade || "" }));
                  }}
                  isRequired
                >
                  {unidadesAtivas.map((unit) => (
                    <SelectItem key={unit.nome}>
                      {unit.nome_exibicao || unit.nome}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="col-span-2">
                <Input
                  label="Endereço"
                  value={form.endereco || ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, endereco: v || null }))}
                />
              </div>
              <Input
                label="Horário"
                value={form.horario || ""}
                onValueChange={(v) => setForm((f) => ({ ...f, horario: v || null }))}
              />
              <div className="col-span-2">
                <Textarea
                  label="Referência"
                  value={form.referencia || ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, referencia: v || null }))}
                />
              </div>
              <div className="col-span-2">
                <Select
                  label="Grupos de Exames"
                  placeholder="Selecione os grupos"
                  selectionMode="multiple"
                  selectedKeys={new Set(form.grupos)}
                  onSelectionChange={(keys) => {
                    setForm((f) => ({ ...f, grupos: Array.from(keys) as string[] }));
                  }}
                >
                  {grupos.map((g) => (
                    <SelectItem key={g.nome}>{g.nome}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={saving}
              isDisabled={!form.nome.trim() || !form.unidade?.trim()}
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
