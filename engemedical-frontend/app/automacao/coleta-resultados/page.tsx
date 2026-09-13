"use client";

import { useEffect } from "react";
import { ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shared/AppShell";
import { getCurrentUser, logout } from "@/lib/utils";

import { ScraperMonitor } from "@/app/dashboard/components/ScraperMonitor";

export default function ColetaResultadosPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push("/");
    }
  }, [router]);

  return (
    <AppShell
      onLogout={() => {
        logout();
        router.push("/");
      }}
    >
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Automações
            </p>
            <div className="mt-1 flex items-center gap-3">
              <ScanLine className="h-7 w-7 shrink-0 text-[#00A63C]" strokeWidth={3} />
              <h1 className="text-3xl font-bold tracking-tight text-brand-700">
                Coleta de Resultados
              </h1>
            </div>
            <p className="ml-10 mt-2 max-w-3xl text-sm text-slate-600">
              Acompanhe a coleta e a disponibilidade dos resultados dos prestadores.
            </p>
          </div>

          <ScraperMonitor />
        </div>
      </div>
    </AppShell>
  );
}
