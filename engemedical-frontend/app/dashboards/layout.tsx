'use client';

import { SidebarMenu } from '@/components/shared/SidebarMenu';

export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        aria-label="Menu lateral dos dashboards"
        className="w-64 shrink-0 bg-white border-r border-gray-200 shadow-lg overflow-y-auto"
      >
        <div className="p-4 pt-5">
          <SidebarMenu />
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
