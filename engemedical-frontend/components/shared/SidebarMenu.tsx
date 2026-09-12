"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getHomeRoute } from "@/lib/user/home-route.mjs";
import { getCurrentUser } from "@/lib/utils";
import {
  Activity, ChartNoAxesCombined, ChevronRight, FileCheck, FileText, Globe,
  HeartPulse, Home, LayoutGrid, Settings, Stethoscope, TrendingUp, UserX, Users,
  CalendarDays,
} from "lucide-react";

type MenuItem = { title: string; icon: typeof Home; path: string; color?: string };
type MenuGroup = { title: string; icon: typeof Home; items: readonly MenuItem[] };

const GROUPS: readonly MenuGroup[] = [
  { title: "Atendimento", icon: Stethoscope, items: [
    { title: "Atendimento", icon: Stethoscope, path: "/atendimento" },
    { title: "Prontuários", icon: FileText, path: "/prontuarios" },
    { title: "Recepção", icon: Users, path: "/recepcao" },
  ]},
  { title: "Informativos", icon: ChartNoAxesCombined, items: [
    { title: "Absenteísmo", icon: UserX, path: "/dashboards/absenteismo", color: "text-orange-500" },
    { title: "Convocação de exames", icon: Activity, path: "/dashboards/convocacao" },
    { title: "Documentos SST", icon: FileCheck, path: "/dashboards/documentos", color: "text-teal-500" },
    { title: "eSocial", icon: Globe, path: "/dashboards/esocial", color: "text-purple-500" },
    { title: "Gestão de vidas", icon: HeartPulse, path: "/dashboards/vidas", color: "text-green-500" },
    { title: "Relatórios", icon: ChartNoAxesCombined, path: "/relatorio" },
    { title: "Volumetria", icon: TrendingUp, path: "/dashboards/volumetria", color: "text-indigo-500" },
  ]},
  { title: "Serviços", icon: LayoutGrid, items: [
    { title: "Agenda Compromissos", icon: CalendarDays, path: "/agenda" },
    { title: "Campanhas de e-mail", icon: LayoutGrid, path: "/servicos?tab=campanhas" },
    { title: "Explorador de arquivos", icon: FileText, path: "/servicos?tab=arquivos" },
    { title: "Filas de processamento", icon: Activity, path: "/servicos?tab=filas" },
    { title: "Painel de serviços", icon: LayoutGrid, path: "/servicos" },
  ]},
  { title: "Configurações", icon: Settings, items: [
    { title: "Configurações", icon: Settings, path: "/configuracoes" },
  ]},
] as const;

const isActivePath = (pathname: string | null, path: string) => {
  const cleanPath = path.split("?")[0];
  return pathname === cleanPath || pathname?.startsWith(`${cleanPath}/`);
};

export function SidebarMenu({
  collapsed = false,
  inlineSubmenus = false,
  openOnHover = true,
  onSubmenuChange,
}: {
  collapsed?: boolean;
  inlineSubmenus?: boolean;
  openOnHover?: boolean;
  onSubmenuChange?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const homeRoute = getHomeRoute(getCurrentUser());
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 16, left: 280 });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateOpenGroup = (group: string | null) => {
    setOpenGroup(group);
    onSubmenuChange?.(group !== null);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => updateOpenGroup(null), 140);
  };

  const openGroupAt = (title: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setSubmenuPosition({
      top: Math.max(12, Math.min(rect.top, window.innerHeight - 420)),
      left: rect.right + 10,
    });
    updateOpenGroup(title);
  };

  const activateGroup = (title: string, element: HTMLElement) => {
    if (inlineSubmenus) {
      updateOpenGroup(title);
      return;
    }
    openGroupAt(title, element);
  };

  useEffect(() => () => cancelClose(), []);
  useEffect(() => {
    const activeGroup = GROUPS.find((group) => group.items.some((item) => isActivePath(pathname, item.path)));
    if (activeGroup) updateOpenGroup(activeGroup.title);
  }, [pathname]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") updateOpenGroup(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const goTo = (path: string) => {
    updateOpenGroup(null);
    router.push(path);
  };

  return (
    <nav aria-label="Menu de navegação" className="space-y-1" role="navigation">
      <button
        type="button"
        aria-current={pathname === "/visao-geral" || pathname === "/inicio" ? "page" : undefined}
        className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${pathname === "/visao-geral" || pathname === "/inicio" ? "border-brand-500/30 bg-brand-50 text-brand-700" : "border-transparent text-gray-600 hover:border-brand-line hover:bg-brand-mist hover:text-gray-900"}`}
        onClick={() => goTo(homeRoute)}
      >
        <Home className="h-4 w-4 shrink-0 text-brand-blue" />
        <span className={collapsed ? "sr-only" : "truncate"}>Página Inicial</span>
      </button>

      <div className="my-2 border-t border-gray-200" />

      {GROUPS.map(({ title, icon: Icon, items }) => {
        const active = items.some((item) => isActivePath(pathname, item.path));
        const open = openGroup === title;
        return (
          <div
            key={title}
            className="relative"
            onMouseEnter={(event) => {
              cancelClose();
              if (openOnHover && !inlineSubmenus) {
                openGroupAt(title, event.currentTarget.querySelector<HTMLButtonElement>("button") ?? event.currentTarget);
              }
            }}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="menu"
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${active ? "border-brand-500/30 bg-brand-50 text-brand-700" : "border-transparent text-gray-600 hover:border-brand-line hover:bg-brand-mist hover:text-gray-900"}`}
              onClick={(event) => open ? updateOpenGroup(null) : activateGroup(title, event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (open) updateOpenGroup(null);
                  else activateGroup(title, event.currentTarget);
                }
              }}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-500" : "text-brand-blue"}`} />
              <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{title}</span>
              {!collapsed && <ChevronRight className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "translate-x-0.5 text-brand-500" : "text-gray-400"}`} />}
            </button>

            {open && (
              <div
                aria-label={`Itens de ${title}`}
                className={`${inlineSubmenus ? "relative left-0 top-0 mt-1 ml-3 w-[calc(100%-0.75rem)] shadow-none" : "fixed z-[1000] max-h-[calc(100vh-1.5rem)] w-64 shadow-[0_18px_48px_rgba(0,69,96,0.14)]"} overflow-y-auto scrollbar-hidden rounded-2xl border border-brand-200/80 bg-white p-2`}
                role="menu"
                style={inlineSubmenus ? undefined : submenuPosition}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="border-b border-brand-200/80 px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">{title}</div>
                <div className="mt-1 space-y-0.5">
                  {items.map(({ title: itemTitle, icon: ItemIcon, path, color }) => {
                    const itemActive = isActivePath(pathname, path);
                    return (
                      <button
                        key={path}
                        type="button"
                        role="menuitem"
                        aria-current={itemActive ? "page" : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${itemActive ? "border-brand-500/30 bg-brand-50 font-semibold text-brand-700 shadow-sm shadow-brand-500/10" : "border-transparent text-gray-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-900"}`}
                        onClick={() => goTo(path)}
                      >
                        <ItemIcon className={`h-4 w-4 shrink-0 ${itemActive ? "text-brand-500" : color ?? "text-brand-blue"}`} />
                        <span className="truncate">{itemTitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
