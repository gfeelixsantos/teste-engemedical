'use client';

import { SidebarMenu } from '@/components/shared/SidebarMenu';
import { HeaderApp } from '@/components/shared/HeaderApp';
import { logout } from '@/lib/utils';

export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-brand-surface">
      <HeaderApp onLogout={logout} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          aria-label="Menu lateral dos dashboards"
          className="w-56 min-h-0 shrink-0 overflow-y-auto border-r border-white/10 bg-brand-deep shadow-[8px_0_24px_rgba(4,21,31,0.14)] scrollbar-hidden"
        >
          <div className="p-3 pt-4">
            <SidebarMenu />
          </div>
        </aside>

        <main className="min-w-0 min-h-0 flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
