// ============================================
// COMPONENTE: ExamEditModal
// ============================================

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Spinner,
  ModalFooter,
  Button,
} from "@heroui/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AtendimentoRules } from "@/app/atendimento/components/AtendimentoRules";
import AcuidadeVisual from "@/app/atendimento/components/exames/AcuidadeVisual";
import AudiometriaOcupacional from "@/app/atendimento/components/exames/AudiometriaOcupacional";
import Dinamometria from "@/app/atendimento/components/exames/Dinamometria";
import Espirometria from "@/app/atendimento/components/exames/Espirometria";
import ExamePadrao from "@/app/atendimento/components/exames/ExamePadrao";
import FichaClinicaOcupacional from "@/app/atendimento/components/exames/FichaClinicaOcupacional";
import FichaClinicaWhirlpool from "@/app/atendimento/components/exames/FichaClinicaWhirlpool";
import FichaAssistencial from "@/app/atendimento/components/exames/FichaAssistencial";
import KitAtendimento from "@/app/atendimento/components/exames/KitAtendimento";
import Psicossocial from "@/app/atendimento/components/exames/Psicossocial";
import Ultrassom from "@/app/atendimento/components/exames/Ultrassom";
import { fetchExames, IExame } from "@/lib/exames/services/exames.service";
import { ExamStatus } from "@/lib/scheduling/enum/scheduling.enum";
import {
  ExamRegister,
  Scheduling,
} from "@/lib/scheduling/interface/scheduling";
import { IUserInfo, useUser } from "@/hooks/useUser";

// ============================================
interface ExamEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  exame: ExamRegister;
  atendimento: Scheduling;
  operationalUser?: IUserInfo | null;
}
const ExamEditModal: React.FC<ExamEditModalProps> = ({
  isOpen,
  onClose,
  exame,
  atendimento,
  operationalUser,
}) => {
  const user = useUser();
  const effectiveUser = operationalUser ?? user;
  const [formData, setFormData] = useState<any>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(true);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [examesCatalog, setExamesCatalog] = useState<IExame[]>([]);
  // Estado para modal de alerta
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    type: "success" | "error" | "warning";
    message: string;
  }>({ open: false, type: "warning", message: "" });

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

  // Estados para lógica de Psicossocial (mesma do AtendimentoModalExames)
  const [entrevistaPsico, setEntrevistaPsico] = useState<boolean>(false);
  const [psicossocial, setPsicossocial] = useState<boolean>(false);

  // Inicializar dados do formulário
  useEffect(() => {
    if (isOpen && exame?.formulario) {
      try {
        // Se o formulário for uma string JSON, parse
        if (typeof exame.formulario === "string") {
          const parsedData = JSON.parse(exame.formulario);

          setFormData(parsedData);
        } else {
          setFormData(exame.formulario);
        }
        setIsLoadingForm(false);

        // Verificar se é Psicossocial com entrevista (mesma lógica do AtendimentoModalExames)
        if (
          exame.grupo === "Psicossocial" &&
          exame.status === ExamStatus.PENDENTE
        ) {
          setPsicossocial(true);
          setEntrevistaPsico(exame.preparacao?.includes("Entrevista") || false);
        } else {
          setPsicossocial(false);
          setEntrevistaPsico(false);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do formulário:", error);
        setFormData({});
        setIsLoadingForm(false);
      }
    }
  }, [isOpen, exame]);

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
    [entrevistaPsico, psicossocial],
  );

  const templateKey = useMemo(() => {
    if (!exame || !examesCatalog || examesCatalog.length === 0) {
      return null;
    }
    const match = examesCatalog.find(
      (e) =>
        e.codigos.includes(exame.codigoExame) ||
        e.nome === exame.nomeExame,
    );
    return match?.template_key || null;
  }, [exame, examesCatalog]);

  // Determinar qual formulário renderizar (MESMA LÓGICA do AtendimentoModalExames)
  const Formulario = useMemo(() => {
    if (!exame || !atendimento) return null;

    return AtendimentoRules.resolveFormulario({
      exame: exame.grupo || exame.nomeExame || "Exame",
      funcionario: atendimento,
      forms: {
        EXAME_FORM_MAP,
        KitAtendimento,
        FichaClinicaWhirlpool,
      },
      templateKey,
    });
  }, [exame, atendimento, EXAME_FORM_MAP, templateKey]);

  // Função para validar dados (MESMA LÓGICA do AtendimentoModalExames)
  const isValidExamData = (data: any): boolean => {
    return data && typeof data === "object" && Object.keys(data).length > 0;
  };

  /**
   * Função para salvar os dados do exame preenchido
   * Versão simplificada - apenas salva e fecha
   */
  const handleSaveExam = useCallback(
    async (data: any) => {
      if (!atendimento) {
        setError("Funcionário não selecionado");

        return;
      }

      if (!isValidExamData(data)) {
        setError(
          "Os dados do exame estão incompletos ou inválidos. Verifique o preenchimento.",
        );

        return;
      }

      if (!exame || !exame.codigoExame) {
        setError("Exame não encontrado para atualização.");

        return;
      }

      setIsSaving(true);
      setError("");

      try {
        const response = await fetch("/api/schedulings/exame/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            funcionarioId: atendimento._id,
            codigoExame: [exame.codigoExame],
            formulario: data,
            sala: exame.sala,
            profissional: effectiveUser ?? undefined,
            isEditing: true, // Flag para indicar que é edição
          }),
        });

        if (!response.ok) {
          const txt = await response.text();

          throw new Error(`Erro ao atualizar exame: ${txt}`);
        }

        const result: Scheduling = await response.json();

        if (!result) {
          setAlertModal({
            open: true,
            type: "error",
            message: "Erro ao atualizar exame.",
          });

          return;
        }

        setAlertModal({
          open: true,
          type: "success",
          message: "Exame atualizado com sucesso!",
        });

        // Fecha o modal - o componente pai fará o refetch
        onClose();
      } catch (error) {
        const errorMessage = `Não foi possível atualizar o exame. ${
          error instanceof Error ? error.message : "Tente novamente."
        }`;

        setError(errorMessage);
        console.error("Erro ao salvar exame:", error);

        // Não fecha o modal em caso de erro para que o usuário possa corrigir
      } finally {
        setIsSaving(false);
      }
    },
    [atendimento, effectiveUser, exame, onClose],
  );

  // Renderizar loading
  if (isLoadingForm || isLoadingCatalog) {
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
              <Spinner color="primary" size="lg" />
              <span className="ml-4">Carregando dados do exame...</span>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  // Se não encontrar formulário específico, usar ExamePadrao
  if (!Formulario) {
    return (
      <Modal
        backdrop="blur"
        classNames={{
          wrapper: "z-[1000]",
          backdrop: "z-[1000]",
        }}
        disableAnimation={true}
        isOpen={isOpen}
        scrollBehavior="outside"
        size="5xl"
        onClose={onClose}
      >
        <ModalContent>
          <ExamePadrao
            atendimento={atendimento}
            exame={exame.grupo || exame.nomeExame || "Exame"}
            formulario={formData || {}}
            onClose={onClose}
            onSave={handleSaveExam}
          />
        </ModalContent>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        backdrop="blur"
        classNames={{
          wrapper: "z-[1000]",
          backdrop: "z-[1000]",
        }}
        isOpen={isOpen}
        scrollBehavior="outside"
        size="5xl"
        onClose={onClose}
      >
        <ModalContent>
          <Formulario
            atendimento={atendimento}
            exame={exame.grupo || exame.nomeExame || "Exame"}
            formulario={formData || {}}
            isEditing={true}
            operationalUser={effectiveUser}
            onClose={onClose}
            onSave={handleSaveExam}
          />
        </ModalContent>
      </Modal>

      {/* Modal de erro simplificado */}
      {error && (
        <Modal isOpen={!!error} size="sm" onClose={() => setError("")}>
          <ModalContent className="border border-[#104e35]/20">
            <ModalHeader className="bg-[#104e35] text-white">
              ✗ Erro
            </ModalHeader>
            <ModalBody>
              <p className="text-red-700">{error}</p>
            </ModalBody>
            <ModalFooter className="border-t border-[#104e35]/15">
              <Button
                className="bg-gradient-to-r from-[#104e35] to-[#0d3d29] text-white focus-visible:ring-2 focus-visible:ring-[#104e35]/40"
                onPress={() => setError("")}
              >
                Fechar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

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
            <Button
              className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white"
              onPress={() => setAlertModal({ ...alertModal, open: false })}
            >
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default React.memo(ExamEditModal);
