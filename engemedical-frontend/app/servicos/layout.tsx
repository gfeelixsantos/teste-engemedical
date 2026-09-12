"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { HeaderApp } from "@/components/shared/HeaderApp";
import { SidebarMenu } from "@/components/shared/SidebarMenu";
import { getCurrentUser, logout } from "@/lib/utils";

export default function ServicosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getCurrentUser()) router.push("/");
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

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
