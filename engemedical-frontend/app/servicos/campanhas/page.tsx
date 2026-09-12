"use client";

import { Mail } from "lucide-react";

import { CampaignManager } from "@/app/servicos/components/campaigns/CampaignManager";

export default function CampanhasPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/20">
          <Mail className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">Serviços</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-midnight">Campanhas de e-mail</h1>
          <p className="mt-2 text-sm text-slate-600">Crie, personalize e acompanhe os comunicados enviados.</p>
        </div>
      </div>
      <CampaignManager />
    </div>
  );
}
