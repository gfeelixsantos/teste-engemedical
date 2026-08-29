// page.tsx
// app/relatorios/LazyModalContent.tsx
import React, { useState, useCallback } from "react";
import {
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Divider,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/react";
import {
  Trash,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

import DeleteConfirmationModal from "./components/DeleteConfirmationModal";
import InformacoesGerais, {
  EditModeState,
} from "./components/InformacoesGerais";
import ExamesTable from "./components/ExamesTable";
import RiscosFuncionario from "./components/RiscosFuncionario";

import AnexosUpload from "./components/AnexosUpload";

import {
  NEST_SCHEDULINGS_UPDATE,
  NEST_SCHEDULINGS_ANEXO_UPLOAD,
  NEST_SCHEDULINGS_PRONTUARIO,
  NEST_RELATORIO_FUNCIONARIO,
} from "@/config/constants";
import { reportInternal } from "@/lib/scheduling/report/reportInternal";
import { guiaAtendimento } from "@/lib/scheduling/report/guiaAtendimento";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { AtendimentoStatus } from "@/lib/scheduling/enum/scheduling.enum";
import { IUserInfo } from "@/hooks/useUser";
import { buildViewerUrl, buildDocFilename } from "@/lib/blob/blob-proxy";

interface LazyModalContentProps {
  atendimento: Scheduling;
  userApp: IUserInfo | null;
  onClose: () => void;
  onUpdateScheduling?: (updated: Scheduling) => void;
}

interface SyncProntuarioPayload {
  success?: boolean;
  message?: string;
  data?: Scheduling;
  resumo?: {
    preservados?: number;
    adicionados?: number;
    removidos?: number;
  };
}

const formatStatusLabel = (status?: string | null): string => {
  if (!status) return "Não informado";
  if (status === "NAO_REALIZADO") return "Não Realizado";
  if (status === "PENDENTE") return "Pendente";

  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
};

const getStatusTextColor = (status: string): string => {
  switch (status) {
    case AtendimentoStatus.FINALIZADO:
      return "text-emerald-600"; // Verde esmeralda (Conclusão/Sucesso)
    case AtendimentoStatus.EM_ATENDIMENTO:
      return "text-blue-600"; // Azul calmo (Progresso Ativo)
    case AtendimentoStatus.AGUARDANDO_RESULTADOS:
      return "text-indigo-600"; // Índigo (Espera de Exames Externos)
    case AtendimentoStatus.AVALIACAO_MEDICA:
      return "text-amber-600"; // Âmbar/Dourado (Aguardando Médico)
    case AtendimentoStatus.AGENDADO:
      return "text-gray-400"; // Cinza sutil (Fase Inicial/Passiva)
    case AtendimentoStatus.PENDENTE:
      return "text-orange-500"; // Laranja/Âmbar quente para consistência com o painel de gestão
    default:
      return "text-primary-600";
  }
};

// ============================================
// COMPONENTE PRINCIPAL: LazyModalContent
// ============================================
const LazyModalContent: React.FC<LazyModalContentProps> = ({
  atendimento,
  userApp,
  onClose,
  onUpdateScheduling,
}) => {
  const [editMode, setEditMode] = useState<EditModeState>({
    isEditing: false,
    editedData: {},
  });
  const [loadingViewReport, setLoadingViewReport] = useState(false);
  const [loadingViewGuia, setLoadingViewGuia] = useState(false);
  const [loadingSyncSoc, setLoadingSyncSoc] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [removeAttachmentModal, setRemoveAttachmentModal] = useState<{
    isOpen: boolean;
    fileName: string;
  }>({ isOpen: false, fileName: "" });
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const asoUrl = atendimento.ASOINFO?.url;

  // Estado para modal de alerta
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    type: "success" | "error" | "warning";
    message: string;
    onConfirm?: () => void;
  }>({ open: false, type: "warning", message: "" });

  // ============================================
  // HANDLERS PARA ANEXOS
  // ============================================

  const handleUploadAttachments = useCallback(
    async (files: File[]) => {
      if (!files.length || !atendimento._id) return;

      setLoadingAttachments(true);
      try {
        const formData = new FormData();

        formData.append("schedulingId", atendimento._id);
        files.forEach((file) => {
          formData.append("files", file);
        });

        const response = await fetch(NEST_SCHEDULINGS_ANEXO_UPLOAD, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Erro ao fazer upload dos anexos");
        }

        const updatedAtendimento = await response.json();

        if (onUpdateScheduling) {
          onUpdateScheduling(updatedAtendimento);
        }

        setAlertModal({
          open: true,
          type: "success",
          message: "Anexos enviados com sucesso!",
        });
      } catch (error) {
        console.error("Erro ao fazer upload:", error);
        setAlertModal({
          open: true,
          type: "error",
          message: "Erro ao enviar anexos",
        });
      } finally {
        setLoadingAttachments(false);
      }
    },
    [atendimento._id, onUpdateScheduling],
  );

  const handleRemoveAttachment = useCallback(
    async (fileName: string) => {
      if (!atendimento._id) return;
      setRemoveAttachmentModal({
        isOpen: true,
        fileName,
      });
    },
    [atendimento._id],
  );

  // ============================================
  // HANDLERS EXISTENTES
  // ============================================

  const handleViewMedicalRecord = () => {
    const prontuarioUrl = `${NEST_SCHEDULINGS_PRONTUARIO}${atendimento._id}`;
    const viewerUrl = buildViewerUrl(
      prontuarioUrl,
      buildDocFilename(['CMSO_PRONTUARIO', atendimento.NOME, atendimento.CODIGOPRONTUARIO]),
    );
    window.open(viewerUrl, "_blank", "noopener,noreferrer");
  };

  const handleViewGuia = async () => {
    if (!atendimento?._id) return;
    try {
      setLoadingViewGuia(true);
      const html = await guiaAtendimento(atendimento);
      const newWin = window.open("", "_blank");
      if (newWin) {
        newWin.document.open();
        newWin.document.write(html);
        newWin.document.close();
        newWin.onload = () => newWin.focus();
      } else {
        setAlertModal({
          open: true,
          type: "error",
          message: "Não foi possível abrir a guia em nova aba",
        });
      }
    } catch (error) {
      console.error("Erro ao gerar guia:", error);
      setAlertModal({
        open: true,
        type: "error",
        message: "Não foi possível carregar a guia de atendimento",
      });
    } finally {
      setLoadingViewGuia(false);
    }
  };

  // handler para carregar relatório do Mongo e abrir em nova aba
  const handleViewReport = async () => {
    if (!atendimento?._id) return;
    try {
      setLoadingViewReport(true);
      const response = await fetch(
        `${NEST_RELATORIO_FUNCIONARIO}${atendimento._id}`,
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar relatório");
      }
      const data: Scheduling = await response.json();
      const html = reportInternal(data);
      const newWin = window.open("", "_blank");

      if (newWin) {
        newWin.document.open();
        newWin.document.write(html);
        newWin.document.close();
        newWin.onload = () => newWin.focus();
      } else {
        setAlertModal({
          open: true,
          type: "error",
          message: "Não foi possível abrir o relatório em nova aba",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
      setAlertModal({
        open: true,
        type: "error",
        message: "Não foi possível carregar o relatório",
      });
    } finally {
      setLoadingViewReport(false);
    }
  };

  const handleSyncWithSOC = async () => {
    try {
      setLoadingSyncSoc(true);

      const response = await fetch("/api/soc/sincronizar-prontuario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedulingId: atendimento._id,
          empresa: atendimento.CODIGOEMPRESA,
          funcionario: atendimento.CODIGO,
        }),
      });

      const payload: SyncProntuarioPayload = await response.json();

      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.message || "Erro ao sincronizar com SOC");
      }

      onUpdateScheduling?.(payload.data);

      setAlertModal({
        open: true,
        type: "success",
        message: `Prontuário atualizado com os dados do SOC.`,
      });
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      setAlertModal({
        open: true,
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro ao sincronizar prontuario com SOC",
      });
    } finally {
      setLoadingSyncSoc(false);
    }
  };

  const handleDeleteScheduling = async ({
    password,
    motivo,
  }: {
    password: string;
    motivo: string;
  }) => {
    try {
      const response = await fetch("/api/schedulings/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedulingId: atendimento._id,
          password,
          motivo,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Erro ao excluir atendimento");
      }

      return {
        requestId: payload?.requestId,
      };
    } catch (error: any) {
      console.error("Erro ao excluir:", error);

      return Promise.reject(error);
    }
  };

  const handleRemoveStoredAttachment = async ({
    password,
    motivo,
  }: {
    password: string;
    motivo: string;
  }) => {
    const response = await fetch("/api/schedulings/remove-anexo", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedulingId: atendimento._id,
        fileName: removeAttachmentModal.fileName,
        motivo,
        password,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message || "Erro ao remover anexo.");
    }

    if (onUpdateScheduling && payload) {
      onUpdateScheduling(payload as Scheduling);
    }

    return {
      requestId: payload?.requestId,
    };
  };

  const handleSaveEmployeeData = async (data: Partial<Scheduling>) => {
    try {
      const response = await fetch(NEST_SCHEDULINGS_UPDATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedulingId: atendimento._id,
          updates: data,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar dados do funcionário");
      }

      const updatedAtendimento = await response.json();

      if (onUpdateScheduling) {
        onUpdateScheduling(updatedAtendimento);
      }

      return updatedAtendimento;
    } catch (error) {
      console.error("Erro ao salvar dados do funcionário:", error);
      throw error;
    }
  };

  return (
    <>
      <DeleteConfirmationModal
        confirmDescription={
          <span>
            Esta ação irá excluir <strong>definitivamente</strong> o
            atendimento e todos os dados associados.
          </span>
        }
        isOpenModalDelete={deleteModalOpen}
        loadingTitle="Excluindo atendimento"
        loadingMessage="Validando sua senha e registrando a exclusão do atendimento..."
        onCloseModalDelete={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteScheduling}
        onDeleteSuccess={onClose}
      />

      <DeleteConfirmationModal
        confirmButtonText="Remover anexo"
        confirmDescription={
          <span>
            Tem certeza que deseja remover o anexo{" "}
            <strong>{removeAttachmentModal.fileName}</strong>?
          </span>
        }
        confirmTitle="Remover anexo"
        isOpenModalDelete={removeAttachmentModal.isOpen}
        loadingMessage="Validando sua senha e removendo o anexo..."
        loadingTitle="Removendo anexo"
        motivoPlaceholder="Explique por que o anexo está sendo removido"
        onCloseModalDelete={() =>
          setRemoveAttachmentModal({
            isOpen: false,
            fileName: "",
          })
        }
        onConfirm={handleRemoveStoredAttachment}
        successMessage="Anexo removido com sucesso."
        successTitle="Anexo removido"
      />

      <ModalHeader className="flex gap-2">
        <div className="flex items-center justify-between w-full">
          <div>
            <div className="flex items-baseline gap-4 text-sm text-gray-600 mt-1">
              <h2 className="text-xl font-bold">
                {atendimento.NOME.toUpperCase()}
              </h2>
              <span>{atendimento.TIPOEXAMENOME}</span>
              <span>{atendimento.DATAAGENDAMENTO}</span>
            </div>
            <div>
              <span className="flex gap-6 text-sm text-gray-600 mt-1">
                {atendimento.NOMEEMPRESA}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Dropdown placement="bottom-start">
                <DropdownTrigger>
                  <Button
                    color="default"
                    size="sm"
                    startContent={<FolderOpen size={16} />}
                    variant="light"
                  >
                    Documentos
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Documentos do atendimento"
                  onAction={(key) => {
                    switch (key) {
                      case "ASO": {
                        const url = asoUrl;
                        if (url) {
                          const viewerUrl = buildViewerUrl(
                            url,
                            buildDocFilename([
                              "CMSO_ASO",
                              atendimento.NOME,
                            ]),
                          );
                          if (viewerUrl)
                            window.open(viewerUrl, "_blank", "noopener,noreferrer");
                        }
                        break;
                      }
                      case "GUIA":
                        handleViewGuia();
                        break;
                      case "PRONTUARIO":
                        handleViewMedicalRecord();
                        break;
                      case "RELATORIO":
                        handleViewReport();
                        break;
                      case "EVIDENCIAS": {
                        const url =
                          atendimento.AUTENTICACAOATENDIMENTO?.evidencias
                            ?.relatorioEvidenciasUrl;
                        if (url) {
                          const viewerUrl = buildViewerUrl(
                            url,
                            buildDocFilename([
                              "CMSO_EVIDENCIAS",
                              atendimento.NOME,
                            ]),
                          );
                          if (viewerUrl)
                            window.open(
                              viewerUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                        }
                        break;
                      }
                      case "TERMO_ACEITE": {
                        const url =
                          atendimento.AUTENTICACAOATENDIMENTO?.evidencias
                            ?.termoCienciaUrl;
                        if (url) {
                          const viewerUrl = buildViewerUrl(
                            url,
                            buildDocFilename([
                              "CMSO_TERMO_CIENCIA",
                              atendimento.NOME,
                            ]),
                          );
                          if (viewerUrl)
                            window.open(
                              viewerUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                        }
                        break;
                      }
                      case "VALIDACAO": {
                        const url =
                          atendimento.ASOINFO?.validacao ||
                          atendimento.ASOINFO?.validacaoUrl;
                        if (url) {
                          const metodo =
                            atendimento.AUTENTICACAOATENDIMENTO?.metodo ||
                            "SOC";
                          const viewerUrl = buildViewerUrl(
                            url,
                            buildDocFilename([
                              "CMSO_VALIDACAO",
                              metodo,
                              atendimento.NOME,
                            ]),
                          );
                          if (viewerUrl)
                            window.open(
                              viewerUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                        }
                        break;
                      }
                    }
                  }}
                >
                  {asoUrl ? (
                    <DropdownSection showDivider title="ASO">
                      <DropdownItem
                        key="ASO"
                        description="Visualizar o documento ASO em PDF"
                      >
                        ASO
                      </DropdownItem>
                    </DropdownSection>
                  ) : null}
                  <DropdownSection showDivider title="Exame">
                    <DropdownItem
                      key="GUIA"
                      description="Imprimir guia de atendimento"
                    >
                      Guia de Atendimento
                    </DropdownItem>
                    <DropdownItem
                      key="PRONTUARIO"
                      description="Visualizar o prontuário completo"
                    >
                      Ver Prontuário
                    </DropdownItem>
                  </DropdownSection>
                  <DropdownSection title="Relatórios">
                    <DropdownItem
                      key="RELATORIO"
                      description="Relatório completo do atendimento"
                    >
                      Atendimento
                    </DropdownItem>
                    {atendimento.AUTENTICACAOATENDIMENTO?.evidencias
                      ?.relatorioEvidenciasUrl ? (
                      <DropdownItem
                        key="EVIDENCIAS"
                        description="Relatório de evidências da autenticação"
                      >
                        Evidências
                      </DropdownItem>
                    ) : null}
                    {atendimento.AUTENTICACAOATENDIMENTO?.evidencias
                      ?.termoCienciaUrl ? (
                      <DropdownItem
                        key="TERMO_ACEITE"
                        description="Termo de ciência da autenticação"
                      >
                        Termo de Aceite
                      </DropdownItem>
                    ) : null}
                    {atendimento.ASOINFO?.validacao ||
                    atendimento.ASOINFO?.validacaoUrl ? (
                      <DropdownItem
                        key="VALIDACAO"
                        description="Validar assinatura digital do ASO"
                      >
                        Validação
                      </DropdownItem>
                    ) : null}
                  </DropdownSection>
                </DropdownMenu>
              </Dropdown>

              <Button
                color="default"
                disabled={loadingSyncSoc || loadingViewReport}
                isLoading={loadingSyncSoc}
                size="sm"
                startContent={<RefreshCw size={16} />}
                variant="light"
                onPress={() =>
                  setAlertModal({
                    open: true,
                    type: "warning",
                    message:
                      "A sincronização vai atualizar os dados do funcionário com as informações mais recentes do sistema. Exames já realizados serão mantidos. Deseja continuar?",
                    onConfirm: handleSyncWithSOC,
                  })
                }
              >
                Sincronizar SOC
              </Button>
              <Button
                color="danger"
                size="sm"
                startContent={<Trash size={16} />}
                variant="light"
                onPress={() => setDeleteModalOpen(true)}
              >
                Excluir
              </Button>
            </div>
          </div>
          <div className="flex items-center">
            <span
              className={`text-lg font-bold ${getStatusTextColor(atendimento.ATENDIMENTOSTATUS || "")}`}
            >
              {formatStatusLabel(atendimento.ATENDIMENTOSTATUS)}
            </span>
          </div>
        </div>
      </ModalHeader>
      <ModalBody>
        <InformacoesGerais
          atendimento={atendimento}
          editMode={editMode}
          onEditModeChange={setEditMode}
          onSave={handleSaveEmployeeData}
        />
        <RiscosFuncionario atendimento={atendimento} />

        <Divider className="my-6" />
        <ExamesTable
          atendimento={atendimento}
          exames={atendimento.EXAMES}
          userApp={userApp}
          onUpdateScheduling={onUpdateScheduling}
        />
        <AnexosUpload
          allowedTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
          anexos={atendimento.ANEXOS || []}
          isLoading={loadingAttachments}
          maxFileSize={10} // 10MB
          onRemove={handleRemoveAttachment}
          onUpload={handleUploadAttachments}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={onClose}>
          Fechar
        </Button>
      </ModalFooter>

      {/* Modal de Alerta */}
      <HeroModal
        disableAnimation
        classNames={{
          base: "z-[1100]",
          wrapper: "z-[1100]",
          backdrop: "z-[1099]",
        }}
        isDismissable={false}
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ ...alertModal, open: false })}
      >
        <ModalContent className="border border-[#104e35]/20">
          <ModalHeader
            className={
              alertModal.type === "success"
                ? "text-green-600"
                : alertModal.type === "error"
                  ? "text-red-600"
                  : "text-yellow-600"
            }
          >
            {alertModal.type === "success"
              ? "Sucesso"
              : alertModal.type === "error"
                ? "Erro"
                : "Atenção"}
          </ModalHeader>
          <ModalBody>
            <p className="whitespace-pre-line">{alertModal.message}</p>
          </ModalBody>
          <ModalFooter>
            {alertModal.onConfirm ? (
              <>
                <Button
                  variant="light"
                  onPress={() => setAlertModal({ ...alertModal, open: false })}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white"
                  onPress={() => {
                    alertModal.onConfirm?.();
                    setAlertModal({ ...alertModal, open: false });
                  }}
                >
                  Confirmar
                </Button>
              </>
            ) : (
              <Button
                className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white"
                onPress={() => setAlertModal({ ...alertModal, open: false })}
              >
                OK
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </HeroModal>
    </>
  );
};

LazyModalContent.displayName = "LazyModalContent";
export default LazyModalContent;

