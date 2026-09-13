"use client";

import { HeaderApp } from "./HeaderApp";
import { SidebarMenu } from "./SidebarMenu";

interface AppShellProps {
  children: React.ReactNode;
  onLogout: () => void;
  showSidebar?: boolean;
  sidebarContent?: React.ReactNode;
  headerChildren?: React.ReactNode;
  sidebarClassName?: string;
  mainClassName?: string;
}

export function AppShell({
  children,
  onLogout,
  showSidebar = true,
  sidebarContent,
  headerChildren,
  sidebarClassName,
  mainClassName,
}: AppShellProps) {
  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-brand-surface">
      <HeaderApp onLogout={onLogout}>{headerChildren}</HeaderApp>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {showSidebar && (
          <aside
            aria-label="Menu lateral"
            className={`w-56 min-h-0 shrink-0 overflow-y-auto border-r border-white/10 bg-brand-deep shadow-[8px_0_24px_rgba(4,21,31,0.14)] scrollbar-hidden ${sidebarClassName ?? ""}`}
          >
            <div className="p-3 pt-4">
              {sidebarContent ?? <SidebarMenu />}
            </div>
          </aside>
        )}

        <main
          className={`min-w-0 min-h-0 flex-1 overflow-auto bg-gray-50 ${mainClassName ?? ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
