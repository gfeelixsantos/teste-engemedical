"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEmpresas, EmpresaStatus } from "./EmpresaProvider";
import { CadastroEmpresa } from "@/lib/soc/interfaces/CadastroEmpresa";
import {
  ChevronRight, Home, UserPlus, Users, ShieldCheck,
  BarChart, Network, Wallpaper, Settings,
  Building2, AlertTriangle, Mail, HelpCircle, Search,
} from "lucide-react";

type MenuItem = {
  title: string;
  icon: typeof Home;
  path: string;
  showAdmission?: boolean;
};

const MENU_ITEMS: readonly MenuItem[] = [
  { title: "Funcionários", icon: Users, path: "/cliente/funcionarios", showAdmission: true },
  { title: "Gestão de EPI", icon: ShieldCheck, path: "/cliente/gestao-epi" },
  { title: "Estatísticas", icon: BarChart, path: "/cliente/estatisticas" },
  { title: "Estrutura", icon: Network, path: "/cliente/estrutura" },
  { title: "Divulgações", icon: Wallpaper, path: "/cliente/mural-digital" },
] as const;

const NO_COMPANY_ITEMS: readonly MenuItem[] = [
  { title: "Minha Conta", icon: Settings, path: "/cliente/minha-conta" },
] as const;

const STATUS_MESSAGES: Record<EmpresaStatus, { title: string; description: string; icon: typeof AlertTriangle }> = {
  loading: { title: "Carregando...", description: "Verificando suas empresas", icon: AlertTriangle },
  empty_registration_code: {
    title: "Código de acesso não encontrado",
    description: "Seu cadastro não possui um código de empresa válido. Entre em contato com o suporte para regularizar seu acesso.",
    icon: HelpCircle,
  },
  no_companies: {
    title: "Nenhuma empresa vinculada",
    description: "Nenhuma empresa foi encontrada para sua conta. Entre em contato com o suporte para vincular sua empresa.",
    icon: Building2,
  },
  missing_companies: {
    title: "Empresas parcialmente carregadas",
    description: "Algumas empresas não foram encontradas no sistema. O acesso às empresas disponíveis continua normal.",
    icon: AlertTriangle,
  },
  error: {
    title: "Erro ao carregar empresas",
    description: "Ocorreu um erro ao carregar suas empresas. Tente novamente ou entre em contato com o suporte.",
    icon: AlertTriangle,
  },
  ok: { title: "", description: "", icon: AlertTriangle },
};

const isActivePath = (pathname: string | null, path: string) => {
  const cleanPath = path.split("?")[0];
  return pathname === cleanPath || pathname?.startsWith(`${cleanPath}/`);
};

function SidebarEmptyState({ status, missingCodes }: { status: EmpresaStatus; missingCodes: string[] }) {
  const info = STATUS_MESSAGES[status];
  const Icon = info.icon;

  if (status === "ok" || status === "loading") return null;

  return (
    <div className="mx-2 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-700">{info.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800/80">{info.description}</p>
          {missingCodes.length > 0 && (
            <p className="mt-2 text-[10px] text-amber-700/70">
              Códigos não encontrados: {missingCodes.join(", ")}
            </p>
          )}
          <a
            href="mailto:suporte@engemedical.com.br"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-500/20"
          >
            <Mail className="h-3 w-3" />
            Contatar suporte
          </a>
        </div>
      </div>
    </div>
  );
}

export function SidebarCliente({
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
  const { empresas, selectedEmpresa, setSelectedEmpresa, isLoading, status, missingCodes } = useEmpresas();

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [submenuPos, setSubmenuPos] = useState({ top: 16, left: 280 });
  const [empresaSearch, setEmpresaSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpenGroup(null);
      setEmpresaSearch("");
      onSubmenuChange?.(false);
    }, 140);
  };

  const openGroupAt = (title: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const empresaCount = empresas.length || 1;
    const estimatedHeight = Math.min(empresaCount * 40 + 80, window.innerHeight - 24);
    const top = Math.max(12, Math.min(rect.top, window.innerHeight - estimatedHeight - 12));
    setSubmenuPos({ top, left: rect.right + 10 });
    setOpenGroup(title);
    setEmpresaSearch("");
    onSubmenuChange?.(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const goTo = (path: string, empresa: CadastroEmpresa) => {
    setSelectedEmpresa(empresa);
    setOpenGroup(null);
    setEmpresaSearch("");
    onSubmenuChange?.(false);
    router.push(path);
  };

  useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenGroup(null);
        setEmpresaSearch("");
        onSubmenuChange?.(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSubmenuChange]);

  if (isLoading) {
    return (
      <nav aria-label="Menu de navegação" className="space-y-0.5" role="navigation">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-white/10" />
          ))}
        </div>
      </nav>
    );
  }

  const filteredEmpresas = (term: string) => {
    const list = [...empresas]
      .filter((e) => {
        if (!term.trim()) return true;
        const t = term.toLowerCase();
        const name = (e.NOMEABREVIADO || e.RAZAOSOCIAL || "").toLowerCase();
        const cnpj = (e.CNPJ || "").toLowerCase();
        return name.includes(t) || cnpj.includes(t);
      })
      .sort((a, b) =>
        (a.NOMEABREVIADO || a.RAZAOSOCIAL || "").localeCompare(b.NOMEABREVIADO || b.RAZAOSOCIAL || "", "pt-BR")
      );
    return list;
  };

  const renderMenuItem = (item: MenuItem) => {
    const active =
      isActivePath(pathname, item.path) ||
      Boolean(item.showAdmission && isActivePath(pathname, "/cliente/admissao"));
    const isGroupOpen = openGroup === item.title;

    return (
      <div
        key={item.title}
        className="relative"
        onMouseEnter={(event) => {
          cancelClose();
          if (openOnHover && !inlineSubmenus) {
            openGroupAt(item.title, event.currentTarget.querySelector<HTMLButtonElement>("button") ?? event.currentTarget);
          }
        }}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          aria-expanded={isGroupOpen}
          aria-haspopup="menu"
          className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#16804D]/30 ${active ? "border-[#A9D8BB] bg-[#D6EDE0] text-[#173D2B] shadow-sm shadow-[#16804D]/10" : "border-transparent text-[#173D2B]/75 hover:border-[#C5E2D0] hover:bg-[#E5F3EA] hover:text-[#173D2B]"}`}
          onClick={(event) => {
            if (empresas.length === 1 && !item.showAdmission) {
              goTo(item.path, empresas[0]);
              return;
            }
            if (isGroupOpen) {
              setOpenGroup(null);
              onSubmenuChange?.(false);
            } else if (inlineSubmenus) {
              setOpenGroup(item.title);
              onSubmenuChange?.(true);
            } else {
              openGroupAt(item.title, event.currentTarget);
            }
          }}
        >
          <item.icon className="h-4 w-4 shrink-0 text-[#16804D]" />
          <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{item.title}</span>
          {!collapsed && (
            <ChevronRight className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isGroupOpen ? "translate-x-0.5 text-[#16804D]" : "text-[#6A8A78]/60"}`} />
          )}
        </button>

        {isGroupOpen && (
          <div
            aria-label={`Empresas para ${item.title}`}
            className={`${inlineSubmenus ? "relative left-0 top-0 mt-1 ml-3 w-[calc(100%-0.75rem)] shadow-none" : "fixed z-[1000] max-h-[calc(100vh-1.5rem)] w-64 shadow-[0_18px_45px_rgba(20,79,45,0.12)]"} flex flex-col overflow-hidden rounded-2xl border border-[#B9DCC7] bg-[#F9FDFC]`}
            role="menu"
            style={inlineSubmenus ? undefined : submenuPos}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="bg-[#2F7D56] px-3 pb-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
              {item.title}
            </div>

            {empresas.length > 5 && (
              <div className="px-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6A8A78]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar empresa..."
                    value={empresaSearch}
                    onChange={(e) => setEmpresaSearch(e.target.value)}
                    className="w-full rounded-lg border border-[#C5E2D0] bg-white/80 py-1.5 pl-7 pr-2 text-xs text-[#173D2B] placeholder-[#6A8A78] outline-none transition-colors focus:border-[#16804D] focus:bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEmpresaSearch("");
                        searchInputRef.current?.blur();
                      }
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-1 max-h-[280px] space-y-0.5 overflow-y-auto scrollbar-hidden p-2 pt-1">
              {filteredEmpresas(empresaSearch).map((empresa) => {
                const isEmpresaActive = active && String(selectedEmpresa?.CODIGO) === String(empresa.CODIGO);
                const empresaLabel = empresa.NOMEABREVIADO || empresa.RAZAOSOCIAL;
                return (
                  <div key={String(empresa.CODIGO)} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      aria-label={`Abrir funcionários de ${empresaLabel}`}
                      aria-current={isEmpresaActive ? "page" : undefined}
                      className={`group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all ${isEmpresaActive ? "border-[#A9D8BB] bg-[#D6EDE0] font-semibold text-[#173D2B]" : "border-transparent text-[#173D2B]/75 hover:border-[#C5E2D0] hover:bg-[#E5F3EA] hover:text-[#173D2B]"}`}
                      onClick={() => goTo(item.path, empresa)}
                    >
                      <span className="min-w-0 flex-1 truncate">{empresaLabel}</span>
                    </button>

                    {item.showAdmission && (
                      <button
                        type="button"
                        role="menuitem"
                        aria-label={`Admissão em ${empresaLabel}`}
                        className="group flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-2 text-left text-xs font-medium whitespace-nowrap text-[#16804D]/85 transition-all hover:border-[#C5E2D0] hover:bg-[#E5F3EA] hover:text-[#173D2B]"
                        onClick={() => goTo("/cliente/admissao", empresa)}
                      >
                        <UserPlus className="h-3.5 w-3.5 shrink-0 text-[#16804D]" />
                        <span className="truncate">Admissão</span>
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredEmpresas(empresaSearch).length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-[#6A8A78]">
                  Nenhuma empresa encontrada
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav aria-label="Menu de navegação" className="space-y-0.5" role="navigation">
      <button
        type="button"
        aria-current={pathname === "/cliente" ? "page" : undefined}
        className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#16804D]/30 ${pathname === "/cliente" ? "border-[#A9D8BB] bg-[#D6EDE0] text-[#173D2B] shadow-sm shadow-[#16804D]/10" : "border-transparent text-[#173D2B]/75 hover:border-[#C5E2D0] hover:bg-[#E5F3EA] hover:text-[#173D2B]"}`}
        onClick={() => router.push("/cliente")}
      >
        <Home className="h-4 w-4 shrink-0 text-[#16804D]" />
        <span className={collapsed ? "sr-only" : "truncate"}>Página Inicial</span>
      </button>

      <div className="my-2 border-t border-[#C5E2D0]" />

      <SidebarEmptyState status={status} missingCodes={missingCodes} />

      {empresas.length === 0 && status !== "empty_registration_code" && status !== "no_companies" ? (
        <div className="px-3 py-4 text-center text-sm text-[#5E7F6C]">
          Nenhuma empresa encontrada
        </div>
      ) : empresas.length === 0 ? null : (
        MENU_ITEMS.map(renderMenuItem)
      )}

      {NO_COMPANY_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.path);
        return (
          <button
            key={item.title}
            type="button"
            aria-current={active ? "page" : undefined}
        className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#16804D]/30 ${active ? "border-[#A9D8BB] bg-[#D6EDE0] text-[#173D2B] shadow-sm shadow-[#16804D]/10" : "border-transparent text-[#173D2B]/75 hover:border-[#C5E2D0] hover:bg-[#E5F3EA] hover:text-[#173D2B]"}`}
            onClick={() => router.push(item.path)}
          >
            <item.icon className="h-4 w-4 shrink-0 text-[#16804D]" />
            <span className={collapsed ? "sr-only" : "truncate"}>{item.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
