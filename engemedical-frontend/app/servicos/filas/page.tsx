"use client";

import { Activity } from "lucide-react";

import { ActiveConnectionsCard } from "@/components/shared/ActiveConnectionsCard";
import { QueueMonitor } from "@/app/servicos/components/QueueMonitor";
import { ScheduledJobsMonitor } from "@/app/servicos/components/ScheduledJobsMonitor";
import { TicketsMonitor } from "@/app/servicos/components/TicketsMonitor";

export default function FilasPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/20">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">Serviços</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-midnight">Filas de processamento</h1>
          <p className="mt-2 text-sm text-slate-600">Monitore jobs, conexões e processamentos em segundo plano.</p>
        </div>
      </div>
      <div className="space-y-6">
        <ActiveConnectionsCard />
        <QueueMonitor />
        <TicketsMonitor />
        <ScheduledJobsMonitor />
      </div>
    </div>
  );
}
