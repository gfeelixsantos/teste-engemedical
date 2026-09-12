"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Command, Search } from "lucide-react";

import { SIDEBAR_GROUPS } from "./SidebarMenu";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type CommandItem = {
  title: string;
  group: string;
  path: string;
  icon: typeof SIDEBAR_GROUPS[number]["icon"];
  color?: string;
};

const COMMAND_ITEMS: CommandItem[] = SIDEBAR_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    title: item.title,
    group: group.title,
    path: item.path,
    icon: item.icon,
    color: item.color,
  })),
);

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedQuery) return COMMAND_ITEMS;

    return COMMAND_ITEMS.filter((item) =>
      `${item.title} ${item.group} ${item.path}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedQuery),
    );
  }, [query]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) onClose();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setSelectedIndex((current) =>
      Math.min(current, Math.max(filteredItems.length - 1, 0)),
    );
  }, [filteredItems.length]);

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) =>
        filteredItems.length ? (current + 1) % filteredItems.length : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) =>
        filteredItems.length
          ? (current - 1 + filteredItems.length) % filteredItems.length
          : 0,
      );
      return;
    }

    if (event.key === "Enter" && filteredItems[selectedIndex]) {
      event.preventDefault();
      navigateTo(filteredItems[selectedIndex].path);
    }
  };

  if (!open) return null;

  return (
    <div
      aria-label="Busca global"
      className="fixed inset-0 z-[1200] flex items-start justify-center bg-brand-navy/35 px-4 pt-[12vh] backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="command-palette-title"
        aria-modal="true"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-brand-cyan/30 bg-brand-navy shadow-[0_24px_80px_rgba(4,21,31,0.35)]"
        role="dialog"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-cyan" />
          <input
            ref={inputRef}
            aria-label="Buscar páginas e ações"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
            placeholder="Buscar páginas e ações..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[10px] font-semibold text-white/55 sm:flex">
            <Command className="h-3 w-3" />
            K
          </kbd>
        </div>

        <div className="flex items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-cyan">
          <span id="command-palette-title">Navegação rápida</span>
          <span className="normal-case tracking-normal text-white/35">
            {filteredItems.length} resultados
          </span>
        </div>

        <div className="max-h-[min(28rem,55vh)] overflow-y-auto px-2 pb-2">
          {filteredItems.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-white/55">
              Nenhuma página encontrada.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const selected = index === selectedIndex;

              return (
                <button
                  key={item.path}
                  type="button"
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${selected ? "border-brand-cyan/45 bg-brand-teal text-white" : "border-transparent text-white/75 hover:border-brand-cyan/25 hover:bg-white/10 hover:text-white"}`}
                  onClick={() => navigateTo(item.path)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10">
                    <Icon className={`h-4 w-4 ${selected ? "text-brand-cyan" : item.color ?? "text-brand-cyan"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-white/40">{item.group}</span>
                  </span>
                  <ArrowRight className={`h-4 w-4 shrink-0 ${selected ? "text-brand-cyan" : "text-white/25"}`} />
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-white/10 px-4 py-2 text-[11px] text-white/40">
          Use ↑ ↓ para navegar · Enter para abrir · Esc para fechar
        </div>
      </div>
    </div>
  );
}
