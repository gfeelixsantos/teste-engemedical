import { Button, Spinner } from "@heroui/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { CheckCircle, Printer, AlertCircle } from "lucide-react";
import React from "react";

import { ExamRegister } from "@/lib/scheduling/interface/scheduling";

type ReemitStatus = "preparing" | "loading" | "success" | "error";

interface ReemitExameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  exame: ExamRegister | null;
}

const ReemitExameModal: React.FC<ReemitExameModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  exame,
}) => {
  const [status, setStatus] = React.useState<ReemitStatus>("preparing");
  const [errorMessage, setErrorMessage] = React.useState<string>("");

  React.useEffect(() => {
    if (isOpen) {
      setStatus("preparing");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      await onConfirm();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(String(error));
    }
  };

  const handleClose = () => {
    setStatus("preparing");
    setErrorMessage("");
    onClose();
  };

  const renderContent = () => {
    switch (status) {
      case "preparing":
        return (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white">
              Reemitir Exame
            </ModalHeader>
            <ModalBody className="py-5">
              <div className="mt-2 text-sm text-gray-700">
                <p>
                  Deseja reemitir o exame <strong>{exame?.nomeExame}</strong>?
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="border-t border-[#104e35]/15">
              <Button
                className="text-[#104e35] hover:bg-[#e8f4e3]"
                color="default"
                variant="light"
                onPress={handleClose}
              >
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-[#104e35] to-[#0d3d29] text-white focus-visible:ring-2 focus-visible:ring-[#104e35]/40"
                startContent={<Printer size={16} />}
                variant="solid"
                onPress={handleConfirm}
              >
                Reemitir
              </Button>
            </ModalFooter>
          </>
        );

      case "loading":
        return (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white">
              Reemitindo Exame
            </ModalHeader>
            <ModalBody className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Spinner color="success" size="lg" />
                <p className="text-sm text-gray-600 text-center">
                  Preparando reemissão do exame...
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
              Reemissão Concluída
            </ModalHeader>
            <ModalBody className="py-8">
              <div className="flex flex-col items-center gap-4">
                <CheckCircle className="text-green-500" size={48} />
                <p className="text-sm text-gray-700 text-center font-medium">
                  Reemissão enviada com sucesso!
                </p>
                <p className="text-xs text-gray-500 text-center">
                  Os dados do atendimento serão atualizados automaticamente.
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="border-t border-[#104e35]/20 justify-center">
              <Button
                className="bg-gradient-to-r from-[#104e35] to-[#0d3d29] text-white"
                variant="solid"
                onPress={handleClose}
              >
                OK
              </Button>
            </ModalFooter>
          </>
        );

      case "error":
        return (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-red-600 to-red-500 text-white">
              Erro na Reemissão
            </ModalHeader>
            <ModalBody className="py-8">
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="text-red-500" size={48} />
                <p className="text-sm text-gray-700 text-center font-medium">
                  Ocorreu um erro ao reemitir o exame
                </p>
                <p className="text-xs text-red-500 text-center max-w-full break-words px-4">
                  {errorMessage || "Tente novamente mais tarde."}
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="border-t border-red-200 justify-center gap-2">
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
                startContent={<Printer size={16} />}
                variant="solid"
                onPress={handleConfirm}
              >
                Tentar Novamente
              </Button>
            </ModalFooter>
          </>
        );
    }
  };

  return (
    <Modal
      aria-describedby="reemit-confirmation-description"
      aria-labelledby="reemit-confirmation-title"
      backdrop="blur"
      classNames={{
        base: "z-[1000]",
        wrapper: "z-[1000]",
        backdrop: "z-[1000] bg-black/50 backdrop-blur-sm",
      }}
      isDismissable={status === "preparing"}
      isOpen={isOpen}
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
      onClose={status === "preparing" ? handleClose : () => {}}
    >
      <ModalContent className="border border-[#104e35]/20">
        {renderContent()}
      </ModalContent>
    </Modal>
  );
};

export default React.memo(ReemitExameModal);
