import { Tooltip, Progress, Button } from "@heroui/react";
import { AlertCircle, CheckCircle, XCircle, File } from "lucide-react";
import React from "react";

// ============================================
// COMPONENTE: SelectedFilesList
// ============================================

// Interfaces para upload de arquivos
export interface SelectedFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
  uploaded: boolean;
}

const SelectedFilesList: React.FC<{
  files: SelectedFile[];
  onRemove: (fileId: string) => void;
  isUploading: boolean;
}> = ({ files, onRemove, isUploading }) => {
  if (files.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="text-sm font-medium text-gray-700">
        Arquivos selecionados:
      </div>
      <div className="space-y-2">
        {files.map((selectedFile) => (
          <div
            key={selectedFile.id}
            className={`flex items-center justify-between p-2 rounded-lg border ${
              selectedFile.error
                ? "border-red-200 bg-red-50"
                : selectedFile.uploaded
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <File className="flex-shrink-0 text-gray-500" size={14} />
              <span className="text-sm text-gray-900 truncate">
                {selectedFile.file.name}
              </span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.file.size / 1024).toFixed(1)} KB)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedFile.error && (
                <Tooltip content={selectedFile.error}>
                  <AlertCircle className="text-red-500" size={14} />
                </Tooltip>
              )}
              {selectedFile.uploaded && (
                <CheckCircle className="text-green-500" size={14} />
              )}
              {isUploading &&
                selectedFile.progress > 0 &&
                selectedFile.progress < 100 && (
                  <Progress
                    aria-label={`Upload de ${selectedFile.file.name}`}
                    className="w-20"
                    color="primary"
                    size="sm"
                    value={selectedFile.progress}
                  />
                )}
              <Button
                isIconOnly
                color="danger"
                disabled={isUploading}
                size="sm"
                variant="light"
                onPress={() => onRemove(selectedFile.id)}
              >
                <XCircle size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SelectedFilesList);
