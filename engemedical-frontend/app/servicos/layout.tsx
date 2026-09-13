"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shared/AppShell";
import { getCurrentUser, logout } from "@/lib/utils";

export default function ServicosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getCurrentUser()) router.push("/");
  }, [router]);

  return (
    <AppShell
      onLogout={() => {
        logout();
        router.push("/");
      }}
    >
      {children}
    </AppShell>
  );
}
