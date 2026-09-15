"use client";

import { useEmpresas } from "@/components/cliente/EmpresaProvider";
import { Building2, HeartPulse } from "lucide-react";

export default function GestaoEpiPage() {
  const { selectedEmpresa } = useEmpresas();

  if (!selectedEmpresa) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-sm text-white/50">Selecione uma empresa para continuar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Gestão de EPI</h1>
        <p className="mt-1 text-sm text-white/60">
          Controle de Equipamentos de Proteção Individual - {selectedEmpresa.NOMEABREVIADO || selectedEmpresa.RAZAOSOCIAL}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="text-center">
          <HeartPulse className="mx-auto h-12 w-12 text-brand-cyan/40" />
          <h2 className="mt-4 text-lg font-semibold text-white">Módulo em desenvolvimento</h2>
          <p className="mt-2 text-sm text-white/50">
            Esta funcionalidade será implementada em breve.
          </p>
        </div>
      </div>
    </div>
  );
}