"use client";

import { useState, useRef, useEffect } from "react";
import { useEmpresas } from "./EmpresaProvider";
import { CadastroEmpresa } from "@/lib/soc/interfaces/CadastroEmpresa";
import { ChevronDown, Building2, Check, AlertTriangle, MapPin, FileText } from "lucide-react";

export function CompanySelector() {
  const { empresas, selectedEmpresa, setSelectedEmpresa, status, missingCodes } = useEmpresas();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (empresas.length === 0) {
    return null;
  }

  const hasMultiple = empresas.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => hasMultiple && setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-all hover:border-[#0d3224]/30 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d3224]/20 ${hasMultiple ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0d3224]/10">
          <Building2 className="h-4 w-4 text-[#0d3224]" />
        </div>
        <div className="min-w-0">
          <p className="max-w-[180px] truncate text-sm font-semibold text-gray-900">
            {selectedEmpresa?.NOMEABREVIADO || selectedEmpresa?.RAZAOSOCIAL || "Selecionar empresa"}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {selectedEmpresa?.CIDADE && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {selectedEmpresa.CIDADE}
              </span>
            )}
            {selectedEmpresa?.CNPJ && (
              <span className="flex items-center gap-0.5">
                <FileText className="h-2.5 w-2.5" />
                {selectedEmpresa.CNPJ}
              </span>
            )}
          </div>
        </div>
        {hasMultiple && (
          <ChevronDown className={`ml-1 h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {isOpen && hasMultiple && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Trocar Empresa</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              {empresas.length} empresas disponíveis
            </p>
          </div>

          {missingCodes.length > 0 && (
            <div className="mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-[11px] leading-relaxed text-amber-700">
                  {missingCodes.length} empresa{missingCodes.length > 1 ? "s" : ""} não encontrada{missingCodes.length > 1 ? "s" : ""}.
                  <a href="mailto:suporte@engemedical.com.br" className="ml-1 font-medium underline hover:text-amber-800">
                    Contatar suporte
                  </a>
                </p>
              </div>
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto p-2">
            {empresas.map((empresa) => {
              const isSelected = selectedEmpresa?.CODIGO === empresa.CODIGO;
              return (
                <button
                  key={empresa.CODIGO}
                  type="button"
                  onClick={() => {
                    setSelectedEmpresa(empresa);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                    isSelected
                      ? "border border-[#0d3224]/30 bg-[#0d3224]/5"
                      : "border border-transparent hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isSelected ? "bg-[#0d3224]/10" : "bg-gray-100"}`}>
                    <Building2 className={`h-4 w-4 ${isSelected ? "text-[#0d3224]" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${isSelected ? "text-[#0d3224]" : "text-gray-900"}`}>
                      {empresa.NOMEABREVIADO || empresa.RAZAOSOCIAL}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {empresa.CIDADE} • {empresa.CNPJ}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-[#0d3224]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
