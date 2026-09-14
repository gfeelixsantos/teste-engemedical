"use client";

import { useEffect } from "react";
import { ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shared/AppShell";
import { AutomationPageHeader } from "@/components/shared/AutomationPageHeader";
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
          <AutomationPageHeader
            icon={ScanLine}
            title="Coleta de Resultados"
            subtitle="Acompanhe a coleta e a disponibilidade dos resultados dos prestadores."
          />

          <ScraperMonitor />
        </div>
      </div>
    </AppShell>
  );
}
