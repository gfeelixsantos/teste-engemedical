"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  DoorOpen,
  Stethoscope,
} from "lucide-react";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Tabs,
  Tab,
  Switch,
} from "@heroui/react";
import CmsoCircularLoading from "@/components/shared/CmsoCircularLoading";

import { useUnits, Unit } from "@/lib/config/useUnits";
import { NEST_URL } from "@/config/constants";
import DeleteConfirmationModal from "@/app/relatorio/components/DeleteConfirmationModal";

export function UnidadesSection() {
  const { units, loading, refetch } = useUnits(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);

  const [form, setForm] = useState({
    nome: "",
    nome_exibicao: "",
    endereco: "",
    cidade: "",
    uf: "",
    cep: "",
    whatsapp: "",
    email: "",
    horario_funcionamento: "",
    ativo: true,
  });

  const [salasRecepcao, setSalasRecepcao] = useState<string[]>([]);
  const [salasExames, setSalasExames] = useState<string[]>([]);

  function resetState() {
    setForm({
      nome: "", nome_exibicao: "", endereco: "", cidade: "", uf: "",
      cep: "", whatsapp: "", email: "", horario_funcionamento: "",
      ativo: true,
    });
    setSalasRecepcao([]);
    setSalasExames([]);
    setActiveTab("dados");
  }

  function openCreate() {
    setEditing(null);
    resetState();
    setModalOpen(true);
  }

  function openEdit(unit: Unit) {
    setEditing(unit);
    setForm({
      nome: unit.nome,
      nome_exibicao: unit.nome_exibicao || "",
      endereco: unit.endereco || "",
      cidade: unit.cidade || "",
      uf: unit.uf || "",
      cep: unit.cep || "",
      whatsapp: unit.whatsapp || "",
      email: unit.email || "",
      horario_funcionamento: unit.horario_funcionamento || "",
      ativo: unit.ativo,
    });
    setSalasRecepcao(unit.salas?.recepcao ?? []);
    setSalasExames(unit.salas?.exames ?? []);
    setActiveTab("dados");
    setModalOpen(true);
  }

  function parseSalas(text: string): string[] {
    return text
      .split('\n')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0)
      .filter((s, i, arr) => arr.indexOf(s) === i);
  }

   async function handleSave() {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `${NEST_URL}units/${editing.id}`
        : `${NEST_URL}units`;
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salas: { recepcao: salasRecepcao, exames: salasExames },
        }),
      });

      // Fire-and-forget auditoria
      void fetch("/api/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "CONFIGURACAO_ALTERAR",
          recursoId: editing ? String(editing.id) : undefined,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});

      setModalOpen(false);
      refetch();
    } catch (err) {
      console.error("Erro ao salvar unidade:", err);
    } finally {
      setSaving(false);
    }
  }

  function openDelete(unit: Unit) {
    setDeletingUnit(unit);
    setDeleteModalOpen(true);
  }

  async function handleDelete({
    password,
    motivo,
  }: {
    password: string;
    motivo: string;
  }) {
    if (!deletingUnit) throw new Error("Nenhuma unidade selecionada");

    const res = await fetch("/api/units/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: deletingUnit.id,
        password,
        motivo,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.message || "Erro ao excluir unidade");
    return { requestId: payload?.requestId };
  }

  async function handleDeleteSuccess() {
    setDeleteModalOpen(false);
    setDeletingUnit(null);
    refetch();
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
              <Building2 size={28} aria-hidden="true" style={{ color: "#44735e" }} />
              <h2 className="text-xl font-semibold text-gray-800">Unidades de Atendimento</h2>
            </div>
            <Button
              color="primary"
              startContent={<Plus size={18} />}
              onPress={openCreate}
              style={{ backgroundColor: "#44735e" }}
            >
              Nova Unidade
            </Button>
          </div>

          <Table aria-label="Unidades de atendimento">
            <TableHeader>
              <TableColumn>UNIDADE</TableColumn>
              <TableColumn>CIDADE</TableColumn>
              <TableColumn>WHATSAPP</TableColumn>
              <TableColumn>SALAS RECEPÇÃO</TableColumn>
              <TableColumn>SALAS EXAMES</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>AÇÕES</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Nenhuma unidade cadastrada">
              {units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.nome_exibicao || unit.nome}</TableCell>
                  <TableCell>{unit.cidade || "-"}</TableCell>
                  <TableCell>{unit.whatsapp || "-"}</TableCell>
                  <TableCell>{(unit.salas?.recepcao?.length ?? 0)} salas</TableCell>
                  <TableCell>{(unit.salas?.exames?.length ?? 0)} salas</TableCell>
                  <TableCell>
                    <Chip
                      color={unit.ativo ? "success" : "danger"}
                      variant="flat"
                      size="sm"
                    >
                      {unit.ativo ? "Ativo" : "Inativo"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => openEdit(unit)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => openDelete(unit)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {editing ? "Editar Unidade" : "Nova Unidade"}
          </ModalHeader>
          <ModalBody>
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              aria-label="Abas da unidade"
            >
              <Tab key="dados" title="Dados da Unidade">
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Input
                    label="Nome"
                    value={form.nome}
                    onValueChange={(v) => setForm((f) => ({ ...f, nome: v }))}
                    isRequired
                  />
                  <Input
                    label="Nome de Exibição"
                    value={form.nome_exibicao}
                    onValueChange={(v) => setForm((f) => ({ ...f, nome_exibicao: v }))}
                  />
                  <div className="col-span-2 flex items-center gap-4 pt-2">
                    <Switch
                      isSelected={form.ativo}
                      onValueChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                      color="success"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        Unidade Ativa
                      </span>
                    </Switch>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={form.ativo ? "success" : "danger"}
                    >
                      {form.ativo ? "Ativo" : "Inativo"}
                    </Chip>
                  </div>
                  <Input
                    label="Endereço"
                    className="col-span-2"
                    value={form.endereco}
                    onValueChange={(v) => setForm((f) => ({ ...f, endereco: v }))}
                  />
                  <Input
                    label="Cidade"
                    value={form.cidade}
                    onValueChange={(v) => setForm((f) => ({ ...f, cidade: v }))}
                  />
                  <Input
                    label="UF"
                    value={form.uf}
                    onValueChange={(v) => setForm((f) => ({ ...f, uf: v }))}
                    maxLength={2}
                  />
                  <Input
                    label="CEP"
                    value={form.cep}
                    onValueChange={(v) => setForm((f) => ({ ...f, cep: v }))}
                  />
                  <Input
                    label="WhatsApp"
                    value={form.whatsapp}
                    onValueChange={(v) => setForm((f) => ({ ...f, whatsapp: v }))}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onValueChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  />
                  <Input
                    label="Horário de Funcionamento"
                    className="col-span-2"
                    value={form.horario_funcionamento}
                    onValueChange={(v) => setForm((f) => ({ ...f, horario_funcionamento: v }))}
                  />
                </div>
              </Tab>
              <Tab key="salas" title="Salas">
                <div className="pt-4 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DoorOpen size={18} style={{ color: "#44735e" }} />
                      <h3 className="font-medium text-gray-800">Salas de Recepção</h3>
                      <Chip size="sm" variant="flat">{salasRecepcao.length}</Chip>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Uma sala por linha</p>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#44735e] focus:border-[#44735e]"
                      rows={8}
                      value={salasRecepcao.join('\n')}
                      onChange={(e) => setSalasRecepcao(parseSalas(e.target.value))}
                      placeholder="BALCÃO&#10;GUICHÊ 1&#10;GUICHÊ 2&#10;RECEPÇÃO 1&#10;..."
                    />
                  </div>
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope size={18} style={{ color: "#44735e" }} />
                      <h3 className="font-medium text-gray-800">Salas de Exames</h3>
                      <Chip size="sm" variant="flat">{salasExames.length}</Chip>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Uma sala por linha</p>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#44735e] focus:border-[#44735e]"
                      rows={8}
                      value={salasExames.join('\n')}
                      onChange={(e) => setSalasExames(parseSalas(e.target.value))}
                      placeholder="SALA 1&#10;SALA 2&#10;SALA 3-A&#10;SALA 3-B&#10;..."
                    />
                  </div>
                </div>
              </Tab>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={saving}
              style={{ backgroundColor: "#44735e" }}
            >
              {editing ? "Atualizar" : "Criar"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <DeleteConfirmationModal
        isOpenModalDelete={deleteModalOpen}
        onCloseModalDelete={() => { setDeleteModalOpen(false); setDeletingUnit(null); }}
        onConfirm={handleDelete}
        onDeleteSuccess={handleDeleteSuccess}
        confirmTitle="Excluir Unidade"
        confirmDescription={
          <span>
            Esta ação irá excluir <strong>definitivamente</strong> a unidade{" "}
            <strong>{deletingUnit?.nome_exibicao || deletingUnit?.nome}</strong>{" "}
            e todos os dados associados.
          </span>
        }
        successMessage="Unidade excluída com sucesso."
        loadingTitle="Excluindo unidade"
        loadingMessage="Validando sua senha e registrando a exclusão..."
        confirmButtonText="Confirmar exclusão"
      />
    </>
  );
}
