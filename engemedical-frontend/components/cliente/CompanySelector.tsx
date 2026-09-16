"use client";

import { useState, useRef, useEffect } from "react";
import { useEmpresas } from "./EmpresaProvider";
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

  if (!selectedEmpresa) {
    return null;
  }

  const hasMultiple = empresas.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => hasMultiple && setIsOpen(!isOpen)}
        className={`flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white px-4 py-2.5 shadow-sm transition-all hover:border-[#16804D]/30 hover:shadow-md hover:shadow-[#16804D]/5 focus:outline-none focus:ring-2 focus:ring-[#16804D]/20 ${hasMultiple ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0d3224] to-[#16804D]">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 text-left">
          <p className="max-w-[200px] truncate text-sm font-bold text-gray-900">
            {selectedEmpresa.NOMEABREVIADO || selectedEmpresa.RAZAOSOCIAL}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {selectedEmpresa.CIDADE && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {selectedEmpresa.CIDADE}
              </span>
            )}
            {selectedEmpresa.CNPJ && (
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
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
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
              const isSelected = selectedEmpresa.CODIGO === empresa.CODIGO;
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
                      ? "border border-[#16804D]/20 bg-[#16804D]/5"
                      : "border border-transparent hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isSelected ? "bg-[#16804D]/10" : "bg-gray-100"}`}>
                    <Building2 className={`h-4 w-4 ${isSelected ? "text-[#16804D]" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${isSelected ? "text-[#16804D]" : "text-gray-900"}`}>
                      {empresa.NOMEABREVIADO || empresa.RAZAOSOCIAL}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {empresa.CIDADE} • {empresa.CNPJ}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-[#16804D]" />
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
