// ============================================
// COMPONENTE: ExamUploadModal

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { Upload, Paperclip, AlertCircle, CheckCircle } from "lucide-react";
import React, { useState } from "react";

import SelectedFilesList, { SelectedFile } from "./SelectedFilesList";

import {
  ExamRegister,
  Scheduling,
} from "@/lib/scheduling/interface/scheduling";
import { NEST_SCHEDULINGS_UPDATE_EXAM_RESULT } from "@/config/constants";

// ============================================
const ExamUploadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  exame: ExamRegister;
  atendimento: Scheduling;
  onUploadSuccess: (updatedScheduling: Scheduling) => void;
}> = ({ isOpen, onClose, exame, atendimento, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const generateFileId = () =>
    `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files) return;

    const newFiles: SelectedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        setUploadError(
          `Arquivo inválido: ${file.name}. Apenas PDFs são permitidos.`,
        );
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadError(
          `Arquivo muito grande: ${file.name}. Tamanho máximo: 10MB.`,
        );
        continue;
      }

      const isDuplicate = selectedFiles.some(
        (f) => f.file.name === file.name && f.file.size === file.size,
      );

      if (!isDuplicate) {
        newFiles.push({
          id: generateFileId(),
          file,
          progress: 0,
          uploaded: false,
        });
      }
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setUploadError("");
    }

    event.target.value = "";
  };

  const handleRemoveFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setUploadError("");
  };

  const updateFileProgress = (fileId: string, progress: number) => {
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, progress } : f)),
    );
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError("Selecione pelo menos um arquivo PDF ou imagem.");

      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess(false);

    try {
      const formData = new FormData();

      formData.append("schedulingid", atendimento._id);
      formData.append("grupo", exame.grupo || "");
      formData.append("codigoExame", exame.codigoExame);

      selectedFiles.forEach((file) => {
        formData.append("files", file.file);
      });

      selectedFiles.forEach((file) => {
        updateFileProgress(file.id, 30);
      });

      const response = await fetch(NEST_SCHEDULINGS_UPDATE_EXAM_RESULT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ExamUploadModal] Erro do backend:", errorText);
        throw new Error("Falha no upload. Verifique o arquivo e tente novamente.");
      }

      const updatedScheduling: Scheduling = await response.json();

      selectedFiles.forEach((file) => {
        updateFileProgress(file.id, 100);
      });

      setSelectedFiles((prev) => prev.map((f) => ({ ...f, uploaded: true })));

      setUploadSuccess(true);
      onUploadSuccess(updatedScheduling);

      setTimeout(() => {
        onClose();
        setSelectedFiles([]);
        setUploadSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error("Erro no upload:", error);
      setUploadError(error.message || "Falha no upload. Tente novamente.");

      setSelectedFiles((prev) =>
        prev.map((f) => ({ ...f, progress: 0, error: error.message })),
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        wrapper: "z-[1000]",
        backdrop: "z-[1000]",
      }}
      isOpen={isOpen}
      size="xl"
      onClose={onClose}
    >
      <ModalContent className="border border-[#104e35]/20">
        <ModalHeader className="flex flex-col gap-1 text-[#104e35] border-b border-[#104e35]/15">
          <div className="flex items-center gap-2">
            <Upload className="text-[#104e35]" size={20} />
            <p>Envio de Resultado </p>
          </div>
          <p className="text-sm text-[#104e35]">{exame.nomeExame}</p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="text-gray-500" size={16} />
                  <span className="text-sm font-medium text-gray-700">
                    Selecionar PDFs ou Imagens
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    multiple
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                    disabled={isUploading}
                    id="file-input-modal"
                    type="file"
                    onChange={handleFileSelect}
                  />
                  <label
                    className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border ${
                      isUploading
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                        : "bg-[#e8f4e3] text-[#44735e] hover:bg-[#d9ebd1] border-[#b8d864]"
                    }`}
                    htmlFor="file-input-modal"
                  >
                    <Upload size={14} />
                    Selecionar Arquivos
                  </label>
                </div>
              </div>

              <SelectedFilesList
                files={selectedFiles}
                isUploading={isUploading}
                onRemove={handleRemoveFile}
              />

              {uploadError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg mt-3">
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle size={14} />
                    <span>{uploadError}</span>
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg mt-3">
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle size={14} />
                    <span>
                      Upload realizado! A janela será fechada em instantes...
                    </span>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 mt-3">
                <p>• Selecione um ou mais arquivos PDF (múltipla seleção)</p>
                <p>• Tamanho máximo por arquivo: 10MB</p>
                <p>• Os arquivos serão mesclados em um único PDF</p>
                <p>• Você pode remover arquivos antes de enviar</p>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-[#104e35]/15">
          <Button
            className="text-[#104e35] hover:bg-[#e8f4e3]"
            disabled={isUploading}
            variant="light"
            onPress={onClose}
          >
            Cancelar
          </Button>
          <Button
            className="bg-gradient-to-r from-[#104e35] to-[#0d3d29] text-white focus-visible:ring-2 focus-visible:ring-[#104e35]/40"
            disabled={selectedFiles.length === 0 || isUploading}
            isLoading={isUploading}
            startContent={<Upload size={16} />}
            variant="solid"
            onPress={handleUpload}
          >
            Enviar ({selectedFiles.length})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default React.memo(ExamUploadModal);
