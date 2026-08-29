"use client";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Checkbox,
  Textarea,
} from "@heroui/react";
import { Fingerprint } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Socket } from "socket.io-client";

import FichaClinicaOcupacional from "./exames/FichaClinicaOcupacional";
import AcuidadeVisual from "./exames/AcuidadeVisual";
import Espirometria from "./exames/Espirometria";
import Dinamometria from "./exames/Dinamometria";
import Psicossocial from "./exames/Psicossocial";
import ExamePadrao from "./exames/ExamePadrao";
import AudiometriaOcupacional from "./exames/AudiometriaOcupacional";
import KitAtendimento from "./exames/KitAtendimento";
import Ultrassom from "./exames/Ultrassom";
import FichaClinicaWhirlpool from "./exames/FichaClinicaWhirlpool";
import FichaAssistencial from "./exames/FichaAssistencial";
import { AtendimentoRules } from "./AtendimentoRules";
import { fetchExames, IExame } from "@/lib/exames/services/exames.service";

import { IPscAuthStatus } from "@/lib/user/interfaces/IUser";
import { TicketActionType } from "@/lib/ticket/ticket";
import { ExamStatus } from "@/lib/scheduling/enum/scheduling.enum";
import { useUser } from "@/hooks/useUser";
import {
  ExamRegister,
  Scheduling,
} from "@/lib/scheduling/interface/scheduling";
import { useSchedulingEntityManager } from "@/hooks/SchedulingEntityManager";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { getCurrentUser } from "@/lib/utils";
import { useExamDraft } from "@/hooks/useExamDraft";

interface AtendimentoModalExamesProps {
  isOpen: boolean;
  onClose: () => void;
  funcionarioSelecionado: Scheduling | null;
  exame: string;
  sala: string;
  unidade?: string;
  codigosAtendimento: Set<string>;
  socket: Socket;
  operationalUser?: IUserInfo | null;
  assinaDigitalmente?: boolean;
  pscAuthStatus?: IPscAuthStatus;
  onPscAuth?: (provider?: string) => void;
}

// Tipos para o modal de notificação
type NotificationType = "confirm" | "success" | "error";

interface NotificationModalState {
  isOpen: boolean;
  type: NotificationType;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  isLoading?: boolean;
}

const AtendimentoModalExames = ({
  isOpen,
  onClose,
  exame,
  sala,
  unidade,
  codigosAtendimento,
  funcionarioSelecionado,
  socket,
  operationalUser,
  assinaDigitalmente,
  pscAuthStatus,
  onPscAuth,
}: AtendimentoModalExamesProps) => {
  const user = useUser();
  const effectiveUser = operationalUser ?? getCurrentUser() ?? user;
  const { executarAtendimentoAcao } = useSchedulingEntityManager([]);
  const [exameParaAtualizar, setExameParaAtualizar] = useState<ExamRegister[]>(
    [],
  );
  const [examesCatalog, setExamesCatalog] = useState<IExame[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [entrevistaPsico, setEntrevistaPsico] = useState<boolean>(false);

  // Carrega catálogo de exames para identificação de templates
  useEffect(() => {
    if (isOpen) {
      setIsLoadingCatalog(true);
      fetchExames()
        .then((data) => {
          setExamesCatalog(data);
          setIsLoadingCatalog(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoadingCatalog(false);
        });
    }
  }, [isOpen]);

  // Rascunho local: protege dados em caso de queda de rede
  const draftCodigosExame = useMemo(
    () => exameParaAtualizar.map((e) => e.codigoExame),
    [exameParaAtualizar],
  );
  const { saveDraft, loadDraft, clearDraft } = useExamDraft(
    funcionarioSelecionado?._id ?? null,
    draftCodigosExame,
  );

  // Formulário inicial: rascunho salvo tem prioridade sobre dado do banco
  const initialFormulario = useMemo(() => {
    const draft = loadDraft();
    if (draft) return draft;
    return exameParaAtualizar[0]?.formulario ?? undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exameParaAtualizar]);
  const [psicossocial, setPsicossocial] = useState<boolean>(false);
  const [overrideExame, setOverrideExame] = useState<string | null>(null);
  const [naoRealizadoCheck, setNaoRealizadoCheck] = useState<boolean>(false);
  const [justificativaNaoRealizado, setJustificativaNaoRealizado] = useState<string>("");
  const [notificationModal, setNotificationModal] =
    useState<NotificationModalState>({
      isOpen: false,
      type: "confirm",
      title: "",
      message: "",
      showCancel: false,
      isLoading: false,
    });

  const EXAME_FORM_MAP: Record<string, React.FC<any>> = useMemo(
    () => ({
      "Acuidade Visual": AcuidadeVisual,
      Audiometria: AudiometriaOcupacional,
      Dinamometria: Dinamometria,
      EEG: ExamePadrao,
      ECG: ExamePadrao,
      Espirometria: Espirometria,
      "Exame Clínico": FichaClinicaOcupacional,
      Psicossocial: Psicossocial,
      Triagem: FichaClinicaOcupacional,
      Ultrassom: Ultrassom,

      // Mapeamento dinâmico por template_key
      acuidade: AcuidadeVisual,
      audiometria: AudiometriaOcupacional,
      dinamometria: Dinamometria,
      espirometria: Espirometria,
      exameClinico: FichaClinicaOcupacional,
      psicossocial: Psicossocial,
      fichaAssistencial: FichaAssistencial,
      triagem: FichaClinicaOcupacional,
      ultrassom: Ultrassom,
    }),
    [],
  );

  // Efeito para resetar o overrideExame e naoRealizadoCheck quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      setOverrideExame(null);
      setNaoRealizadoCheck(false);
      setJustificativaNaoRealizado("");
    }
  }, [isOpen]);

  // Efeito para atualizar o exame a ser preenchido
  useEffect(() => {
    if (!isOpen || !funcionarioSelecionado) return;

    let targetExames = funcionarioSelecionado.EXAMES.filter((e) =>
      codigosAtendimento.has(e.codigoExame),
    );

    if (overrideExame === "Psicossocial") {
      targetExames = funcionarioSelecionado.EXAMES.filter((e) =>
        e.grupo === "Psicossocial" && e.status === ExamStatus.PENDENTE,
      );
    }

    if (targetExames.length > 0) {
      setExameParaAtualizar(targetExames);
    }

    const hasPsico = funcionarioSelecionado.EXAMES.find(
      (e) => e.grupo === "Psicossocial" && e.status === ExamStatus.PENDENTE,
    );

    if (hasPsico) {
      setPsicossocial(true);
      setEntrevistaPsico(hasPsico.preparacao?.includes("Entrevista") ?? false);
    } else {
      // Limpa os estados quando não tem Psicossocial pendente
      setPsicossocial(false);
      setEntrevistaPsico(false);
    }
  }, [codigosAtendimento, funcionarioSelecionado, isOpen, overrideExame]);

  // Função para fechar o modal de notificação
  const closeNotificationModal = useCallback(() => {
    setNotificationModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Verifica se todos os exames foram concluídos
  const verificarExamesPendentes = useCallback(
    (funcionario: Scheduling): boolean => {
      const examesPendentes = funcionario.EXAMES.filter(
        (e) =>
          e.status === ExamStatus.PENDENTE &&
          !codigosAtendimento.has(e.codigoExame),
      );

      return examesPendentes.length === 0;
    },
    [codigosAtendimento],
  );

  // Processa a atualização do exame
  const processarAtualizacaoExame = useCallback(
    async (data: any) => {
      if (!funcionarioSelecionado) return;

      setNotificationModal((prev) => ({ ...prev, isLoading: true }));

      try {
        const codigosParaAtualizar = Array.isArray(data?.examesRealizados)
          ? funcionarioSelecionado.EXAMES
              .filter((ex) =>
                data.examesRealizados.some(
                  (er: any) =>
                    er.codigoExame === ex.codigoExame ||
                    (ex.sequencialResultadoExame &&
                      String(er.sequencialResultadoExame) === String(ex.sequencialResultadoExame)),
                ),
              )
              .map((ex) => ex.codigoExame)
          : exameParaAtualizar.map((e) => e.codigoExame);

        const response = await fetch("/api/schedulings/exame/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            funcionarioId: funcionarioSelecionado._id,
            codigoExame: codigosParaAtualizar,
            formulario: data,
            sala: sala,
            profissional: effectiveUser ?? undefined,
          }),
        });

        const result: Scheduling = await response.json();

        if (!response.ok) {
          throw new Error("Erro ao atualizar exame");
        }

        // Limpa rascunho após envio bem-sucedido
        clearDraft();

        // Retorna o ticket
        executarAtendimentoAcao(
          funcionarioSelecionado._id,
          funcionarioSelecionado.TICKET.id,
          TicketActionType.RETORNAR,
          funcionarioSelecionado.UNIDADEATENDIMENTO,
          socket,
        );

        // Verifica se todos os exames foram concluídos
        const todosExamesConcluidos = verificarExamesPendentes(result);

        // --- ALTERAÇÃO: REMOVIDA A VERIFICAÇÃO DO LEMBRETE PSC DAQUI ---
        // O aviso agora é exibido apenas no início (botão Conectar)

        const successMessage = todosExamesConcluidos
          ? "Concluído, pode LIBERAR o funcionário."
          : "Funcionário deve AGUARDAR demais exames.";

        const isEcgOrEeg = exameParaAtualizar.some(
          (e) => e.codigoExame === "20.01.001-0" || e.codigoExame === "22010017",
        );

        if (isEcgOrEeg && psicossocial) {
          setNotificationModal({
            isOpen: true,
            type: "confirm",
            title: "Iniciar Psicossocial?",
            message: "Exame concluído com sucesso. Este funcionário possui a Avaliação Psicossocial pendente. Deseja preencher o questionário psicossocial agora?",
            showCancel: true,
            onConfirm: () => {
              closeNotificationModal();
              setOverrideExame("Psicossocial");
            },
            onCancel: () => {
              closeNotificationModal();
              onClose();
            },
          });
        } else {
          setNotificationModal({
            isOpen: true,
            type: "success",
            title: "Exame Concluído",
            message: successMessage,
            showCancel: false,
            isLoading: false,
            onConfirm: () => {
              closeNotificationModal();
              onClose();
            },
          });
        }
      } catch (error) {
        setNotificationModal({
          isOpen: true,
          type: "error",
          title: "Erro",
          message: `Não foi possível atualizar o exame. ${error instanceof Error ? error.message : "Tente novamente."}`,
          showCancel: false,
          isLoading: false,
          onConfirm: closeNotificationModal,
        });
      }
    },
    [
      funcionarioSelecionado,
      exameParaAtualizar,
      sala,
      effectiveUser,
      executarAtendimentoAcao,
      socket,
      verificarExamesPendentes,
      closeNotificationModal,
      onClose,
      clearDraft,
    ],
  );

  /**
   * Função para salvar os dados do exame preenchido
   */
  const handleSaveExam = useCallback(
    async (data: any) => {
      if (!funcionarioSelecionado) return;

      // Salva rascunho antes de processar (proteção contra queda de rede na confirmação)
      saveDraft(data);

      const isValidExamData = (data: any) => {
        return data && typeof data === "object" && Object.keys(data).length > 0;
      };

      if (!isValidExamData(data)) {
        setNotificationModal({
          isOpen: true,
          type: "error",
          title: "✗ Dados Inválidos",
          message:
            "Os dados do exame estão incompletos ou inválidos. Verifique o preenchimento.",
          showCancel: false,
          onConfirm: closeNotificationModal,
        });

        return;
      }

      if (!exameParaAtualizar || exameParaAtualizar.length === 0) {
        setNotificationModal({
          isOpen: true,
          type: "error",
          title: "✗ Erro",
          message: "Exame não encontrado para atualização.",
          showCancel: false,
          onConfirm: closeNotificationModal,
        });

        return;
      }

      // Modal de confirmação
      setNotificationModal({
        isOpen: true,
        type: "confirm",
        title: "Confirmar Conclusão",
        message: "Deseja confirmar a conclusão deste exame?",
        showCancel: true,
        onConfirm: () => {
          processarAtualizacaoExame(data);
        },
        onCancel: closeNotificationModal,
      });
    },
    [
      funcionarioSelecionado,
      exameParaAtualizar,
      closeNotificationModal,
      processarAtualizacaoExame,
    ],
  );

  const handleSaveNaoRealizado = useCallback(async () => {
    if (!justificativaNaoRealizado.trim()) {
      setNotificationModal({
        isOpen: true,
        type: "error",
        title: "✗ Erro",
        message: "Por favor, insira o motivo da não realização do exame.",
        showCancel: false,
        onConfirm: closeNotificationModal,
      });
      return;
    }

    setNotificationModal({
      isOpen: true,
      type: "confirm",
      title: "Confirmar Não Realização",
      message: "Deseja confirmar que este exame NÃO foi realizado?",
      showCancel: true,
      onConfirm: async () => {
        const payload = {
          status: "concluded",
          anotacoes: justificativaNaoRealizado,
          examesRealizados: exameParaAtualizar.map((ex) => ({
            codigoExame: ex.codigoExame,
            sequencialResultadoExame: ex.sequencialResultadoExame,
            realizado: false,
          })),
        };
        await processarAtualizacaoExame(payload);
      },
      onCancel: closeNotificationModal,
    });
  }, [justificativaNaoRealizado, exameParaAtualizar, closeNotificationModal, processarAtualizacaoExame]);

  const templateKey = useMemo(() => {
    if (
      !exameParaAtualizar ||
      exameParaAtualizar.length === 0 ||
      !examesCatalog ||
      examesCatalog.length === 0
    ) {
      return null;
    }
    const currentExamReg = exameParaAtualizar[0];
    const match = examesCatalog.find(
      (e) =>
        e.codigos.includes(currentExamReg.codigoExame) ||
        e.nome === currentExamReg.nomeExame,
    );
    return match?.template_key || null;
  }, [exameParaAtualizar, examesCatalog]);

  const Formulario = useMemo(() => {
    if (!funcionarioSelecionado) return null;

    return AtendimentoRules.resolveFormulario({
      exame: overrideExame || exame,
      funcionario: funcionarioSelecionado,
      forms: {
        EXAME_FORM_MAP,
        KitAtendimento,
        FichaClinicaWhirlpool,
      },
      templateKey,
    });
  }, [exame, overrideExame, funcionarioSelecionado, EXAME_FORM_MAP, templateKey]);

  // Renderiza o modal de notificação
  const renderNotificationModal = () => {
    const { type, title, message, showCancel, onConfirm, onCancel, isLoading } =
      notificationModal;

    const getModalColors = () => {
      switch (type) {
        case "confirm":
          return {
            header: "bg-gradient-to-r from-[#44735e] to-[#5a8c7a]",
            button:
              "bg-gradient-to-r from-[#44735e] to-[#5a8c7a] hover:opacity-90",
            icon: "",
          };
        case "success":
          return {
            header: "bg-gradient-to-r from-[#44735e] to-[#5a8c7a]",
            button:
              "bg-gradient-to-r from-[#44735e] to-[#5a8c7a] hover:opacity-90",
            icon: "",
          };
        case "error":
          return {
            header: "bg-[#2a4a3a]",
            button: "bg-[#44735e] hover:bg-[#2a4a3a]",
            icon: "",
          };
      }
    };

    const colors = getModalColors();

    return (
      <Modal
        backdrop="blur"
        classNames={{
          base: "border-none shadow-2xl",
          backdrop: "bg-black/50",
        }}
        disableAnimation={true}
        hideCloseButton={!showCancel || isLoading}
        isDismissable={showCancel && !isLoading}
        isOpen={notificationModal.isOpen}
        size="md"
        onClose={showCancel ? closeNotificationModal : undefined}
      >
        <ModalContent>
          <ModalHeader
            className={`flex flex-col gap-1 ${colors.header} text-white rounded-t-lg`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{colors.icon}</span>
              <span className="text-lg font-semibold">{title}</span>
            </div>
          </ModalHeader>
          <ModalBody className="py-6 px-6">
            <p className="text-base text-gray-700 leading-relaxed">{message}</p>
          </ModalBody>
          <ModalFooter className="px-6 pb-6">
            {isLoading ? (
              <div className="w-full flex justify-center">
                <Spinner color="success" size="md" />
              </div>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                {showCancel && (
                  <Button
                    className="flex-1 sm:flex-initial font-medium text-[#2a4a3a] hover:bg-[#e8f4e3]"
                    color="default"
                    variant="flat"
                    onPress={onCancel}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  className={`${colors.button} text-white flex-1 sm:flex-initial font-medium focus-visible:ring-2 focus-visible:ring-[#44735e]/40`}
                  onPress={onConfirm}
                >
                  {type === "confirm" ? "Confirmar" : "Entendido"}
                </Button>
              </div>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  const currentFormulario = useMemo(() => {
    return initialFormulario;
  }, [initialFormulario]);

  // Protege contra mapeamento inexistente
  if (isLoadingCatalog) {
    return (
      <Modal
        backdrop="blur"
        classNames={{
          wrapper: "z-[1000]",
          backdrop: "z-[1000]",
        }}
        disableAnimation={true}
        isOpen={isOpen}
        size="2xl"
        onClose={onClose}
      >
        <ModalContent className="border border-[#44735e]/20">
          <ModalHeader className="bg-gradient-to-r from-[#104e35] to-[#0d3d29] text-white">
            Carregando formulário...
          </ModalHeader>
          <ModalBody className="py-8">
            <div className="flex justify-center items-center">
              <Spinner color="success" size="lg" />
              <span className="ml-4">Carregando dados do exame...</span>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const isSpecializedForm = Formulario && Formulario !== ExamePadrao;

  if (!Formulario) {
    return (
      <>
        <Modal
          backdrop="blur"
          disableAnimation={true}
          isOpen={isOpen}
          scrollBehavior="outside"
          size="5xl"
          onClose={onClose}
        >
          <ModalContent>
            <ExamePadrao
              atendimento={funcionarioSelecionado}
              exame={overrideExame || exame}
              formulario={""}
              onClose={onClose}
              onSave={handleSaveExam}
            />
          </ModalContent>
        </Modal>
        {renderNotificationModal()}
      </>
    );
  }

  return (
    <>
      <Modal
        backdrop="blur"
        disableAnimation={true}
        isOpen={isOpen}
        scrollBehavior="outside"
        size="5xl"
        onClose={onClose}
      >
        <ModalContent>


          {naoRealizadoCheck && isSpecializedForm ? (
            <div className="flex flex-col min-h-[400px]">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {(overrideExame || exame).toUpperCase()} - NÃO REALIZADO
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Paciente: {funcionarioSelecionado?.NOME}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 space-y-4 bg-white">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  Ao marcar este exame como não realizado, o formulário médico/técnico será desativado e o status do exame será gravado como <strong>NÃO REALIZADO</strong>.
                </div>
                <Textarea
                  label="Justificativa / Motivo da não realização"
                  placeholder="Descreva detalhadamente o motivo pelo qual o exame não foi realizado..."
                  minRows={4}
                  value={justificativaNaoRealizado}
                  onValueChange={setJustificativaNaoRealizado}
                  isRequired
                />
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                <Button
                  variant="flat"
                  color="default"
                  onPress={() => setNaoRealizadoCheck(false)}
                >
                  Voltar ao Formulário
                </Button>
                <Button
                  color="danger"
                  onPress={handleSaveNaoRealizado}
                >
                  Confirmar Não Realização
                </Button>
              </div>
            </div>
          ) : (
            <Formulario
              atendimento={funcionarioSelecionado}
              exame={overrideExame || exame}
              formulario={initialFormulario}
              operationalUser={effectiveUser}
              onClose={onClose}
              onSave={handleSaveExam}
            />
          )}
        </ModalContent>
      </Modal>
      {renderNotificationModal()}
    </>
  );
};

export default AtendimentoModalExames;
