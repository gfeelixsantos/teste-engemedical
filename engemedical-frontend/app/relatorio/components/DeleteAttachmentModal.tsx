import React from "react";

import DeleteConfirmationModal from "./DeleteConfirmationModal";

import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface DeleteAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  examName: string;
  examGrupo: string;
  atendimentoId: string;
  onSuccess: (updatedScheduling?: Scheduling) => void;
}

const DeleteAttachmentModal: React.FC<DeleteAttachmentModalProps> = ({
  isOpen,
  onClose,
  examId,
  examName,
  examGrupo,
  atendimentoId,
  onSuccess,
}) => {
  const handleDelete = async ({
    password,
    motivo,
  }: {
    password: string;
    motivo: string;
  }) => {
    const response = await fetch("/api/schedulings/delete-attachment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedulingId: atendimentoId,
        codigoExame: examId,
        grupo: examGrupo,
        motivo,
        password,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[DeleteAttachmentModal] Erro do backend:", payload?.message);
      throw new Error("Erro ao remover resultado.");
    }

    if (payload?.scheduling) {
      onSuccess(payload.scheduling);
    } else {
      onSuccess();
    }

    return {
      requestId: payload?.requestId,
    };
  };

  return (
    <DeleteConfirmationModal
      confirmButtonText="Remover resultado"
      confirmDescription={
        <span>
          Tem certeza que deseja remover o resultado do exame{" "}
          <strong>{examName}</strong>?
          <br />
          <span className="text-red-500 font-semibold text-xs mt-1 block">
            O exame voltará a ficar pendente de resultado.
          </span>
        </span>
      }
      confirmTitle="Remover resultado"
      isOpenModalDelete={isOpen}
      loadingMessage="Validando sua senha e removendo o resultado do exame..."
      loadingTitle="Removendo resultado"
      motivoPlaceholder="Explique por que o resultado está sendo removido"
      onCloseModalDelete={onClose}
      onConfirm={handleDelete}
      successMessage="Resultado removido com sucesso."
      successTitle="Resultado removido"
    />
  );
};

export default React.memo(DeleteAttachmentModal);
