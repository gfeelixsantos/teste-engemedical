"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  addToast,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Spinner,
} from "@heroui/react";
import { Download, Package } from "lucide-react";

import { useBlobExplorer } from "@/hooks/useBlobExplorer";
import { useGedBatchJob } from "@/hooks/useGedBatchJob";
import BreadcrumbNav from "@/components/shared/arquivos/BreadcrumbNav";
import DiaList from "@/components/shared/arquivos/DiaList";
import DownloadZipButton from "@/components/shared/arquivos/DownloadZipButton";
import EmpresaList from "@/components/shared/arquivos/EmpresaList";
import FileList from "@/components/shared/arquivos/FileList";
import PeriodoList from "@/components/shared/arquivos/PeriodoList";
import ProntuarioList from "@/components/shared/arquivos/ProntuarioList";
import { PdfPreviewModal } from "@/components/shared/arquivos/PdfPreviewModal";

interface FileExplorerProps {
  showHeader?: boolean;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  showHeader = true,
}) => {
  const {
    level,
    filteredCompanies,
    periods,
    dias,
    prontuarios,
    files,
    searchQuery,
    selectedEmpresa,
    selectedPeriodo,
    selectedDia,
    selectedProntuario,
    isLoadingCompanies,
    isLoadingPeriods,
    isLoadingDias,
    isLoadingProntuarios,
    isLoadingFiles,
    error,
    selectedFiles,
    setSearchQuery,
    selectEmpresa,
    selectPeriodo,
    selectDia,
    selectProntuario,
    navigateToRoot,
    navigateToEmpresa,
    navigateToPeriodo,
    navigateToDia,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
  } = useBlobExplorer();

  const {
    currentJob,
    isCreating: isCreatingBatch,
    isPolling: isPollingBatch,
    error: batchError,
    startBatch,
    clearJob,
  } = useGedBatchJob({
    onCompleted: (job) => {
      addToast({
        title:
          job.status === "partial"
            ? "Lote concluido com pendencias"
            : "Lote concluido",
        description:
          job.status === "partial"
            ? "Alguns prontuarios nao puderam ser gerados. Verifique as notificacoes."
            : "O download em lote foi processado com sucesso.",
        severity: job.status === "partial" ? "warning" : "success",
        color: "foreground",
        variant: "flat",
      });
    },
    onFailed: (job) => {
      addToast({
        title: "Lote com falha",
        description:
          job.errors?.[job.errors.length - 1]?.message ||
          "Nao foi possivel concluir o download em lote.",
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    },
  });

  const [selectedProntuarios, setSelectedProntuarios] = useState<Set<string>>(new Set());
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; sasUrl: string | null; fileName: string }>({
    isOpen: false,
    sasUrl: null,
    fileName: "",
  });

  const handleToggleSelectProntuario = useCallback(
    (codigoProntuario: string) => {
      setSelectedProntuarios((prev) => {
        const next = new Set(prev);
        if (next.has(codigoProntuario)) {
          next.delete(codigoProntuario);
        } else {
          next.add(codigoProntuario);
        }
        return next;
      });
    },
    [],
  );

  const handleSelectAllProntuarios = useCallback(() => {
    setSelectedProntuarios(new Set(prontuarios.map((p) => p.codigoProntuario)));
  }, [prontuarios]);

  const handleClearSelectionProntuarios = useCallback(() => {
    setSelectedProntuarios(new Set());
  }, []);

  const handleBatchProntuarios = useCallback(
    (tipo: "prontuario" | "aso") => {
      if (!selectedEmpresa || !selectedPeriodo || selectedProntuarios.size === 0) return;

      const items = prontuarios
        .filter((p) => selectedProntuarios.has(p.codigoProntuario))
        .map((p) => ({
          codigoProntuario: p.codigoProntuario,
          nome: p.nomeFuncionario || p.codigoProntuario,
        }));

      void startBatch({
        scope: "prontuario",
        codigoEmpresa: selectedEmpresa.codigoEmpresa,
        razaoSocial: selectedEmpresa.razaoSocial,
        periodo: {
          ano: selectedPeriodo.ano,
          mes: selectedPeriodo.mes,
        },
        prontuarios: items,
        tipo,
      });
    },
    [selectedEmpresa, selectedPeriodo, selectedProntuarios, prontuarios, startBatch],
  );

  const handleDownloadEmpresaProntuarios = useCallback(
    (codigoEmpresa: string, razaoSocial: string) => {
      void startBatch({
        codigoEmpresa,
        razaoSocial,
        tipo: "prontuario",
      });
    },
    [startBatch],
  );

  const handleDownloadEmpresaAsos = useCallback(
    (codigoEmpresa: string, razaoSocial: string) => {
      void startBatch({
        codigoEmpresa,
        razaoSocial,
        tipo: "aso",
      });
    },
    [startBatch],
  );

  const handleDownloadPeriodoProntuarios = useCallback(
    (periodo: { ano: string; mes: string }) => {
      if (!selectedEmpresa) return;
      void startBatch({
        scope: "periodo",
        codigoEmpresa: selectedEmpresa.codigoEmpresa,
        razaoSocial: selectedEmpresa.razaoSocial,
        periodo: {
          ano: periodo.ano,
          mes: periodo.mes,
        },
        tipo: "prontuario",
      });
    },
    [selectedEmpresa, startBatch],
  );

  const handleDownloadPeriodoAsos = useCallback(
    (periodo: { ano: string; mes: string }) => {
      if (!selectedEmpresa) return;
      void startBatch({
        scope: "periodo",
        codigoEmpresa: selectedEmpresa.codigoEmpresa,
        razaoSocial: selectedEmpresa.razaoSocial,
        periodo: {
          ano: periodo.ano,
          mes: periodo.mes,
        },
        tipo: "aso",
      });
    },
    [selectedEmpresa, startBatch],
  );

  const handleDownloadPeriodo = useCallback(
    (periodo: { ano: string; mes: string }) => {
      if (!selectedEmpresa) return;
      void startBatch({
        scope: "periodo",
        codigoEmpresa: selectedEmpresa.codigoEmpresa,
        razaoSocial: selectedEmpresa.razaoSocial,
        periodo: {
          ano: periodo.ano,
          mes: periodo.mes,
        },
      });
    },
    [selectedEmpresa, startBatch],
  );

  const handleDownloadProntuario = useCallback(
    (codigoProntuario: string, nomeFuncionario: string, tipo: "prontuario" | "aso" = "prontuario") => {
      if (!selectedEmpresa || !selectedPeriodo) return;
      void startBatch({
        scope: "prontuario",
        codigoEmpresa: selectedEmpresa.codigoEmpresa,
        razaoSocial: selectedEmpresa.razaoSocial,
        periodo: {
          ano: selectedPeriodo.ano,
          mes: selectedPeriodo.mes,
        },
        prontuarios: [
          {
            codigoProntuario,
            nome: nomeFuncionario,
          },
        ],
        tipo,
      });
    },
    [selectedEmpresa, selectedPeriodo, startBatch],
  );

  const handleDownloadIndividual = async (
    blobName: string,
    fileName: string,
  ) => {
    try {
      const params = new URLSearchParams({ blobName });
      const res = await fetch(`/api/blob-explorer/sas?${params.toString()}`);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: { sasUrl: string } = await res.json();

      const link = document.createElement("a");

      link.href = data.sasUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("[FileExplorer] Erro no download individual:", err);
      addToast({
        title: "Erro no download",
        description: "Nao foi possivel baixar o arquivo.",
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    }
  };

  const handleOpenPdf = async (blobName: string) => {
    try {
      const params = new URLSearchParams({ blobName });
      const res = await fetch(`/api/blob-explorer/sas?${params.toString()}`);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: { sasUrl: string } = await res.json();
      setPreviewModal({
        isOpen: true,
        sasUrl: data.sasUrl,
        fileName: blobName.split("/").pop() || "Documento",
      });
    } catch (err) {
      console.error("[FileExplorer] Erro ao abrir arquivo:", err);
      addToast({
        title: "Erro na visualizacao",
        description:
          err instanceof Error
            ? err.message
            : "Nao foi possivel abrir o arquivo em nova aba.",
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    }
  };

  const isBatchBusy = isCreatingBatch || isPollingBatch;

  const zipLabel = useMemo(() => {
    const empresa = selectedEmpresa?.razaoSocial || "GED";
    const ano = selectedPeriodo?.ano || "0000";
    const mes = selectedPeriodo?.mes || "00";

    return { empresa, ano, mes };
  }, [selectedEmpresa, selectedPeriodo]);

  return (
    <Card className="border border-default-200 shadow-sm">
      {showHeader && (
        <>
          <CardHeader className="flex flex-col items-start gap-3 border-b border-default-200">
            <BreadcrumbNav
              level={level}
              razaoSocial={selectedEmpresa?.razaoSocial || ""}
              selectedAno={selectedPeriodo?.ano || null}
              selectedEmpresa={selectedEmpresa?.codigoEmpresa || null}
              selectedMes={selectedPeriodo?.mes || null}
              selectedDia={selectedDia?.dia || null}
              selectedProntuario={selectedProntuario?.codigoProntuario || null}
              onNavigateToEmpresa={navigateToEmpresa}
              onNavigateToPeriodo={navigateToPeriodo}
              onNavigateToDia={navigateToDia}
              onNavigateToRoot={navigateToRoot}
            />
          </CardHeader>

          <Divider />
        </>
      )}

      <CardBody className="h-[600px] md:h-[calc(100vh-220px)] min-h-[460px] flex flex-col">
        {error && (
          <div className="mb-4 rounded-medium border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {batchError && (
          <div className="mb-4 rounded-medium border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
            {batchError}
          </div>
        )}

        {currentJob && (
          <div
            className={`mb-4 rounded-large border px-4 py-3 ${
              currentJob.status === "failed"
                ? "border-danger-200 bg-danger-50/70"
                : currentJob.status === "completed" || currentJob.status === "partial"
                  ? "border-success-200 bg-success-50/70"
                  : "border-brand-primary/20 bg-brand-mist"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-medium ${
                    currentJob.status === "failed"
                      ? "bg-danger/10 text-danger"
                      : currentJob.status === "completed" || currentJob.status === "partial"
                        ? "bg-success/10 text-success"
                        : "bg-brand-primary/10 text-brand-primary"
                  }`}
                >
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-default-800">
                    {currentJob.status === "completed" || currentJob.status === "partial"
                      ? "Lote pronto para download"
                      : currentJob.status === "failed"
                        ? "Lote GED nao concluido"
                        : `Lote em andamento — ${currentJob.empresa.razaoSocial}`}
                  </p>
                  <p className="text-sm text-default-600">
                    {currentJob.status === "failed"
                      ? currentJob.errors?.[currentJob.errors.length - 1]?.message ||
                        "O lote foi encerrado com erro."
                      : `${currentJob.processedFuncionarios} de ${currentJob.totalFuncionarios} prontuario(s) processados`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentJob.result?.zipUrl && (
                  <Button
                    as="a"
                    className="bg-brand-primary text-white hover:bg-brand-primary-hover"
                    href={currentJob.result.zipUrl}
                    rel="noreferrer"
                    size="sm"
                    startContent={<Download className="h-4 w-4" />}
                    target="_blank"
                  >
                    Baixar lote
                  </Button>
                )}
                {(currentJob.status === "completed" ||
                  currentJob.status === "partial" ||
                  currentJob.status === "failed") && (
                  <Button size="sm" variant="light" onPress={clearJob}>
                    Fechar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {isBatchBusy && (
          <div className="mb-4 flex items-center gap-3 rounded-large border border-brand-primary/20 bg-brand-mist px-4 py-3">
            <Spinner color="primary" size="sm" />
            <p className="text-sm font-medium text-brand-primary">
              Preparando lote em background, aguarde...
            </p>
          </div>
        )}

        {level === "root" && (
          <>

            <EmpresaList
              empresas={filteredCompanies}
              isLoading={isLoadingCompanies}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onDownloadProntuarios={handleDownloadEmpresaProntuarios}
              onDownloadAsos={handleDownloadEmpresaAsos}
              currentJob={currentJob}
              isCreatingJob={isCreatingBatch}
              onSelect={(codigoEmpresa) => {
                const empresa = filteredCompanies.find(
                  (item) => item.codigoEmpresa === codigoEmpresa,
                );

                if (empresa) {
                  void selectEmpresa(empresa);
                }
              }}
            />
          </>
        )}

        {level === "periodos" && (
          <>
            <PeriodoList
              isLoading={isLoadingPeriods}
              periodos={periods}
              onDownloadProntuarios={handleDownloadPeriodoProntuarios}
              onDownloadAsos={handleDownloadPeriodoAsos}
              onSelect={(periodo) => void selectPeriodo(periodo)}
              currentJob={currentJob}
              isCreatingJob={isCreatingBatch}
            />
          </>
        )}

        {level === "dias" && (
          <>
            <DiaList
              dias={dias}
              isLoading={isLoadingDias}
              onSelect={(dia) => void selectDia(dia)}
            />
          </>
        )}

        {level === "prontuarios" && (
          <>
            <ProntuarioList
              isLoading={isLoadingProntuarios}
              prontuarios={prontuarios}
              onDownload={handleDownloadProntuario}
              onSelect={(prontuario) => void selectProntuario(prontuario)}
              currentJob={currentJob}
              isCreatingJob={isCreatingBatch}
              selectedSet={selectedProntuarios}
              onToggleSelect={handleToggleSelectProntuario}
              onSelectAll={handleSelectAllProntuarios}
              onClearSelection={handleClearSelectionProntuarios}
              onBatchDownload={handleBatchProntuarios}
            />
          </>
        )}

        {level === "files" && (
          <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-default-800">
                  {selectedProntuario?.nomeFuncionario ||
                    selectedProntuario?.codigoProntuario}
                </p>
                <p className="text-xs text-default-500">
                  {selectedProntuario?.codigoProntuario}
                </p>
              </div>

              {!showHeader && (
                <div className="flex items-center gap-2">
                  <BreadcrumbNav
                    level={level}
                    razaoSocial={selectedEmpresa?.razaoSocial || ""}
                    selectedAno={selectedPeriodo?.ano || null}
                    selectedEmpresa={selectedEmpresa?.codigoEmpresa || null}
                    selectedMes={selectedPeriodo?.mes || null}
                    selectedDia={selectedDia?.dia || null}
                    selectedProntuario={selectedProntuario?.codigoProntuario || null}
                    onNavigateToEmpresa={navigateToEmpresa}
                    onNavigateToPeriodo={navigateToPeriodo}
                    onNavigateToDia={navigateToDia}
                    onNavigateToRoot={navigateToRoot}
                  />
                </div>
              )}

              <DownloadZipButton
                ano={zipLabel.ano}
                mes={zipLabel.mes}
                razaoSocial={zipLabel.empresa}
                selectedFiles={selectedFiles}
              />
            </div>

            {isLoadingFiles ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-default-500">
                <Spinner color="primary" size="lg" />
                <p className="text-sm">Carregando arquivos do prontuario...</p>
              </div>
            ) : (
              <FileList
                files={files}
                selectedFiles={selectedFiles}
                onClearSelection={clearSelection}
                onDownload={handleDownloadIndividual}
                onSelectAll={selectAllFiles}
                onToggleSelect={toggleFileSelection}
                onView={handleOpenPdf}
              />
            )}
          </div>
        )}
      </CardBody>

      <PdfPreviewModal
        isOpen={previewModal.isOpen}
        onOpenChange={(isOpen) => setPreviewModal((prev) => ({ ...prev, isOpen }))}
        sasUrl={previewModal.sasUrl}
        fileName={previewModal.fileName}
      />
    </Card>
  );
};
