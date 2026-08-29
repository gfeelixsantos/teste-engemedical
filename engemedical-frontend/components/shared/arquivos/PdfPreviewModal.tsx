"use client";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";
import { Download, ExternalLink, X } from "lucide-react";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sasUrl: string | null;
  fileName: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onOpenChange,
  sasUrl,
  fileName,
}) => {
  if (!sasUrl) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: "h-[90vh]",
        body: "p-0",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex justify-between items-center bg-default-100 py-3">
              <div className="flex flex-col">
                <span className="text-md font-semibold truncate max-w-lg">{fileName}</span>
                <span className="text-xs text-default-500">Visualização de PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  as="a"
                  href={sasUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  as="a"
                  href={sasUrl}
                  download={fileName}
                  title="Baixar arquivo"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="h-full w-full flex-1 bg-default-200">
                <iframe
                  src={`${sasUrl}#toolbar=0&navpanes=0`}
                  title={fileName}
                  className="h-full w-full border-none"
                />
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
