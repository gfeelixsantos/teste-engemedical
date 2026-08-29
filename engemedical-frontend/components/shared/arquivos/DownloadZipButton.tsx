"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import { addToast, Button, Spinner } from "@heroui/react";

interface DownloadZipButtonProps {
  selectedFiles: Set<string>;
  razaoSocial: string;
  ano: string;
  mes: string;
  disabled?: boolean;
}

function normalizeForFileName(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

const DownloadZipButton: React.FC<DownloadZipButtonProps> = ({
  selectedFiles,
  razaoSocial,
  ano,
  mes,
  disabled = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (selectedFiles.size === 0) return;

    setIsGenerating(true);

    try {
      const res = await fetch("/api/blob-explorer/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blobNames: Array.from(selectedFiles),
        }),
      });

      if (!res.ok) {
        throw new Error(`Erro ao gerar ZIP (HTTP ${res.status})`);
      }

      const normalizedRazao = normalizeForFileName(razaoSocial);
      const zipFileName = `GED_${normalizedRazao}_${ano}_${mes}.zip`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[DownloadZipButton] Falha no download ZIP:", err);
      addToast({
        title: "Erro no download",
        description:
          err instanceof Error
            ? err.message
            : "Não foi possível gerar o arquivo ZIP.",
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isDisabled = disabled || selectedFiles.size === 0 || isGenerating;

  return (
    <Button
      color="primary"
      isDisabled={isDisabled}
      size="sm"
      startContent={
        isGenerating ? (
          <Spinner color="white" size="sm" />
        ) : (
          <Download className="w-4 h-4" />
        )
      }
      variant="solid"
      onPress={handleDownload}
    >
      {isGenerating
        ? "Gerando ZIP..."
        : `Baixar ZIP (${selectedFiles.size})`}
    </Button>
  );
};

export default DownloadZipButton;
