"use client";

import React from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardBody, Spinner } from "@heroui/react";

import type { DiaNode } from "@/hooks/useBlobExplorer";

interface DiaListProps {
  dias: DiaNode[];
  isLoading: boolean;
  onSelect: (dia: DiaNode) => void;
}

const DiaList: React.FC<DiaListProps> = ({ dias, isLoading, onSelect }) => {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-large border border-dashed border-default-200 bg-default-50/60 p-8 text-default-500">
        <Spinner color="primary" size="lg" />
        <p className="mt-3 text-sm">Carregando dias...</p>
      </div>
    );
  }

  if (dias.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-large border border-dashed border-default-200 bg-default-50/60 p-8 text-default-400">
        <CalendarDays className="mb-3 h-10 w-10 text-default-300" />
        <p className="text-sm font-medium">Nenhum dia disponível.</p>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {dias.map((dia) => (
        <div
          key={dia.dia}
          role="button"
          tabIndex={0}
          className="min-h-[100px] cursor-pointer"
          onClick={() => onSelect(dia)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(dia);
            }
          }}
        >
          <Card className="min-h-[100px] border border-default-200 bg-white transition-colors duration-150 hover:border-brand-primary/40 hover:shadow-sm">
            <CardBody className="p-4">
              <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-medium bg-brand-primary/10 text-brand-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-default-800">
                      Dia {dia.dia}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-default-500">
                  <span>{dia.totalProntuarios} prontuário(s)</span>
                  <span>{dia.totalArquivos} arquivo(s)</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default DiaList;
