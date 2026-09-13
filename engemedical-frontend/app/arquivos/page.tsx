"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shared/AppShell";
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
    <AppShell showSidebar={false} onLogout={logout}>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
        <FileExplorer />
      </main>
    </AppShell>
  );
}
