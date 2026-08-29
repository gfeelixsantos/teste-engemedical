// components/LightModalSkeleton.tsx
import React from "react";
import { ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

export const LightModalSkeleton = () => (
  <div className="space-y-4">
    <ModalHeader>
      <div className="w-full space-y-2">
        <div className="h-7 bg-gray-200 rounded-lg animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-1/2" />
      </div>
    </ModalHeader>
    <ModalBody>
      <div className="space-y-4">
        {/* Cabeçalho simplificado */}
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            </div>
          ))}
        </div>

        {/* Conteúdo principal - apenas 2 linhas */}
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="h-10 w-10 bg-gray-200 rounded animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </ModalBody>
    <ModalFooter>
      <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
    </ModalFooter>
  </div>
);
