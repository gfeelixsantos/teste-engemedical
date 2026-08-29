"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { HeaderApp } from "@/components/shared/HeaderApp";
import { FileExplorer } from "@/components/shared/FileExplorer";
import { getCurrentUser, logout } from "@/lib/utils";

export default function ArquivosPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-default-50">
      <HeaderApp onLogout={logout}>
        <h1 className="text-lg font-semibold">Gestao de Arquivos</h1>
      </HeaderApp>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
        <FileExplorer />
      </main>
    </div>
  );
}
