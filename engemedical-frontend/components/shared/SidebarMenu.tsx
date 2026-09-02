"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Stethoscope,
  Users,
  ChartNoAxesCombined,
  FileText,
  CalendarDays,
  Settings,
  LayoutGrid,
} from "lucide-react";

const NAV_ITEMS = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Atendimento", icon: Stethoscope, path: "/atendimento" },
  { title: "Recepção", icon: Users, path: "/recepcao" },
  { title: "Relatórios", icon: ChartNoAxesCombined, path: "/relatorio" },
  { title: "Prontuários", icon: FileText, path: "/prontuarios" },
] as const;

const SECONDARY_ITEMS = [
  { title: "Agenda", icon: CalendarDays, path: "/agenda" },
  { title: "Configurações", icon: Settings, path: "/configuracoes" },
  { title: "Serviços", icon: LayoutGrid, path: "/servicos" },
] as const;

export function SidebarMenu() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + "/");

  return (
    <nav
      aria-label="Menu de navegação"
      className="space-y-1"
      role="navigation"
    >
      {/* Nav items principais */}
      {NAV_ITEMS.map(({ title, icon: Icon, path }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            aria-current={active ? "page" : undefined}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              active
                ? "bg-brand-50 text-brand-700 border border-brand-500/30"
                : "text-gray-600 hover:bg-brand-mist hover:text-gray-900 border border-transparent hover:border-brand-line"
            }`}
            type="button"
            onClick={() => router.push(path)}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border shadow-sm transition-all ${
                active
                  ? "border-brand-500/40 bg-brand-100 text-brand-600"
                  : "border-brand-line bg-white text-brand-blue group-hover:border-brand-green-300 group-hover:bg-brand-mist group-hover:text-brand-green-600"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{title}</span>
          </button>
        );
      })}

      {/* Separador */}
      <div className="my-2 border-t border-gray-200" />

      {/* Nav items secundários */}
      {SECONDARY_ITEMS.map(({ title, icon: Icon, path }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
            type="button"
            onClick={() => router.push(path)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{title}</span>
          </button>
        );
      })}
    </nav>
  );
}
