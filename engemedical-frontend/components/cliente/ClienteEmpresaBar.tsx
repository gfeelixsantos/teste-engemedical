"use client";

import { Building2 } from "lucide-react";
import { useEmpresas } from "./EmpresaProvider";

export function ClienteEmpresaBar({ label = "Empresa" }: { label?: string }) {
  const { empresas, selectedEmpresa, setSelectedEmpresa, isLoading } = useEmpresas();

  if (isLoading) return null;
  if (empresas.length <= 1) {
    if (!selectedEmpresa) return null;
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="font-medium">{selectedEmpresa.NOMEABREVIADO || selectedEmpresa.RAZAOSOCIAL}</span>
        {selectedEmpresa.CNPJ && <span className="text-xs text-gray-400">• {selectedEmpresa.CNPJ}</span>}
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <label htmlFor="cliente-empresa" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </label>
      <div className="relative w-full sm:max-w-md">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          id="cliente-empresa"
          value={selectedEmpresa ? String(selectedEmpresa.CODIGO) : ""}
          onChange={(e) => {
            const found = empresas.find((c) => String(c.CODIGO) === e.target.value);
            setSelectedEmpresa(found || null);
          }}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-gray-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
        >
          {empresas
            .slice()
            .sort((a, b) =>
              (a.NOMEABREVIADO || a.RAZAOSOCIAL || "").localeCompare(b.NOMEABREVIADO || b.RAZAOSOCIAL || "", "pt-BR"),
            )
            .map((c) => (
              <option key={String(c.CODIGO)} value={String(c.CODIGO)}>
                {c.NOMEABREVIADO || c.RAZAOSOCIAL} — {c.CNPJ || c.CODIGO}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
