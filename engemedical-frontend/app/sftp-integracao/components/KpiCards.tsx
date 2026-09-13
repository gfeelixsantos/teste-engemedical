"use client";

import { motion } from "framer-motion";
import { Activity, Calendar, Clock, Download } from "lucide-react";
import type { SftpKpis } from "@/sftp-integracao/types";
import {
  getStatusLabel,
  getStatusColor,
  formatShortDate,
  formatTime,
} from "@/lib/sftp-utils";

const COLORS = {
  primary: "from-brand-100 to-brand-200",
  surface: "bg-white",
  surfaceAlt: "bg-brand-surface",
  border: "border-brand-line",
  textDark: "text-brand-midnight",
  textMuted: "text-brand-muted",
  accent: "text-brand-700",
  success: "bg-brand-green-100 text-brand-green-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
} as const;

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Activity;
  gradient?: string;
  iconColor?: string;
  valueColor?: string;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient = COLORS.primary,
  iconColor = "text-white",
  valueColor = COLORS.textDark,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-xl border ${COLORS.border} ${COLORS.surface} p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md`}
    >
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={`text-xs font-semibold leading-tight ${COLORS.textMuted}`}
          >
            {title}
          </p>
          <p
            className={`mt-2 font-display text-xl font-extrabold tracking-tight ${valueColor}`}
          >
            {value}
          </p>
          {subtitle && <p className="text-xs text-brand-muted">{subtitle}</p>}
        </div>
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${gradient} shadow-sm transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
  );
}

interface KpiCardsProps {
  kpis: SftpKpis;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const statusColor = kpis.lastExecutionStatus
    ? getStatusColor(kpis.lastExecutionStatus)
    : "text-gray-500";

  const statusLabel = kpis.lastExecutionStatus
    ? getStatusLabel(kpis.lastExecutionStatus)
    : "Sem dados";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total de Execuções"
        value={kpis.totalExecutions}
        subtitle="Execuções processadas"
        icon={Activity}
        gradient="from-brand-100 to-brand-200"
      />
      <KpiCard
        title="Planilhas Baixadas"
        value={kpis.totalFiles}
        subtitle="Arquivos recebidos via SFTP"
        icon={Download}
        gradient="from-brand-green-100 to-brand-green-200"
        iconColor="text-brand-green-700"
      />
      <KpiCard
        title="Última Execução"
        value={kpis.lastExecutionDate ? formatShortDate(kpis.lastExecutionDate) : "--/--/----"}
        subtitle={`${statusLabel} • ${kpis.lastExecutionTime ? formatTime(kpis.lastExecutionTime) : "--:--"}`}
        icon={Clock}
        gradient="from-brand-cyan-100 to-brand-100"
        iconColor="text-brand-700"
        valueColor={statusColor}
      />
      <KpiCard
        title="Próxima Execução"
        value={
          kpis.nextScheduledExecution
            ? new Date(kpis.nextScheduledExecution).toLocaleTimeString(
                "pt-BR",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )
            : "--:--"
        }
        subtitle={kpis.cronEnabled ? "Agendamento ativo" : "Cron desativado"}
        icon={Calendar}
        gradient={
          kpis.cronEnabled
            ? "from-brand-100 to-brand-green-100"
            : "from-slate-100 to-slate-200"
        }
        iconColor={
          kpis.cronEnabled ? "text-brand-green-700" : "text-brand-muted"
        }
      />
    </div>
  );
}
