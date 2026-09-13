"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Calendar,
  PlayCircle,
  PauseCircle,
  MapPin,
} from "lucide-react";
import type { SftpScheduleInfo } from "@/sftp-integracao/types";
import { formatShortDate, formatTime } from "@/lib/sftp-utils";

interface ScheduleInfoProps {
  schedule: SftpScheduleInfo;
}

export function ScheduleInfo({ schedule }: ScheduleInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-brand-line bg-white shadow-sm"
    >
      <div className="border-b border-brand-line bg-brand-surface/60 px-5 py-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-brand-700">
            Cronograma de Execuções
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              schedule.cronEnabled
                ? "bg-emerald-100 text-emerald-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {schedule.cronEnabled ? (
              <PlayCircle className="h-3 w-3" />
            ) : (
              <PauseCircle className="h-3 w-3" />
            )}
            {schedule.cronEnabled ? "Ativo" : "Inativo"}
          </span>
        </div>
        <p className="mt-1 text-sm text-brand-muted">{schedule.description}</p>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Human-readable schedule */}
          <div className="rounded-xl bg-brand-surface p-4">
            <div className="flex items-center gap-2 text-brand-muted">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Quando executamos</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-brand-midnight">
              {schedule.cronEnabled ? schedule.description : "Execução automática pausada"}
            </p>
          </div>

          {/* Timezone */}
          <div className="rounded-xl bg-brand-surface p-4">
            <div className="flex items-center gap-2 text-brand-muted">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">Timezone</span>
            </div>
            <p className="mt-2 text-sm text-brand-midnight">
              {schedule.timezone}
            </p>
          </div>

          {/* Last Execution */}
          <div className="rounded-xl bg-brand-surface p-4">
            <div className="flex items-center gap-2 text-brand-muted">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Última Execução</span>
            </div>
            <p className="mt-2 text-sm text-brand-midnight">
              {schedule.lastExecution
                ? `${formatShortDate(schedule.lastExecution)} às ${formatTime(schedule.lastExecution)}`
                : "Nenhuma execução registrada"}
            </p>
          </div>

          {/* Next Execution */}
          <div className="rounded-xl bg-brand-surface p-4">
            <div className="flex items-center gap-2 text-brand-muted">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Próxima Execução</span>
            </div>
            <p className="mt-2 text-sm text-brand-midnight">
              {schedule.nextExecution
                ? `${formatShortDate(schedule.nextExecution)} às ${formatTime(schedule.nextExecution)}`
                : "Aguardando..."}
            </p>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-4 border-t border-brand-line pt-3 text-xs text-brand-muted">
          O agendamento é acompanhado automaticamente pelo sistema. O horário exibido considera o fuso {schedule.timezone}.
        </div>
      </div>
    </motion.div>
  );
}
