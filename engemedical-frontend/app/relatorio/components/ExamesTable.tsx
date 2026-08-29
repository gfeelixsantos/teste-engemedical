import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  MoreVertical,
  Pen,
  Printer,
  Trash,
  Upload,
  XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import DeleteAttachmentModal from "./DeleteAttachmentModal";
import ExamEditModal from "./ExamEditModal";
import ExamUploadModal from "./ExamUploadModal";
import ReemitExameModal from "./ReemitExameModal";
import { SelectedFile } from "./SelectedFilesList";

import { buildViewerUrl, buildDocFilename } from "@/lib/blob/blob-proxy";

import {
  NEST_RELATORIO_FUNCIONARIO,
  NEST_SCHEDULINGS_EXAM_REISSUE,
} from "@/config/constants";
import { ExamStatus } from "@/lib/scheduling/enum/scheduling.enum";
import {
  ExamRegister,
  Scheduling,
} from "@/lib/scheduling/interface/scheduling";
import {
  getSignatureStatusLabel,
  normalizeSignatureStatus,
} from "@/lib/scheduling/status.helper";
import { IUserInfo } from "@/hooks/useUser";

interface UploadExamModalState {
  isOpen: boolean;
  exame: ExamRegister | null;
  selectedFiles: SelectedFile[];
  isUploading: boolean;
  error: string;
  success: boolean;
}

const ExamesTable: React.FC<{
  exames: ExamRegister[];
  atendimento: Scheduling;
  userApp: IUserInfo | null;
  onUpdateScheduling?: (updated: Scheduling) => void;
}> = ({ exames, atendimento, userApp, onUpdateScheduling }) => {
  const [localExames, setLocalExames] = useState<ExamRegister[]>(exames || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadExamModal, setUploadExamModal] = useState<UploadExamModalState>({
    isOpen: false,
    exame: null,
    selectedFiles: [],
    isUploading: false,
    error: "",
    success: false,
  });
  const [deleteAttachmentModal, setDeleteAttachmentModal] = useState<{
    isOpen: boolean;
    examId: string;
    examName: string;
    examGrupo: string;
  }>({ isOpen: false, examId: "", examName: "", examGrupo: "" });
  const [editExamModal, setEditExamModal] = useState<{
    isOpen: boolean;
    exam: ExamRegister | null;
  }>({ isOpen: false, exam: null });

  const [reemitindoExams, setReemitindoExams] = useState<boolean>(false);
  const [isCredenciada, setIsCredenciada] = useState<boolean>(false);
  const [reemitModal, setReemitModal] = useState<{
    isOpen: boolean;
    exame: ExamRegister | null;
  }>({ isOpen: false, exame: null });
  // Estado para modal de alerta
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    type: "success" | "error" | "warning";
    message: string;
    onConfirm?: () => void;
  }>({ open: false, type: "warning", message: "" });

  useEffect(() => {
    const isCredenciada =
      atendimento?.NOMECARGO?.includes("KIT CREDENCIADA") ||
      atendimento?.NOMESETOR?.includes("KIT CREDENCIADA");

    setIsCredenciada(isCredenciada);
  }, [atendimento?.NOMECARGO, atendimento?.NOMESETOR]);

  const fetchUpdatedExames = async () => {
    try {
      const response = await fetch(
        `${NEST_RELATORIO_FUNCIONARIO}${atendimento._id}`,
      );

      if (response.ok) {
        const updatedAtendimento = await response.json();
        const updatedExams = updatedAtendimento.EXAMES || [];

        setLocalExames(updatedExams);

        if (onUpdateScheduling) {
          onUpdateScheduling(updatedAtendimento);
        }

        console.log("Exames atualizados via refetch:", updatedExams.length);
      }
    } catch (error) {
      console.error("Erro ao buscar exames atualizados:", error);
    }
  };

  useEffect(() => {
    setLocalExames(exames || []);
  }, [exames]);

  const formatDateCompact = (d?: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; }
  };

  const handleOpenExamResult = (url?: string, exame?: ExamRegister) => {
    const displayName =
      exame && atendimento.NOME
        ? buildDocFilename([
            'CMSO_RESULTADO',
            exame.nomeExame || exame.codigoExame || 'EXAME',
            atendimento.NOME,
            formatDateCompact(exame.dataExame),
          ])
        : undefined;
    const viewerUrl = buildViewerUrl(url, displayName);
    if (!viewerUrl) return;
    window.open(viewerUrl, "_blank", "noopener,noreferrer");
  };

  const handleUploadSuccess = (updatedScheduling: Scheduling) => {
    setLocalExames(updatedScheduling.EXAMES || []);
    if (onUpdateScheduling) {
      onUpdateScheduling(updatedScheduling);
    }

    setTimeout(() => {
      fetchUpdatedExames();
    }, 1200);
  };

  const handleDeleteSuccess = (updatedScheduling?: Scheduling) => {
    setDeleteAttachmentModal({
      isOpen: false,
      examId: "",
      examName: "",
      examGrupo: "",
    });

    if (updatedScheduling) {
      setLocalExames(updatedScheduling.EXAMES || []);

      if (onUpdateScheduling) {
        onUpdateScheduling(updatedScheduling);
      }
    } else {
      fetchUpdatedExames();
    }
  };

  const handleReemitirExame = async (exame: ExamRegister) => {
    setReemitModal({ isOpen: true, exame });
  };

  const handleReemitConfirm = async () => {
    const exame = reemitModal.exame;

    if (!exame) return;

    setReemitindoExams(true);

    try {
      const response = await fetch(`${NEST_SCHEDULINGS_EXAM_REISSUE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          funcionarioId: atendimento._id,
          codigoExame: exame.codigoExame,
          profissional: {
            nome: exame.profissional,
            codigo: exame.codigoProfissional,
          },
        }),
      });

      if (!response.ok) {
        let errorMessage = "Erro ao reemitir exame";

        try {
          const errorPayload = await response.json();

          if (typeof errorPayload?.message === "string") {
            errorMessage = errorPayload.message;
          } else if (Array.isArray(errorPayload?.message)) {
            errorMessage = errorPayload.message.join(", ");
          } else if (typeof errorPayload?.error === "string") {
            errorMessage = errorPayload.error;
          }
        } catch {
          // Mantem a mensagem padrão quando a resposta não vem em JSON.
        }

        throw new Error(errorMessage);
      }

      const result: Scheduling = await response.json();

      if (result) {
        setReemitModal({ isOpen: false, exame: null });

        setAlertModal({
          open: true,
          type: "success",
          message:
            "Pedido de reemissão enviado. O resultado aparecerá automaticamente nesta tela em alguns segundos.",
        });

        // O fallback de fetch continua como garantia, mas o WebSocket deve agir antes.
        setTimeout(async () => {
          await fetchUpdatedExames();
        }, 5000);

        return Promise.resolve();
      } else {
        throw new Error("Atualizacao nao concluida.");
      }
    } catch (error) {
      console.error("Erro ao reemitir exame:", error);

      return Promise.reject(error);
    } finally {
      setReemitindoExams(false);
    }
  };

  const handleFinalizarExame = async (exame: ExamRegister) => {
    if (exame.grupo != "Ultrassom") {
      setAlertModal({
        open: true,
        type: "error",
        message: "Exame nao identificado como Ultrassom para finalizacao.",
      });

      return;
    }

    setAlertModal({
      open: true,
      type: "warning",
      message: "Finalizar Ultrassom como NORMAL ?",
      onConfirm: async () => {
        try {
          const response = await fetch("/api/schedulings/exame/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              funcionarioId: atendimento._id,
              codigoExame: [exame.codigoExame],
              formulario: {
                normal: "Sim",
                observacoes: "",
              },
              sala: "Emitido via relatorio",
              profissional: userApp ?? undefined,
              isEditing: true,
              dataExame: new Date(),
            }),
          });

          const result: Scheduling = await response.json();

          if (result) {
            setAlertModal({
              open: true,
              type: "success",
              message:
                "Exame atualizado, atualize a pagina para ver o resultado.",
            });
          }
        } catch (err) {
          setAlertModal({
            open: true,
            type: "error",
            message: `Erro ao finalizar exame ${err}`,
          });
        }
      },
    });
  };

  const handleEditModalClose = () => {
    setEditExamModal({ isOpen: false, exam: null });

    setTimeout(() => {
      fetchUpdatedExames();
    }, 1500);
  };

  const filteredExames = useMemo(() => {
    if (!searchTerm) return localExames;

    return localExames.filter(
      (exame) =>
        exame.nomeExame?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exame.codigoExame?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exame.grupo?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [localExames, searchTerm]);

  const getExamStatusColor = (status?: string) => {
    switch (status) {
      case ExamStatus.FINALIZADO:
        return "success";
      case ExamStatus.PENDENTE:
        return "warning";
      case ExamStatus.AGUARDANDO_RESULTADO:
        return "secondary";
      case "NAO_REALIZADO":
        return "danger";
      default:
        return "default";
    }
  };

  const getExamStatusIcon = (status?: string) => {
    switch (status) {
      case ExamStatus.FINALIZADO:
        return <CheckCircle size={14} />;
      case ExamStatus.PENDENTE:
        return <Clock size={14} />;
      case ExamStatus.AGUARDANDO_RESULTADO:
        return <AlertCircle size={14} />;
      case "NAO_REALIZADO":
        return <XCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const getSignatureStatusMeta = (exame: ExamRegister) => {
    const sig = exame.signature;
    const signatureStatus = normalizeSignatureStatus(sig?.status);

    if (!signatureStatus) {
      return null;
    }

    if (signatureStatus === "PENDENTE" || signatureStatus === "PROCESSANDO") {
      return {
        icon: <Clock className="text-amber-600" size={12} />,
        label:
          signatureStatus === "PROCESSANDO"
            ? "Processando assinatura digital"
            : "Aguardando assinatura digital",
        labelClassName: "text-amber-700",
        detail: sig?.provider && `via ${sig.provider.toUpperCase()}`,
        detailClassName: "text-amber-600/80",
      };
    }

    if (signatureStatus === "DIGITALIZADA") {
      return {
        icon: <FileText className="text-blue-600" size={12} />,
        label: "Assinatura Digitalizada",
        labelClassName: "text-blue-700",
        detailClassName: "text-blue-600/80",
      };
    }

    if (signatureStatus === "ERRO_IDENTIDADE_PROFISSIONAL") {
      return {
        icon: <AlertCircle className="text-rose-600" size={12} />,
        label: "Erro de identidade profissional",
        labelClassName: "text-rose-700",
        detail:
          sig?.error || "Profissional responsavel ausente ou inconsistente",
        detailClassName: "text-rose-600/80",
      };
    }

    if (signatureStatus === "ASSINADO" || signatureStatus === "LIBERADO") {
      return {
        icon: <CheckCircle className="text-green-600" size={12} />,
        label: "Assinatura Eletrônica",
        labelClassName: "text-green-700",
        detail: sig?.provider && `via ${sig.provider.toUpperCase()}`,
        detailClassName: "text-green-600/80",
      };
    }

    if (signatureStatus === "FALHA") {
      return {
        icon: <AlertCircle className="text-rose-600" size={12} />,
        label: "Falha na assinatura digital",
        labelClassName: "text-rose-700",
        detail:
          sig?.error || (sig?.provider && `via ${sig.provider.toUpperCase()}`),
        detailClassName: "text-rose-600/80",
      };
    }

    return {
      icon: <Clock className="text-default-500" size={12} />,
      label: getSignatureStatusLabel(signatureStatus),
      labelClassName: "text-default-600",
      detailClassName: "text-default-500",
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";

    return new Date(dateString).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  };

  const calculateWaitTime = (
    ticketTime: Date | null | undefined,
    exame: ExamRegister,
  ) => {
    if (!ticketTime || !exame?.dataExame) return null;

    try {
      const ticketDate = new Date(ticketTime);
      const exameDate = new Date(exame.dataExame);

      if (
        Number.isNaN(ticketDate.getTime()) ||
        Number.isNaN(exameDate.getTime())
      ) {
        return null;
      }

      const diffMs = exameDate.getTime() - ticketDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes <= 0) {
        return "0 min";
      }

      if (diffMinutes < 60) {
        return `${diffMinutes} min`;
      }

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      return `${hours}h ${minutes}min`;
    } catch {
      return null;
    }
  };

  if (!localExames.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          Nenhum exame encontrado
        </h3>
        <p className="text-gray-500">
          Nao ha exames cadastrados para este atendimento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DeleteAttachmentModal
        atendimentoId={atendimento._id}
        examGrupo={deleteAttachmentModal.examGrupo}
        examId={deleteAttachmentModal.examId}
        examName={deleteAttachmentModal.examName}
        isOpen={deleteAttachmentModal.isOpen}
        onClose={() =>
          setDeleteAttachmentModal({
            isOpen: false,
            examId: "",
            examName: "",
            examGrupo: "",
          })
        }
        onSuccess={handleDeleteSuccess}
      />

      <ReemitExameModal
        exame={reemitModal.exame}
        isOpen={reemitModal.isOpen}
        onClose={() => setReemitModal({ isOpen: false, exame: null })}
        onConfirm={handleReemitConfirm}
      />

      {editExamModal.isOpen && editExamModal.exam && (
        <ExamEditModal
          atendimento={atendimento}
          exame={editExamModal.exam}
          isOpen={editExamModal.isOpen}
          operationalUser={userApp}
          onClose={handleEditModalClose}
        />
      )}

      {uploadExamModal.isOpen && uploadExamModal.exame && (
        <ExamUploadModal
          atendimento={atendimento}
          exame={uploadExamModal.exame}
          isOpen={uploadExamModal.isOpen}
          onClose={() =>
            setUploadExamModal({
              isOpen: false,
              exame: null,
              selectedFiles: [],
              isUploading: false,
              error: "",
              success: false,
            })
          }
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-bold text-gray-800">
            Exames Realizados
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {localExames.filter((e) => e.status === "FINALIZADO").length}{" "}
              Finalizados
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              {localExames.filter((e) => e.status === "PENDENTE").length}{" "}
              Pendentes
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              {localExames.filter((e) => Boolean(e.url)).length} Com resultado
            </span>
          </div>
        </div>
        <Input
          className="w-full sm:w-64"
          placeholder="Buscar exames..."
          size="sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <Table
          removeWrapper
          aria-label="Tabela de exames"
          classNames={{
            base: "min-w-full",
            th: "bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700",
            td: "px-3 py-2",
          }}
        >
          <TableHeader>
            <TableColumn>EXAME</TableColumn>
            <TableColumn className="w-4/24">STATUS</TableColumn>
            <TableColumn>RESULTADO</TableColumn>
            <TableColumn className="text-center">ACOES</TableColumn>
          </TableHeader>
          <TableBody>
            {filteredExames.map((exame, index) => {
              const examKey = [
                exame.codigoExame || "sem-codigo",
                exame.dataExame || "sem-data",
                exame.status || "sem-status",
                index,
              ].join("-");
              const waitTime = calculateWaitTime(
                atendimento.TICKET?.emissao,
                exame,
              );
              const hasExecutionData = Boolean(
                exame.dataExame || exame.sala || exame.profissional,
              );
              const signatureMeta = getSignatureStatusMeta(exame);

              return (
                <TableRow key={examKey}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-gray-900">
                        <span>{exame.nomeExame}</span>
                        {signatureMeta && (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${signatureMeta.labelClassName}`}
                          >
                            {signatureMeta.icon}
                            <span>{signatureMeta.label}</span>
                            {signatureMeta.detail && (
                              <span
                                className={`max-w-[220px] truncate ${signatureMeta.detailClassName}`}
                                title={signatureMeta.detail}
                              >
                                {signatureMeta.detail}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      {hasExecutionData ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <div>{formatDate(exame.dataExame || "")}</div>
                          <div>
                            {exame.sala || "-"} - {exame.profissional || "-"}
                          </div>
                          {waitTime && (
                            <div className="flex items-center text-xs text-gray-500">
                              <span>Espera: {waitTime}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          Sem detalhes registrados para este exame.
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      classNames={{ content: "text-xs" }}
                      color={getExamStatusColor(exame.status)}
                      size="sm"
                      startContent={getExamStatusIcon(exame.status)}
                      variant="flat"
                    >
                      {exame.status === "NAO_REALIZADO" ? "NÃO REALIZADO" : exame.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          color={isCredenciada ? "default" : "primary"}
                          disabled={isCredenciada}
                          size="sm"
                          startContent={<Upload size={14} />}
                          variant="solid"
                          onPress={() =>
                            setUploadExamModal({
                              isOpen: true,
                              exame,
                              selectedFiles: [],
                              isUploading: false,
                              error: "",
                              success: false,
                            })
                          }
                        >
                          Enviar
                        </Button>
                      </div>
                      {exame.url && (
                        <div className="flex flex-col gap-1">
                          <Button
                            className="w-full"
                            color="primary"
                            size="sm"
                            startContent={<Eye size={14} />}
                            variant="light"
                            onPress={() => handleOpenExamResult(exame.url, exame)}
                          >
                            Visualizar
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Dropdown>
                        <DropdownTrigger>
                          <Button
                            isIconOnly
                            className="min-w-8"
                            size="sm"
                            variant="light"
                          >
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Acoes do exame">
                          <DropdownItem
                            key="reemitir"
                            color="default"
                            startContent={
                              !reemitindoExams && <Printer size={14} />
                            }
                            variant="light"
                            onPress={() => handleReemitirExame(exame)}
                          >
                            {reemitindoExams ? "Reemitindo..." : "Reemitir"}
                          </DropdownItem>
                          {exame.grupo?.includes("Ultrassom") ? (
                            <DropdownItem
                              key="finalizar"
                              color="default"
                              startContent={
                                !reemitindoExams && <Check size={14} />
                              }
                              variant="light"
                              onPress={() => handleFinalizarExame(exame)}
                            >
                              {reemitindoExams ? "Finalizando.." : "Finalizar"}
                            </DropdownItem>
                          ) : null}
                          {userApp?.codigo == exame.codigoProfissional ? (
                            <DropdownItem
                              key="edit"
                              startContent={<Pen size={14} />}
                              textValue="Editar Exame"
                              onPress={() =>
                                setEditExamModal({ isOpen: true, exam: exame })
                              }
                            >
                              Editar Exame
                            </DropdownItem>
                          ) : null}
                          {exame.url ? (
                            <DropdownItem
                              key="delete-result"
                              className="text-danger"
                              color="danger"
                              startContent={<Trash size={14} />}
                              textValue="Remover Resultado"
                              onPress={() =>
                                setDeleteAttachmentModal({
                                  isOpen: true,
                                  examId: exame.codigoExame,
                                  examName: exame.nomeExame,
                                  examGrupo: exame.grupo || "",
                                })
                              }
                            >
                              Remover Resultado
                            </DropdownItem>
                          ) : null}
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Alerta */}
      <Modal
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
            <p>{alertModal.message}</p>
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
      </Modal>
    </div>
  );
};

export default React.memo(ExamesTable);
