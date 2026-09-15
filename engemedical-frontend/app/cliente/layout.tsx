"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shared/AppShell";
import { EmpresaProvider } from "@/components/cliente/EmpresaProvider";
import { SidebarCliente } from "@/components/cliente/SidebarCliente";
import { CompanySelector } from "@/components/cliente/CompanySelector";
import { getCurrentUser, logout } from "@/lib/utils";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }
    if (user.tipoUsuario !== "cliente") {
      router.push("/visao-geral");
    }
  }, [router]);

  return (
    <EmpresaProvider>
      <AppShell
        onLogout={() => {
          logout();
          router.push("/");
        }}
        showSearch={false}
        sidebarContent={<SidebarCliente />}
        sidebarClassName="border-[#CBE3D3] border-r border-r-gray-200 bg-[linear-gradient(180deg,#F6FBF8_0%,#EDF7F1_100%)] shadow-[2px_0_12px_rgba(0,0,0,0.06)]"
        headerChildren={<CompanySelector />}
      >
        {children}
      </AppShell>
    </EmpresaProvider>
  );
}
