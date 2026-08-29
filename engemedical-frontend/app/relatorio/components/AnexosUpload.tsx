import React, { useState, useRef, useCallback, DragEvent } from "react";
import {
  Button,
  Spinner,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import {
  ExternalLink,
  UploadCloud,
  FileText,
  FileImage,
  CheckCircle2,
  Trash2,
  File as FileIconLucide,
  Paperclip,
} from "lucide-react";

import { buildViewerUrl, buildDocFilename } from "@/lib/blob/blob-proxy";
import { FileUpload } from "@/lib/scheduling/interface/scheduling";

interface AnexosUploadProps {
  anexos: FileUpload[];
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (fileName: string) => void;
  isLoading?: boolean;
  maxFileSize?: number;
  allowedTypes?: string[];
}

const AnexosUpload: React.FC<AnexosUploadProps> = ({
  anexos = [],
  onUpload,
  onRemove,
  isLoading = false,
  maxFileSize = 10,
  allowedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"],
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para modal de alerta
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    type: "success" | "error" | "warning";
    message: string;
  }>({ open: false, type: "warning", message: "" });

  const processFiles = useCallback(
    async (selectedFiles: FileList | File[]) => {
      const validFiles: File[] = [];
      const newErrors: string[] = [];

      Array.from(selectedFiles).forEach((file) => {
        if (file.size > maxFileSize * 1024 * 1024) {
          newErrors.push(`- ${file.name}: Muito grande (máx ${maxFileSize}MB)`);

          return;
        }

        const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

        if (!allowedTypes.includes(fileExtension)) {
          newErrors.push(`- ${file.name}: Tipo não permitido`);

          return;
        }

        if (anexos.some((a) => a.Name === file.name)) {
          newErrors.push(`- ${file.name}: Já anexado`);

          return;
        }

        validFiles.push(file);
      });

      if (newErrors.length > 0) {
        setAlertModal({
          open: true,
          type: "error",
          message:
            "Atenção - Erro em alguns arquivos:\n\n" + newErrors.join("\n"),
        });
      }

      if (validFiles.length > 0) {
        setUploading(true);
        try {
          await onUpload(validFiles);
        } catch (error) {
          console.error("Erro ao fazer upload:", error);
          setAlertModal({
            open: true,
            type: "error",
            message: "Ocorreu um erro ao tentar enviar os arquivos.",
          });
        } finally {
          setUploading(false);
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [maxFileSize, allowedTypes, anexos, onUpload],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        processFiles(event.target.files);
      }
    },
    [processFiles],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleTriggerFileInput = useCallback(() => {
    if (!isLoading && !uploading) {
      fileInputRef.current?.click();
    }
  }, [isLoading, uploading]);

  const handleOpenAttachment = useCallback((anexo: FileUpload) => {
    if (anexo.StoragePath) {
      const displayName = anexo.Name
        ? buildDocFilename(['CMSO_ANEXO', anexo.Name.replace(/\.[^.]+$/, '')], anexo.Name.match(/\.[^.]+$/)?.[0] || '.pdf')
        : undefined;
      window.open(buildViewerUrl(anexo.StoragePath, displayName), "_blank", "noopener,noreferrer");
    } else if (anexo.Content) {
      // Convert base64 to blob and open
      const base64 = anexo.Content as string;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: anexo.Type });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getFileIcon = (fileName: string, className?: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "svg", "gif"].includes(ext || "")) {
      return <FileImage className={className || "text-green-500"} size={20} />;
    }

    if (["pdf"].includes(ext || "")) {
      return <FileText className={className || "text-green-600"} size={20} />;
    }

    return (
      <FileIconLucide className={className || "text-gray-500"} size={20} />
    );
  };

  const isBusy = isLoading || uploading;

  return (
    <div className="mt-4 flex flex-col gap-3 w-full pb-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">
            Anexos do Prontuário
          </h2>
          <p className="text-xs text-gray-500">Gerencie documentos e exames.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {/* ZONA DE ARRASTAR E SOLTAR */}
        <div className="md:col-span-1">
          <div
            className={`
              h-full min-h-[140px] relative overflow-hidden transition-all duration-300 ease-in-out border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer group text-center
              ${
                isDragging
                  ? "border-green-500 bg-green-50 scale-[1.01]"
                  : "border-gray-300 hover:border-green-500/50 hover:bg-green-50/50 bg-gray-50/50"
              }
              ${isBusy ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
            `}
            onClick={handleTriggerFileInput}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div
              className={`
              p-2.5 rounded-full mb-2 transition-colors duration-300 shadow-sm border border-gray-100 bg-white
              ${isDragging ? "text-green-600 bg-green-100 border-green-200" : "text-gray-400 group-hover:text-green-600 group-hover:bg-green-50 group-hover:border-green-100"}
            `}
            >
              {isBusy ? (
                <Spinner color="success" size="sm" />
              ) : (
                <UploadCloud size={24} strokeWidth={2} />
              )}
            </div>

            <h3
              className={`text-xs font-semibold mb-1 transition-colors ${isDragging ? "text-green-600" : "text-gray-700 group-hover:text-green-600"}`}
            >
              {isBusy
                ? "Enviando..."
                : isDragging
                  ? "Solte arquivos aqui"
                  : "Clique ou arraste"}
            </h3>

            <div className="flex flex-col gap-0.5 text-[10px] text-gray-400">
              <span>PDF, JPG, PNG, DOCX</span>
              <span>Máx {maxFileSize}MB</span>
            </div>

            <input
              ref={fileInputRef}
              multiple
              accept={allowedTypes.join(",")}
              className="hidden"
              disabled={isBusy}
              type="file"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* LISTA DE DOCUMENTOS SALVOS */}
        <div className="md:col-span-2 flex flex-col bg-white border border-gray-100 rounded-xl shadow-sm h-full min-h-[140px] max-h-[220px]">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 bg-gray-50/80 rounded-t-xl sticky top-0 z-10">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Documentos Salvos ({anexos.length})
            </h4>
            {isBusy && (
              <span className="text-[10px] text-green-600 font-semibold animate-pulse">
                Sincronizando...
              </span>
            )}
          </div>

          {anexos.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
              <Paperclip className="text-gray-300 mb-2" size={24} />
              <p className="text-sm text-gray-400 font-medium tracking-tight">
                Atendimento sem anexos
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Os documentos enviados aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="flex flex-col overflow-y-auto custom-scrollbar p-1">
              {anexos.map((anexo, index) => (
                <div
                  key={`${anexo.Name}-${index}`}
                  className="group flex flex-col p-1.5 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex-shrink-0 opacity-80">
                        {getFileIcon(anexo.Name, "text-green-600")}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p
                          className="text-sm font-semibold text-gray-700 truncate leading-tight"
                          title={anexo.Name}
                        >
                          {anexo.Name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="flex items-center gap-1 text-xs leading-none text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded uppercase">
                            <CheckCircle2 size={10} />
                            Salvo
                          </span>
                          {anexo.StoragePath && (
                            <span className="text-xs text-gray-400 truncate flex items-center gap-1">
                              • Nuvem
                            </span>
                          )}
                          {!anexo.StoragePath && anexo.Content && (
                            <span className="text-xs text-gray-400 truncate flex items-center gap-1">
                              • Local
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                          {anexo.Size > 0 && (
                            <span>{formatFileSize(anexo.Size)}</span>
                          )}
                          {anexo.Size > 0 && anexo.UploadedAt && (
                            <span>•</span>
                          )}
                          {anexo.UploadedAt && (
                            <span>{formatDate(anexo.UploadedAt)}</span>
                          )}
                          {anexo.Origin && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{anexo.Origin}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(anexo.StoragePath || anexo.Content) && (
                        <Tooltip
                          content="Abrir arquivo"
                          placement="top"
                          size="sm"
                        >
                          <Button
                            isIconOnly
                            className="w-7 h-7 min-w-min text-blue-600"
                            size="sm"
                            variant="light"
                            onClick={() => handleOpenAttachment(anexo)}
                          >
                            <ExternalLink size={16} />
                          </Button>
                        </Tooltip>
                      )}

                      <Tooltip
                        color="danger"
                        content="Excluir"
                        placement="top"
                        size="sm"
                      >
                        <Button
                          isIconOnly
                          className="w-7 h-7 min-w-min"
                          color="danger"
                          size="sm"
                          variant="light"
                          onPress={() => onRemove(anexo.Name)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `,
        }}
      />

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
    </div>
  );
};

export default React.memo(AnexosUpload);
