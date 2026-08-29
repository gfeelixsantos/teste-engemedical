// components/PdfViewer.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Button, Card, CardBody } from "@heroui/react";
import { toProxyUrl } from "@/lib/blob/blob-proxy";

import { MedicalRecord } from "../page";

interface PdfViewerProps {
  selectedRecord: MedicalRecord | null;
  currentPdfIndex: number;
  onPdfIndexChange: (index: number) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  selectedRecord,
  currentPdfIndex,
  onPdfIndexChange,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [cacheBust, setCacheBust] = useState<number>(Date.now());

  const rawUrl = selectedRecord?.pdfUrls?.[currentPdfIndex]?.url ?? "";
  const currentPdfUrl = useMemo(() => {
    if (!rawUrl) return "";
    return toProxyUrl(rawUrl) || rawUrl;
  }, [rawUrl]);
  
  const currentPdfTitle =
    selectedRecord?.pdfUrls?.[currentPdfIndex]?.title ?? "";
  const totalPdfs = selectedRecord?.pdfUrls?.length ?? 0;
  const iframeSrc = useMemo(() => {
    if (!currentPdfUrl) return "";
    const separator = currentPdfUrl.includes("?") ? "&" : "?";

    return `${currentPdfUrl}${separator}cb=${cacheBust}`;
  }, [currentPdfUrl, cacheBust]);

  useEffect(() => {
    setCacheBust(Date.now());
  }, [selectedRecord?._id, currentPdfIndex, currentPdfUrl]);

  const changePdfIndex = (dir: "next" | "prev" | "go", val?: number) => {
    if (!selectedRecord) return;

    if (dir === "next")
      onPdfIndexChange(Math.min(currentPdfIndex + 1, totalPdfs - 1));
    if (dir === "prev") onPdfIndexChange(Math.max(currentPdfIndex - 1, 0));
    if (dir === "go" && typeof val === "number")
      onPdfIndexChange(Math.min(Math.max(val, 0), totalPdfs - 1));
  };

  return (
    <main className="flex-1 bg-default-900 relative flex flex-col">
      {selectedRecord ? (
        <>
          {/* Header do PDF Viewer */}
          <div className="flex items-center justify-between px-4 py-1 bg-default-800 text-default-50 shadow-lg">
            <div className="truncate pr-4 flex-1">
              <h3 className="font-semibold text-xl text-right truncate">
                {currentPdfTitle}
              </h3>
              {/* <p className="text-xs text-default-300 truncate">
                {selectedRecord.NOME} • {selectedRecord.TIPOEXAMENOME}
              </p> */}
            </div>

            <div className="flex items-center gap-2">
              {/* Navegação entre PDFs */}
              <Button
                isIconOnly
                className="text-default-50"
                isDisabled={currentPdfIndex === 0}
                variant="light"
                onPress={() => changePdfIndex("prev")}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>

              <span className="text-md font-medium px-2">
                {currentPdfIndex + 1} / {totalPdfs}
              </span>

              <Button
                isIconOnly
                className="text-default-50"
                isDisabled={currentPdfIndex >= totalPdfs - 1}
                variant="light"
                onPress={() => changePdfIndex("next")}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </div>
          </div>

           {/* Área do PDF */}
           <div
             className="flex-1 flex items-center justify-center p-4 overflow-hidden"
             id="pdf-viewer"
           >
             {!currentPdfUrl ? (
               <div className="text-center">
                 <Eye className="w-12 h-12 mx-auto mb-4 text-default-400" />
                 <h3 className="text-lg font-light text-default-300">
                   Sem PDF Disponível
                 </h3>
                 <p className="text-sm text-default-500 mt-2">
                   Nenhum documento foi encontrado para este prontuário.
                 </p>
               </div>
             ) : (
               <iframe
                 className="bg-white shadow-2xl rounded-lg transition-all duration-300"
                 src={iframeSrc}
                 style={{
                   width: `${zoom}%`,
                   height: `${zoom}%`,
                   maxWidth: "100%",
                   maxHeight: "100%",
                   minWidth: "50%",
                   minHeight: "50%",
                   border: 0,
                 }}
                 title={currentPdfTitle}
               />
             )}
           </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-default-400">
          <Card className="bg-default-800 border-default-700">
            <CardBody className="text-center p-8">
              <Eye className="w-12 h-12 mx-auto mb-4 text-default-300" />
              <h3 className="text-xl font-light mb-2 text-default-200">
                Selecione um prontuário
              </h3>
              <p className="text-default-400">
                Clique em um item da lista para começar a avaliação.
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </main>
  );
};

export default PdfViewer;
