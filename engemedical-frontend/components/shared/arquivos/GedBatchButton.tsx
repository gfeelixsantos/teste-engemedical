"use client";

import React from "react";
import { Download, Loader2 } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

interface GedBatchButtonProps {
  razaoSocial: string;
  codigoEmpresa: string;
  isCreating: boolean;
  hasActiveJob: boolean;
  onStart: (codigoEmpresa: string, razaoSocial: string) => void;
}

const GedBatchButton: React.FC<GedBatchButtonProps> = ({
  razaoSocial,
  codigoEmpresa,
  isCreating,
  hasActiveJob,
  onStart,
}) => {
  const isDisabled = isCreating || hasActiveJob;

  return (
    <Tooltip
      content={
        hasActiveJob
          ? "Já existe um lote em andamento para esta empresa"
          : "Baixar todos os prontuários da empresa em lote"
      }
      delay={500}
    >
      <Button
        isDisabled={isDisabled}
        size="sm"
        startContent={
          isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )
        }
        variant="flat"
        color="primary"
        onPress={() => onStart(codigoEmpresa, razaoSocial)}
      >
        {isCreating ? "Iniciando..." : "Baixar Lote"}
      </Button>
    </Tooltip>
  );
};

export default GedBatchButton;
