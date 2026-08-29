"use client";

import React from "react";
import { ChevronRight, FolderOpen } from "lucide-react";
import { Button } from "@heroui/react";

import type { NavigationLevel } from "@/hooks/useBlobExplorer";

interface BreadcrumbNavProps {
  level: NavigationLevel;
  selectedEmpresa: string | null;
  selectedAno: string | null;
  selectedMes: string | null;
  selectedDia: string | null;
  selectedProntuario: string | null;
  razaoSocial: string;
  onNavigateToRoot: () => void;
  onNavigateToEmpresa: () => void;
  onNavigateToPeriodo: () => void;
  onNavigateToDia?: () => void;
}

const MES_NOMES: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Marco",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  level,
  selectedEmpresa,
  selectedAno,
  selectedMes,
  selectedDia,
  selectedProntuario,
  razaoSocial,
  onNavigateToRoot,
  onNavigateToEmpresa,
  onNavigateToPeriodo,
  onNavigateToDia,
}) => {
  const mesNome = selectedMes ? (MES_NOMES[selectedMes] ?? selectedMes) : null;

  return (
    <nav
      aria-label="Navegacao de arquivos"
      className="flex flex-wrap items-center gap-1 text-sm"
    >
      {level === "root" ? (
        <span className="flex items-center gap-1 font-semibold text-default-800">
          <FolderOpen className="h-4 w-4 text-primary" />
          Arquivos
        </span>
      ) : (
        <Button
          className="h-auto min-w-0 px-1 py-0 text-sm font-medium text-primary"
          size="sm"
          variant="light"
          onPress={onNavigateToRoot}
        >
          <FolderOpen className="h-4 w-4" />
          Arquivos
        </Button>
      )}

      {level !== "root" && selectedEmpresa && (
        <>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-default-400" />
          {level === "periodos" ? (
            <span className="max-w-[280px] truncate font-semibold text-default-800">
              {razaoSocial}
            </span>
          ) : (
            <Button
              className="h-auto min-w-0 max-w-[280px] truncate px-1 py-0 text-sm font-medium text-primary"
              size="sm"
              variant="light"
              onPress={onNavigateToEmpresa}
            >
              {razaoSocial}
            </Button>
          )}
        </>
      )}

      {(level === "dias" || level === "prontuarios" || level === "files") &&
        selectedAno &&
        mesNome && (
          <>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-default-400" />
            {level === "dias" ? (
              <span className="font-semibold text-default-800">
                {mesNome} / {selectedAno}
              </span>
            ) : (
              <Button
                className="h-auto min-w-0 px-1 py-0 text-sm font-medium text-primary"
                size="sm"
                variant="light"
                onPress={onNavigateToPeriodo}
              >
                {mesNome} / {selectedAno}
              </Button>
            )}
          </>
        )}

      {(level === "prontuarios" || level === "files") && selectedDia && (
        <>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-default-400" />
          {level === "prontuarios" ? (
            <span className="font-semibold text-default-800">
              Dia {selectedDia}
            </span>
          ) : (
            <Button
              className="h-auto min-w-0 px-1 py-0 text-sm font-medium text-primary"
              size="sm"
              variant="light"
              onPress={() => onNavigateToDia?.()}
            >
              Dia {selectedDia}
            </Button>
          )}
        </>
      )}

      {level === "files" && selectedProntuario && (
        <>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-default-400" />
          <span className="font-semibold text-default-800">
            {selectedProntuario}
          </span>
        </>
      )}
    </nav>
  );
};

export default BreadcrumbNav;
