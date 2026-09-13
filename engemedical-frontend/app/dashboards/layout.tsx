'use client';

import { logout } from '@/lib/utils';
import { AppShell } from '@/components/shared/AppShell';

export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell onLogout={logout}>
      {children}
    </AppShell>
  );
}
