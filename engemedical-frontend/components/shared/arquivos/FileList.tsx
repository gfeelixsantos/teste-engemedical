"use client";

import React from "react";
import { Download, Eye, FileText } from "lucide-react";
import { Button, Card, CardBody, Checkbox } from "@heroui/react";

import type { FileNode } from "@/hooks/useBlobExplorer";
import { VirtualizedGrid } from "./VirtualizedGrid";

interface FileListProps {
  files: FileNode[];
  selectedFiles: Set<string>;
  onToggleSelect: (blobName: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDownload: (blobName: string, fileName: string) => void;
  onView: (blobName: string) => void;
}

const FileList: React.FC<FileListProps> = ({
  files,
  selectedFiles,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDownload,
  onView,
}) => {
  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && !allSelected;

  if (files.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-large border border-dashed border-default-200 bg-default-50/60 p-8 text-default-400">
        <FileText className="mb-3 h-10 w-10 text-default-300" />
        <p className="text-sm font-medium">Nenhum arquivo encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-large border border-default-200 bg-white px-4 py-3">
        <Checkbox
          isIndeterminate={someSelected}
          isSelected={allSelected}
          size="sm"
          onValueChange={(checked) => {
            if (checked) {
              onSelectAll();
            } else {
              onClearSelection();
            }
          }}
        >
          <span className="text-xs text-default-600">
            {selectedFiles.size > 0
              ? `${selectedFiles.size} selecionado(s)`
              : "Selecionar todos"}
          </span>
        </Checkbox>

        {selectedFiles.size > 0 && (
          <Button size="sm" variant="light" onPress={onClearSelection}>
            Limpar seleção
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden pr-1">
        <VirtualizedGrid
          items={files}
          itemHeight={128}
          breakpoints={{ sm: 1, lg: 2 }}
          renderItem={(file) => {
            const isSelected = selectedFiles.has(file.blobName);

            return (
              <Card
                className={`h-[128px] border transition-colors duration-150 ${
                  isSelected
                    ? "border-2 border-brand-primary/50 bg-brand-primary/5"
                    : "border-default-200 bg-white hover:border-brand-primary/40 hover:shadow-sm"
                }`}
              >
                <CardBody className="p-4">
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        isSelected={isSelected}
                        size="sm"
                        onValueChange={() => onToggleSelect(file.blobName)}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-default-800">
                          {file.fileName}
                        </p>
                        <p className="mt-1 truncate text-xs text-default-500">
                          {[
                            file.nomeFuncionario,
                            file.dataAgendamento,
                            file.origem.toUpperCase(),
                          ]
                            .filter(Boolean)
                            .join(" \u2022 ")}
                        </p>
                        {file.tipoExame && (
                          <p className="mt-1 truncate text-xs text-default-400">
                            {file.tipoExame}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-default-200 pt-3">
                      <span className="text-xs text-default-500">
                        {file.blobName.split("/").slice(0, -1).join("/")}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          isIconOnly
                          aria-label="Visualizar arquivo"
                          size="sm"
                          title="Visualizar"
                          variant="light"
                          onPress={() => onView(file.blobName)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          isIconOnly
                          aria-label="Baixar arquivo"
                          size="sm"
                          title="Download"
                          variant="light"
                          onPress={() => onDownload(file.blobName, file.fileName)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          }}
        />
      </div>
    </div>
  );
};

export default FileList;
