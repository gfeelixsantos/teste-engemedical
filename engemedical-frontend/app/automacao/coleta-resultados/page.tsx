"use client";

import { useEffect } from "react";
import { ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";

import { HeaderApp } from "@/components/shared/HeaderApp";
import { SidebarMenu } from "@/components/shared/SidebarMenu";
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <HeaderApp
        onLogout={() => {
          logout();
          router.push("/");
        }}
      />

      <div className="flex min-h-[calc(100vh-4rem)] items-start">
        <aside
          aria-label="Menu principal"
          className="sticky top-16 relative z-[1000] hidden h-[calc(100vh-4rem)] w-56 shrink-0 self-start overflow-y-auto overscroll-contain scrollbar-hidden text-slate-900 lg:block"
        >
          <div className="min-h-full w-56 rounded-r-2xl border-r border-white/10 bg-brand-deep p-2.5 shadow-[8px_0_24px_rgba(4,21,31,0.14)]">
            <SidebarMenu openOnHover />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#28B1CF] to-[#006782] text-white shadow-lg shadow-[#28B1CF]/20">
                <ScanLine className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
                  Automação
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-midnight">
                  Coleta de Resultados
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Acompanhe o processamento, os provedores e a atualização dos resultados coletados.
                </p>
              </div>
            </div>

            <ScraperMonitor />
          </div>
        </main>
      </div>
    </div>
  );
}
