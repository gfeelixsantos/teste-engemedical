"use client";

import React from "react";
import { CheckSquare, Download, ExternalLink, FileText, FolderOpen, Loader2, Square } from "lucide-react";
import { Button, Card, CardBody, Spinner } from "@heroui/react";

import type { ProntuarioNode } from "@/hooks/useBlobExplorer";
import type { GedBatchJob } from "@/lib/ged-batch-client";
import { VirtualizedGrid } from "./VirtualizedGrid";

interface ProntuarioListProps {
  prontuarios: ProntuarioNode[];
  isLoading: boolean;
  onSelect: (prontuario: ProntuarioNode) => void;
  onDownload?: (codigoProntuario: string, nomeFuncionario: string, tipo: "prontuario" | "aso") => void;
  selectedSet?: Set<string>;
  onToggleSelect?: (codigoProntuario: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onBatchDownload?: (tipo: "prontuario" | "aso") => void;
  currentJob?: GedBatchJob | null;
  isCreatingJob?: boolean;
}

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: "Na fila…",
  processing: "Processando…",
  completed: "Concluído",
  partial: "Parcial",
  failed: "Falhou",
};

const ProntuarioList: React.FC<ProntuarioListProps> = ({
  prontuarios,
  isLoading,
  onSelect,
  onDownload,
  selectedSet = new Set(),
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onBatchDownload,
  currentJob,
  isCreatingJob = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-large border border-dashed border-default-200 bg-default-50/60 p-8 text-default-500">
        <Spinner color="primary" size="lg" />
        <p className="mt-3 text-sm">Carregando prontuários...</p>
      </div>
    );
  }

  if (prontuarios.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-large border border-dashed border-default-200 bg-default-50/60 p-8 text-default-400">
        <FolderOpen className="mb-3 h-10 w-10 text-default-300" />
        <p className="text-sm font-medium">Nenhum prontuário encontrado.</p>
      </div>
    );
  }

  const hasSelection = selectedSet.size > 0;
  const allSelected = prontuarios.length > 0 && selectedSet.size === prontuarios.length;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-large border border-default-200 bg-default-50/80 px-4 py-3">
        <span className="text-sm font-medium text-default-600">
          {hasSelection
            ? `${selectedSet.size} de ${prontuarios.length} selecionado(s)`
            : `${prontuarios.length} prontuário(s)`}
        </span>
        <div className="flex items-center gap-2">
          {hasSelection && !allSelected && onClearSelection && (
            <Button
              size="sm"
              variant="light"
              className="text-default-500"
              onPress={onClearSelection}
            >
              Limpar seleção
            </Button>
          )}
          {onSelectAll && (
            <Button
              size="sm"
              variant={allSelected ? "light" : "flat"}
              className={
                allSelected
                  ? "text-default-500"
                  : "bg-brand-primary/10 text-brand-primary"
              }
              startContent={allSelected ? undefined : <CheckSquare className="h-4 w-4" />}
              onPress={allSelected ? onClearSelection : onSelectAll}
            >
              {allSelected ? "Limpar seleção" : "Selecionar Todos"}
            </Button>
          )}
          {hasSelection && onBatchDownload && (
            <>
              <Button
                size="sm"
                className="bg-brand-primary text-white hover:bg-brand-primary-hover"
                startContent={<FileText className="h-4 w-4" />}
                onPress={() => onBatchDownload("prontuario")}
              >
                Baixar Prontuários
              </Button>
              <Button
                size="sm"
                className="bg-success/15 text-success hover:bg-success/25"
                startContent={<Download className="h-4 w-4" />}
                onPress={() => onBatchDownload("aso")}
              >
                Baixar ASOs
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden pr-1">
        <VirtualizedGrid
          items={prontuarios}
          itemHeight={148}
          breakpoints={{ sm: 1, md: 2, xl: 3 }}
          renderItem={(prontuario) => {
          const isJobForThisProntuario =
            currentJob?.scope === "prontuario" &&
            currentJob.items.some(
              (item) => item.codigoProntuario === prontuario.codigoProntuario,
            );

          const jobStatus = isJobForThisProntuario ? currentJob?.status : undefined;
          const isActive =
            isCreatingJob ||
            (isJobForThisProntuario &&
              (jobStatus === "queued" || jobStatus === "processing"));
          const isTerminal =
            isJobForThisProntuario &&
            (jobStatus === "completed" ||
              jobStatus === "partial" ||
              jobStatus === "failed");
          const zipUrl =
            isJobForThisProntuario && isTerminal
              ? currentJob?.result?.zipUrl
              : undefined;

          const isSelected = selectedSet.has(prontuario.codigoProntuario);

          return (
            <div
              key={prontuario.codigoProntuario}
              role="button"
              tabIndex={0}
              className={`min-h-[148px] cursor-pointer`}
              onClick={() => onSelect(prontuario)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(prontuario);
                }
              }}
            >
              <Card className={`min-h-[148px] border transition-colors duration-150 hover:shadow-sm ${
                isSelected
                  ? "border-2 border-brand-primary/50 bg-brand-primary/5"
                  : "border-default-200 bg-white hover:border-brand-primary/40"
              }`}>
              <CardBody className="p-4">
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-medium bg-brand-primary/10 text-brand-primary">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-default-800">
                        {prontuario.nomeFuncionario || prontuario.codigoProntuario}
                      </p>
                      <p className="mt-1 truncate text-xs text-default-500">
                        {prontuario.cpf ? `CPF: ${prontuario.cpf}` : `Cod: ${prontuario.codigoProntuario}`}
                      </p>
                      {prontuario.dataAgendamento && (
                        <p className="text-xs text-default-400">
                          {prontuario.dataAgendamento}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between border-t border-default-200 pt-3"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex cursor-pointer items-center gap-1 text-xs text-default-500 hover:text-brand-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect?.(prontuario.codigoProntuario);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleSelect?.(prontuario.codigoProntuario);
                        }
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-brand-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      <span>{isSelected ? "Selecionado" : "Selecionar"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {onDownload && (
                        <div>
                          {zipUrl && (jobStatus === "completed" || jobStatus === "partial") ? (
                            <Button
                              className={
                                jobStatus === "partial"
                                  ? "bg-warning/15 text-warning hover:bg-warning/25"
                                  : "bg-success/15 text-success hover:bg-success/25"
                              }
                              size="sm"
                              as="a"
                              href={zipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              startContent={<ExternalLink className="h-3.5 w-3.5" />}
                            >
                              Baixar ZIP
                            </Button>
                          ) : isActive ? (
                            <Button
                              className="bg-brand-primary/15 text-brand-primary"
                              size="sm"
                              isDisabled
                              startContent={
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              }
                            >
                              {isCreatingJob
                                ? "Iniciando…"
                                : (JOB_STATUS_LABEL[jobStatus ?? ""] ?? "Aguarde…")}
                            </Button>
                          ) : isTerminal && !zipUrl ? (
                            <Button
                              className="bg-danger/15 text-danger hover:bg-danger/25"
                              size="sm"
                              startContent={<Download className="h-3.5 w-3.5" />}
                              onPress={() =>
                                onDownload(
                                  prontuario.codigoProntuario,
                                  prontuario.nomeFuncionario || prontuario.codigoProntuario,
                                  "prontuario"
                                )
                              }
                            >
                              Tentar novamente
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                className="bg-brand-primary text-white hover:bg-brand-primary-hover"
                                size="sm"
                                startContent={<FileText className="h-3.5 w-3.5" />}
                                onPress={() =>
                                  onDownload(
                                    prontuario.codigoProntuario,
                                    prontuario.nomeFuncionario || prontuario.codigoProntuario,
                                    "prontuario"
                                  )
                                }
                              >
                                Prontuário
                              </Button>
                              <Button
                                className="bg-success/15 text-success hover:bg-success/25"
                                size="sm"
                                startContent={<Download className="h-3.5 w-3.5" />}
                                onPress={() =>
                                  onDownload(
                                    prontuario.codigoProntuario,
                                    prontuario.nomeFuncionario || prontuario.codigoProntuario,
                                    "aso"
                                  )
                                }
                              >
                                ASO
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </CardBody>
              </Card>
            </div>
          );
        }}
        />
      </div>
    </div>
  );
};

export default ProntuarioList;