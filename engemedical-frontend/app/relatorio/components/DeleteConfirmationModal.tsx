import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
  Textarea,
} from "@heroui/react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Key,
  Trash,
} from "lucide-react";
import React, { useEffect, useState } from "react";

type DeleteStatus = "confirm" | "loading" | "success" | "error";

type DeleteResult = {
  requestId?: string;
};

interface DeleteConfirmationModalProps {
  isOpenModalDelete: boolean;
  onCloseModalDelete: () => void;
  onConfirm: (input: {
    password: string;
    motivo: string;
  }) => Promise<DeleteResult | void>;
  onDeleteSuccess?: () => void;
  confirmTitle?: string;
  confirmDescription: React.ReactNode;
  passwordLabel?: string;
  motivoLabel?: string;
  motivoPlaceholder?: string;
  confirmButtonText?: string;
  loadingTitle?: string;
  loadingMessage?: string;
  successTitle?: string;
  successMessage?: string;
  retryMessage?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpenModalDelete,
  onCloseModalDelete,
  onConfirm,
  onDeleteSuccess,
  confirmTitle = "Confirmar exclusão",
  confirmDescription,
  passwordLabel = "Senha de login",
  motivoLabel = "Motivo da exclusão",
  motivoPlaceholder = "Descreva brevemente o motivo",
  confirmButtonText = "Confirmar exclusão",
  loadingTitle = "Processando exclusão",
  loadingMessage = "Validando sua senha e processando a exclusão...",
  successTitle = "Exclusão concluída",
  successMessage = "Excluído com sucesso.",
  retryMessage = "Ocorreu um erro ao processar a exclusão.",
}) => {
  const [password, setPassword] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<DeleteStatus>("confirm");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    if (isOpenModalDelete) {
      setStatus("confirm");
      setPassword("");
      setMotivo("");
      setError("");
      setErrorMessage("");
      setIsCapsLockOn(false);
      setRequestId("");
    }
  }, [isOpenModalDelete]);

  useEffect(() => {
    if (status !== "success") return;

    const timeoutId = window.setTimeout(() => {
      onCloseModalDelete();
      onDeleteSuccess?.();
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status, onCloseModalDelete, onDeleteSuccess]);

  const handleCapsLockCheck = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    setIsCapsLockOn(event.getModifierState("CapsLock"));
  };

  const handleConfirm = async () => {
    if (!motivo.trim()) {
      setError("O motivo é obrigatório.");
      return;
    }

    if (!password.trim()) {
      setError("A senha de login é obrigatória.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const result = await onConfirm({
        password,
        motivo,
      });

      setPassword("");
      setRequestId(result?.requestId || "");
      setStatus("success");
    } catch (err: any) {
      setPassword("");
      setStatus("error");
      setErrorMessage(err?.message || retryMessage);
    }
  };

  const handleClose = () => {
    setStatus("confirm");
    setPassword("");
    setMotivo("");
    setError("");
    setErrorMessage("");
    setIsCapsLockOn(false);
    setRequestId("");
    onCloseModalDelete();
  };

  const renderContent = () => {
    switch (status) {
      case "confirm":
        return (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-red-600 to-red-500 text-white">
              <div className="flex items-center gap-2">
                <Trash size={20} />
                <span className="text-lg font-semibold">{confirmTitle}</span>
              </div>
            </ModalHeader>
            <ModalBody className="py-5">
              <div className="mt-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 text-red-500" size={18} />
                  <div>{confirmDescription}</div>
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {motivoLabel}
                </label>
                <Textarea
                  isInvalid={!!error && !motivo.trim()}
                  minRows={3}
                  placeholder={motivoPlaceholder}
                  value={motivo}
                  onValueChange={(value) => {
                    setMotivo(value);
                    setError("");
                  }}
                />
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {passwordLabel}
                </label>
                <Input
                  endContent={<Key className="text-gray-400" size={20} />}
                  errorMessage={error}
                  isInvalid={!!error && !password.trim()}
                  placeholder="Digite sua senha"
                  type="password"
                  value={password}
                  onBlur={() => setIsCapsLockOn(false)}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleCapsLockCheck}
                  onKeyUp={handleCapsLockCheck}
                />
                {isCapsLockOn ? (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle size={14} />
                    <span>Caps Lock ativo</span>
                  </div>
                ) : null}
              </div>
            </ModalBody>
            <ModalFooter className="border-t border-red-200">
              <Button
                className="text-red-600 hover:bg-red-50"
                color="default"
                variant="light"
                onPress={handleClose}
              >
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-red-600 to-red-500 text-white"
                startContent={<Trash size={16} />}
                variant="solid"
                onPress={handleConfirm}
              >
                {confirmButtonText}
              </Button>
            </ModalFooter>
          </>
        );

      case "loading":
        return (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-red-600 to-red-500 text-white">
              <div className="flex items-center gap-2">
                <Trash size={20} />
                <span className="text-lg font-semibold">{loadingTitle}</span>
              </div>
            </ModalHeader>
            <ModalBody className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Spinner color="danger" size="lg" />
                <p className="text-center text-sm text-gray-600">
                  {loadingMessage}
                </p>
              </div>
            </ModalBody>
            <ModalFooter />
          </>
        );

      case "success":
        return (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-green-600 to-green-500 text-white">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} />
                <span className="text-lg font-semibold">{successTitle}</span>
              </div>
            </ModalHeader>
            <ModalBody className="py-8">
              <div className="flex flex-col items-center gap-4">
                <CheckCircle className="text-green-500" size={48} />
                <p className="text-center text-sm font-medium text-gray-700">
                  {successMessage}
                </p>
                <p className="text-center text-xs text-gray-500">
                  Fechando automaticamente...
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="border-t border-[#104e35]/20" />
          </>
        );

      case "error":
        return (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-red-600 to-red-500 text-white">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} />
                <span className="text-lg font-semibold">Erro na exclusão</span>
              </div>
            </ModalHeader>
            <ModalBody className="py-8">
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="text-red-500" size={48} />
                <p className="text-center text-sm font-medium text-gray-700">
                  {retryMessage}
                </p>
                <p className="max-w-full break-words px-4 text-center text-xs text-red-500">
                  {errorMessage || "Tente novamente mais tarde."}
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="justify-center gap-2 border-t border-red-200">
              <Button
                className="text-red-600 hover:bg-red-50"
                color="default"
                variant="light"
                onPress={handleClose}
              >
                Fechar
              </Button>
              <Button
                className="bg-gradient-to-r from-red-600 to-red-500 text-white"
                startContent={<Trash size={16} />}
                variant="solid"
                onPress={handleConfirm}
              >
                Tentar novamente
              </Button>
            </ModalFooter>
          </>
        );
    }
  };

  return (
    <Modal
      aria-describedby="delete-confirmation-description"
      aria-labelledby="delete-confirmation-title"
      backdrop="blur"
      classNames={{
        base: "z-[1000]",
        wrapper: "z-[1000]",
        backdrop: "z-[1000] bg-black/50 backdrop-blur-sm",
      }}
      isDismissable={status === "confirm"}
      isOpen={isOpenModalDelete}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
      shouldBlockScroll={false}
      size="md"
      style={{
        position: "fixed",
      }}
      onClose={status === "confirm" ? handleClose : () => {}}
    >
      <ModalContent className="border border-red-300">
        {renderContent()}
      </ModalContent>
    </Modal>
  );
};

export default React.memo(DeleteConfirmationModal);
