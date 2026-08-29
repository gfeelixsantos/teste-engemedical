"use client";

import React from "react";
import { CalendarRange, Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button, Card, CardBody, Spinner } from "@heroui/react";

import type { PeriodoNode } from "@/hooks/useBlobExplorer";
import type { GedBatchJob } from "@/lib/ged-batch-client";

interface PeriodoListProps {
  periodos: PeriodoNode[];
  isLoading: boolean;
  onSelect: (periodo: PeriodoNode) => void;
  onDownloadProntuarios?: (periodo: PeriodoNode) => void;
  onDownloadAsos?: (periodo: PeriodoNode) => void;
  currentJob?: GedBatchJob | null;
  isCreatingJob?: boolean;
}

const MES_NOMES: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
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

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: "Na fila…",
  processing: "Processando…",
  completed: "Concluído",
  partial: "Parcial",
  failed: "Falhou",
};

const PeriodoList: React.FC<PeriodoListProps> = ({
  periodos,
  isLoading,
  onSelect,
  onDownloadProntuarios,
  onDownloadAsos,
  currentJob,
  isCreatingJob = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-large border border-dashed border-default-200 bg-default-50/60 p-8 text-default-500">
        <Spinner color="primary" size="lg" />
        <p className="mt-3 text-sm">Carregando períodos...</p>
      </div>
    );
  }

  if (periodos.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-large border border-dashed border-default-200 bg-default-50/60 p-8 text-default-400">
        <CalendarRange className="mb-3 h-10 w-10 text-default-300" />
        <p className="text-sm font-medium">Nenhum período disponível.</p>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {periodos.map((periodo) => {
        const isJobForThisPeriod =
          currentJob?.periodo?.ano === periodo.ano &&
          currentJob?.periodo?.mes === periodo.mes;

        const jobStatus = isJobForThisPeriod ? currentJob?.status : undefined;
        const isActive =
          isCreatingJob ||
          (isJobForThisPeriod &&
            (jobStatus === "queued" || jobStatus === "processing"));
        const isTerminal =
          isJobForThisPeriod &&
          (jobStatus === "completed" ||
            jobStatus === "partial" ||
            jobStatus === "failed");
        const zipUrl =
          isJobForThisPeriod && isTerminal
            ? currentJob?.result?.zipUrl
            : undefined;

        return (
          <div
            key={`${periodo.ano}-${periodo.mes}`}
            role="button"
            tabIndex={0}
            className="min-h-[124px] cursor-pointer"
            onClick={() => onSelect(periodo)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(periodo);
              }
            }}
          >
            <Card className="min-h-[124px] border border-default-200 bg-white transition-colors duration-150 hover:border-brand-primary/40 hover:shadow-sm">
            <CardBody className="p-4">
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-medium bg-brand-primary/10 text-brand-primary">
                    <CalendarRange className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-default-800">
                      {MES_NOMES[periodo.mes] ?? periodo.mes} / {periodo.ano}
                    </p>
                    <p className="mt-1 text-xs text-default-500">
                      {periodo.totalProntuarios} prontuário(s)
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between border-t border-default-200 pt-3"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-default-500">Arquivos</span>
                  <div className="flex items-center gap-2">
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
                        onPress={() => onDownloadProntuarios?.(periodo)}
                      >
                        Tentar novamente
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {onDownloadProntuarios && (
                          <Button
                            className="bg-brand-primary text-white hover:bg-brand-primary-hover"
                            size="sm"
                            startContent={<FileText className="h-3.5 w-3.5" />}
                            onPress={() => onDownloadProntuarios(periodo)}
                          >
                            Prontuários
                          </Button>
                        )}
                        {onDownloadAsos && (
                          <Button
                            className="bg-success/15 text-success hover:bg-success/25"
                            size="sm"
                            startContent={<Download className="h-3.5 w-3.5" />}
                            onPress={() => onDownloadAsos(periodo)}
                          >
                            ASOs
                          </Button>
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
      })}
    </div>
  );
};

export default PeriodoList;