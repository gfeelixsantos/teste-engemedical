"use client";

import { Button, Tooltip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  AlertCircle,
  Users,
  FileText,
  Ticket,
  Activity,
  ChevronDown,
  ChevronUp,
  Calendar,
  Eye,
  EyeOff,
  Layers,
  Clock,
  Stethoscope,
  FlaskConical,
  Target,
  Gauge,
  Info,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";

import { ScraperMonitor } from "./ScraperMonitor";
import SlaChart from "./SlaChart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { TicketStatus } from "@/lib/ticket/ticket";
import {
  ExameStatisticsDto,
  StatisticsResponseDto,
  useStatistics,
  TempoPrimeiroExameDto,
  TempoPermanenciaDto,
} from "@/hooks/useStatictics";


// 🎨 Constantes de design
const COLORS = {
  primary: "#44735E",
  primaryLight: "#5a8a74",
  primaryDark: "#2a4d3d",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
};

// 🏷️ Mapeamento de status para exibição amigável
const STATUS_LABELS: Record<string, string> = {
  ATENDIMENTO: "Em Atendimento",
  EM_CHAMADA: "Em Chamada",
  AGUARDANDO_RESULTADOS: "Aguardando Resultados",
  AVALIACAO_MEDICA: "Avaliação Médica",
  AGUARDANDO_RESULTADO: "Aguardando Resultado",
  PENDENTE: "Pendente",
  PENDENTE_LABORATORIO: "Pendente Lab",
  FINALIZADO: "Finalizado",
  CONCLUIDO: "Concluído",
  AGENDADO: "Agendado",
  EM_ANALISE: "Em Análise",
};

// 🎯 Card de KPI principal
const KpiCard = ({
  title,
  value,
  icon: Icon,
  gradient = false,
  delay = 0,
}: {
  title: string;
  value: number | string;
  icon: any;
  gradient?: boolean;
  delay?: number;
}) => (
  <motion.div
    animate={{ opacity: 1, scale: 1 }}
    className={`rounded-xl shadow-lg p-5 ${
      gradient
        ? "bg-gradient-to-br from-[#44735E] to-[#2a4d3d] text-white"
        : "bg-white border border-gray-200"
    }`}
    initial={{ opacity: 0, scale: 0.95 }}
    transition={{ delay }}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p
          className={`text-sm font-medium mb-1 ${gradient ? "text-white/90" : "text-gray-700"}`}
        >
          {title}
        </p>
        <p
          className={`text-2xl font-bold ${gradient ? "text-white" : "text-gray-900"}`}
        >
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        gradient
          ? "bg-white/10 backdrop-blur-sm"
          : "bg-[#B8D864]/20 border border-[#B8D864]/30"
      }`}>
        <Icon className={`h-6 w-6 ${gradient ? "text-white" : "text-[#9BC24E]"}`} />
      </div>
    </div>
  </motion.div>
);

// 🏥 Card de métrica secundária (estilo dashboard antigo)
const MetricCard = ({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  valueColor,
}: {
  title: string;
  value: number;
  icon: any;
  iconColor?: string;
  iconBgColor?: string;
  valueColor?: string;
}) => (
  <article className="bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden">
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p
            className="text-2xl font-bold"
            style={{ color: valueColor || "#111827" }}
          >
            {value.toLocaleString("pt-BR")}
          </p>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
          style={{
            backgroundColor: iconBgColor || "rgba(184, 216, 100, 0.2)",
            color: iconColor || "#9BC24E",
            border: `1px solid ${iconColor ? iconColor + "30" : "rgba(184, 216, 100, 0.3)"}`,
          }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  </article>
);

// 📊 Barra de progresso horizontal
const ProgressBar = ({
  value,
  max,
  color = COLORS.primary,
  size = "md",
}: {
  value: number;
  max: number;
  color?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const heights = { sm: "h-1.5", md: "h-2", lg: "h-2.5" };

  return (
    <div className="w-full">
      <div
        className={`w-full bg-gray-200 rounded-full ${heights[size]} overflow-hidden`}
      >
        <motion.div
          animate={{ width: `${percentage}%` }}
          className={`${heights[size]} rounded-full transition-all duration-700 ease-out`}
          initial={{ width: 0 }}
          style={{ backgroundColor: color }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  );
};

// 🏷️ Badge de status
const StatusBadge = ({ status, count }: { status: string; count: number }) => {
  const getStatusConfig = (status: string) => {
    const normalized = status.toUpperCase();

    if (normalized.includes("PENDENTE")) {
      return { color: COLORS.warning, bg: "bg-yellow-50", label: "Pendente" };
    }
    if (
      normalized.includes("AGUARDANDO") ||
      normalized.includes("EM_ANALISE")
    ) {
      return { color: COLORS.info, bg: "bg-blue-50", label: "Em Andamento" };
    }
    if (normalized.includes("FINALIZADO") || normalized.includes("CONCLUIDO")) {
      return { color: COLORS.success, bg: "bg-green-50", label: "Finalizado" };
    }

    return { color: COLORS.primary, bg: "bg-gray-50", label: status };
  };

  const config = getStatusConfig(status);

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${config.bg} border`}
      style={{ borderColor: `${config.color}20` }}
    >
      <span className="font-bold" style={{ color: config.color }}>
        {count}
      </span>
      <span className="text-gray-600">{config.label}</span>
    </div>
  );
};

// 🎫 Card de ticket
const TicketCard = ({ ticket }: { ticket: any }) => {
  const preferencialPercent =
    ticket.total > 0 ? (ticket.preferencial / ticket.total) * 100 : 0;

  if (ticket.status !== TicketStatus.AGUARDANDO) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-purple-200 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-purple-600" />
          <span className="font-medium text-gray-900">{ticket.status}</span>
        </div>
        <span className="text-xl font-bold text-gray-900">{ticket.total}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Preferenciais</span>
          <span className="font-medium text-gray-900">
            {ticket.preferencial} ({preferencialPercent.toFixed(0)}%)
          </span>
        </div>
        <ProgressBar max={ticket.total} size="sm" value={ticket.preferencial} />
      </div>
    </div>
  );
};


// 📋 Card de exame
const ExamCard = ({
  exame,
  expanded = false,
}: {
  exame: ExameStatisticsDto;
  expanded?: boolean;
}) => {
  const pendentes =
    (exame.porStatus.PENDENTE || 0) + (exame.porStatus.PENDENTE_LABORATORIO || 0);
  const finalizados =
    (exame.porStatus.FINALIZADO || 0) +
    (exame.porStatus.CONCLUIDO || 0) +
    (exame.porStatus.AGUARDANDO_RESULTADO || 0);
  const total = exame.total;
  const percentFinalizado = total > 0 ? (finalizados / total) * 100 : 0;
  const tempoMedio = exame.tempoMedioEspera;

  const tempoColor =
    tempoMedio != null && tempoMedio > 0
      ? Math.round(tempoMedio) <= 15
        ? '#10b981'
        : Math.round(tempoMedio) <= 30
          ? '#f59e0b'
          : '#ef4444'
      : null;

  return (
    <div 
      className="bg-white rounded-lg p-4 hover:shadow-md transition-all border-2"
      style={{ borderColor: tempoColor ?? '#e5e7eb' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">
              {exame.nomeExame}
            </h4>
            {tempoMedio != null && tempoMedio > 0 && (
              <Tooltip
                content={
                  exame.tempoContexto === 'primeiro'
                    ? "Tempo médio desde a emissão do ticket até este exame"
                    : exame.tempoContexto === 'subsequente'
                      ? "Tempo médio desde o exame anterior"
                      : "Tempo médio de espera para este exame"
                }
                placement="top"
                showArrow
                offset={8}
              >
                <p
                  className="text-xs truncate leading-tight mt-0.5 cursor-help"
                  style={{ color: tempoColor ?? '#9ca3af' }}
                >
                  ~{Math.round(tempoMedio)} min de espera
                </p>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-500">total</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {pendentes > 0 && <StatusBadge count={pendentes} status="PENDENTE" />}
          {finalizados > 0 && (
            <StatusBadge count={finalizados} status="FINALIZADO" />
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progresso</span>
            <span
              className="font-medium"
              style={{
                color:
                  percentFinalizado >= 70 ? COLORS.success : COLORS.warning,
              }}
            >
              {percentFinalizado.toFixed(1)}%
            </span>
          </div>
          <ProgressBar
            color={percentFinalizado >= 70 ? COLORS.success : COLORS.warning}
            max={total}
            size="sm"
            value={finalizados}
          />
        </div>

        {expanded && (
          <motion.div
            animate={{ opacity: 1 }}
            className="pt-3 border-t border-gray-200"
            initial={{ opacity: 0 }}
          >
            <div className="text-xs space-y-1">
              {Object.entries(exame.porStatus)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-gray-600">
                      {(STATUS_LABELS[status] || status)
                        .toUpperCase()
                        .replace(/_/g, " ")}
                      :
                    </span>
                    <span className="font-medium text-gray-900">
                      {count as number}
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ⏱️ Gráfico: Tempo da Emissão ao Primeiro Exame
const TempoPrimeiroExameChart = ({
  data,
}: {
  data: TempoPrimeiroExameDto | null;
}) => {
  if (!data) return null;

  const faixasOrdenadas = ["0-15min", "15-30min", "30-60min", "1-2h", "2h+"];
  const chartData = faixasOrdenadas.map((faixa) => ({
    name: faixa,
    value: data.faixas[faixa] || 0,
  }));

  const faixaCor = (name: string) => {
    if (name === "0-15min") return "#10b981";
    if (name === "15-30min") return "#f59e0b";
    if (name === "30-60min") return "#f97316";
    if (name === "1-2h") return "#ef4444";
    return "#991b1b";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-gray-900">
          Emissão → Primeiro Exame
        </h4>
        <div className="flex items-center gap-2">
          {data.mediaMinutos != null && (
            <Tooltip
              content="Tempo médio entre a chegada e o primeiro exame"
              placement="bottom"
              showArrow
              offset={8}
            >
              <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 cursor-help">
                <Clock className="h-3 w-3" />
                Média: {Math.round(data.mediaMinutos)}min
              </div>
            </Tooltip>
          )}
          {data.medianaMinutos != null && (
            <Tooltip
              content="Metade dos funcionários esperou menos que isso, metade esperou mais"
              placement="bottom"
              showArrow
              offset={8}
            >
              <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-help">
                Mediana: {Math.round(data.medianaMinutos)}min
              </div>
            </Tooltip>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {data.totalComTempo} de {data.totalAgendamentos} agendamentos com horário registrado
      </p>
      {chartData.some((d) => d.value > 0) ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <RechartsTooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value: number) => [value, "Agendamentos"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={faixaCor(entry.name)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhum dado disponível
        </p>
      )}
    </div>
  );
};

// 📈 Gráfico: Permanência por Quantidade de Exames
const TempoPermanenciaChart = ({
  data,
  totalAgendamentos,
}: {
  data: TempoPermanenciaDto[];
  totalAgendamentos: number;
}) => {
  if (!data || data.length === 0) return null;

  const totalComTempo = data.reduce((sum, d) => sum + d.quantidade, 0);

  const chartData = data.map((d) => ({
    name: d.exames >= 5 ? "5+" : `${d.exames}`,
    minutos: Math.round(d.tempoMedioMinutos || 0),
    pessoas: d.quantidade,
  }));

  const cores = ["#44735E", "#5a8a74", "#70a18a", "#86b8a0", "#9ccfb6"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-sm font-semibold text-gray-900 mb-1">
        Tempo até o Último Exame por Qtde de Exames
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        {totalComTempo} de {totalAgendamentos} atendimentos — apenas fase de exames
      </p>
      {chartData.some((d) => d.minutos > 0) ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: "min",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                  style: { fill: "#9ca3af" },
                }}
              />
              <RechartsTooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number, name: string) => {
                  if (name === "minutos") return [`${value}min`, "Tempo médio"];
                  return [value, name];
                }}
              />
              <Bar dataKey="minutos" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={cores[idx % cores.length]}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {chartData.map((d) => (
              <div
                key={d.name}
                className="flex justify-between text-xs text-gray-600"
              >
                <span>
                  <span className="font-medium">{d.name}</span> exame
                  {d.name !== "1" ? "s" : ""} — {d.pessoas}{" "}
                  {d.pessoas === 1 ? "pessoa" : "pessoas"}
                </span>
                <span className="font-medium text-gray-800">{d.minutos}min</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhum dado disponível
        </p>
      )}
    </div>
  );
};

interface GlobalSlaData {
  faixas: Record<string, number>;
  totalComTempo: number;
  totalAgendamentos: number;
  slaPercent: number;
  stretchPercent: number;
  mediaMinutos: number | null;
  medianaMinutos: number | null;
}

// 🌍 Card de SLA Global (consolidado)
const GlobalSlaCard = ({
  sla,
  totalGeral,
}: {
  sla: GlobalSlaData;
  totalGeral: number;
}) => {
  const getGrade = (pct: number) => {
    if (pct >= 90) return { label: "A — Excelente", color: "#10b981", bg: "bg-green-50 border-green-200" };
    if (pct >= 75) return { label: "B — Bom", color: "#22c55e", bg: "bg-green-50 border-green-200" };
    if (pct >= 60) return { label: "C — Regular", color: "#f59e0b", bg: "bg-amber-50 border-amber-200" };
    if (pct >= 40) return { label: "D — Ruim", color: "#f97316", bg: "bg-orange-50 border-orange-200" };
    return { label: "F — Crítico", color: "#ef4444", bg: "bg-red-50 border-red-200" };
  };

  if (sla.totalComTempo === 0) return null;

  const grade = getGrade(sla.slaPercent);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-[#44735E]" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              SLA Global de Atendimento
            </h3>
            <p className="text-sm text-gray-600">Todas as unidades consolidadas</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-6 mb-5 p-4 rounded-xl bg-gray-50/80">
          {/* Nota Principal ≤30min */}
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold leading-none" style={{ color: grade.color }}>
              {sla.slaPercent.toFixed(0)}%
            </span>
            <span className="text-[10px] text-gray-500 mt-1">em ≤30min</span>
          </div>

          {/* Stretch Goal ≤15min */}
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold leading-none text-emerald-500">
              {sla.stretchPercent.toFixed(0)}%
            </span>
            <span className="text-[10px] text-gray-500 mt-1">em ≤15min</span>
          </div>

          <div className="flex-1">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${grade.bg}`} style={{ color: grade.color }}>
              <Gauge className="h-3.5 w-3.5" />
              {grade.label}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(sla.slaPercent, 100)}%`, backgroundColor: grade.color }} />
            </div>
          </div>

          <div className="flex flex-col items-end text-xs text-gray-500">
            <span>
              Média: <strong>{Math.round(sla.mediaMinutos || 0)}min</strong>
              {sla.medianaMinutos != null && (
                <span className="ml-2">· Mediana: <strong>{sla.medianaMinutos}min</strong></span>
              )}
            </span>
            <span className="mt-0.5">
              <strong>{sla.totalComTempo}</strong> de {totalGeral} atendimentos
            </span>
            <span className="text-[10px] text-gray-400">
              ({sla.totalComTempo > 0 ? ((sla.totalComTempo / totalGeral) * 100).toFixed(0) : 0}% com registro)
            </span>
          </div>
        </div>

        {/* Barra de distribuição global */}
        <div className="flex h-3 rounded-full overflow-hidden">
          {['0-15min', '15-30min', '30-60min', '1-2h', '2h+'].map((key, i) => {
            const value = sla.faixas[key] || 0;
            const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#991b1b'];
            const display = ['≤15min', '≤30min', '≤60min', '≤2h', '>2h'];
            return (
              <Tooltip
                key={key}
                content={`${display[i]}: ${value}${value > 0 ? ` (${((value / sla.totalComTempo) * 100).toFixed(1)}%)` : ''}`}
                placement="top"
                showArrow
                offset={4}
              >
                <div
                  className="h-full flex items-center justify-center text-[9px] font-bold text-white transition-all"
                  style={{
                    width: `${(value / sla.totalComTempo) * 100}%`,
                    backgroundColor: colors[i],
                    opacity: 0.85,
                    minWidth: value > 0 ? '16px' : '0',
                  }}
                >
                  {value > 0 && `${((value / sla.totalComTempo) * 100).toFixed(0)}%`}
                </div>
              </Tooltip>
            );
          })}
        </div>

        {/* Legenda de cores */}
        <div className="flex items-center gap-4 mt-3 px-1">
          {['≤15min', '≤30min', '≤60min', '≤2h', '>2h'].map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-flex" style={{ backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#991b1b'][i] }} />
              <span className="text-[11px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <details className="group">
            <summary className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
              <Info className="h-3.5 w-3.5 text-[#44735E]" />
              <span className="font-medium">O que é este gráfico?</span>
              <ChevronDown className="h-3 w-3 ml-auto transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 text-xs text-gray-500 space-y-3 leading-relaxed">
              <p>
                <strong>SLA (Service Level Agreement)</strong> mede o percentual de pacientes que começaram o
                atendimento clínico dentro do prazo estipulado de <strong>30 minutos</strong> após a emissão da
                senha.
              </p>

              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-gray-700">Como é calculado</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-500">
                  <li>Para cada atendimento, calcula-se o tempo entre a <strong>emissão da senha</strong> e o <strong>primeiro exame</strong> do paciente.</li>
                  <li>Esse tempo é classificado em faixas: ≤15min, ≤30min, ≤60min, ≤2h ou &gt;2h.</li>
                  <li>A nota SLA = (atendimentos dentro de 30min) ÷ (total com horário registrado) × 100.</li>
                  <li>Só entram no cálculo os atendimentos que possuem <strong>data/hora do exame</strong> registrada — pacientes sem esse registro são excluídos da base.</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-gray-700">Classificação (Nota A–F)</p>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {[
                    { label: 'A — Excelente', min: 90, color: '#10b981' },
                    { label: 'B — Bom', min: 75, color: '#22c55e' },
                    { label: 'C — Regular', min: 60, color: '#f59e0b' },
                    { label: 'D — Ruim', min: 40, color: '#f97316' },
                    { label: 'F — Crítico', min: 0, color: '#ef4444' },
                  ].map((g) => (
                    <div key={g.label} className="text-center">
                      <span className="text-lg font-bold" style={{ color: g.color }}>≥{g.min}%</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">{g.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-gray-700">Média vs Mediana</p>
                <p className="text-gray-500">
                  A <strong>média</strong> é sensível a valores extremos (atendimentos muito demorados "puxam" o valor para cima).
                  A <strong>mediana</strong> representa o tempo em que metade dos pacientes foi atendida — menos influenciada por poucos casos muito lentos.
                  Valores próximos indicam distribuição equilibrada; média muito acima da mediana sugere poucos atendimentos muito longos.
                </p>
              </div>

              <p className="text-gray-400 text-[10px]">
                Fonte: Sistema de Senhas (data/hora de emissão + data/hora do primeiro exame). A mediana é estimada a partir da distribuição por faixas.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

// 🚀 Componente principal
export function StatisticsSection() {
  const { data, loading, error, refetch } = useStatistics({
    autoRefresh: true,
    refreshInterval: 300000,
  });

  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [expandedExamUnit, setExpandedExamUnit] = useState<string | null>(null);
  const [showAllExams, setShowAllExams] = useState<Record<string, boolean>>({});
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const statisticsData = data as unknown as StatisticsResponseDto;

  // 📊 Processar dados das unidades
  const unitSummaries = useMemo(() => {
    if (!statisticsData?.porUnidade) return {};

    return statisticsData.porUnidade.reduce(
      (acc, unidade) => {
        let totalExames = 0;
        let totalExamesFinalizados = 0;
        let totalExamesPendentes = 0;

        unidade.exames.forEach((exame) => {
          totalExames += exame.total;

          const pendentes =
            exame.porStatus.PENDENTE ||
            exame.porStatus.PENDENTE_LABORATORIO ||
            0;
          const finalizados =
            (exame.porStatus.FINALIZADO || 0) +
            (exame.porStatus.CONCLUIDO || 0) +
            (exame.porStatus.AGUARDANDO_RESULTADO || 0);

          totalExamesPendentes += pendentes;
          totalExamesFinalizados += finalizados;
        });

        acc[unidade.unidade] = {
          totalExames,
          totalExamesFinalizados,
          totalExamesPendentes,
          percentualFinalizados:
            totalExames > 0 ? (totalExamesFinalizados / totalExames) * 100 : 0,
        };

        return acc;
      },
      {} as Record<string, any>,
    );
  }, [statisticsData]);

  // 🏆 SLA Global (consolidado de todas as unidades)
  const globalSla = useMemo(() => {
    if (!statisticsData?.porUnidade) return null;

    const todosPrimeiroExame = statisticsData.porUnidade
      .map((u) => u.temposAtendimento?.primeiroExame)
      .filter((pe): pe is NonNullable<typeof pe> => pe != null);

    if (todosPrimeiroExame.length === 0) return null;

    const faixasConsolidadas: Record<string, number> = {};
    let totalComTempo = 0;
    let totalAgendamentosFiltrados = 0;
    let somaMediaPonderada = 0;

    for (const pe of todosPrimeiroExame) {
      for (const [key, value] of Object.entries(pe.faixas)) {
        faixasConsolidadas[key] = (faixasConsolidadas[key] || 0) + (value as number);
      }
      totalComTempo += pe.totalComTempo;
      totalAgendamentosFiltrados += pe.totalAgendamentos;
      somaMediaPonderada += (pe.mediaMinutos || 0) * pe.totalComTempo;
    }

    const dentro30 = (faixasConsolidadas['0-15min'] || 0) + (faixasConsolidadas['15-30min'] || 0);
    const dentro15 = faixasConsolidadas['0-15min'] || 0;
    const slaPct = totalComTempo > 0 ? (dentro30 / totalComTempo) * 100 : 0;
    const stretchPct = totalComTempo > 0 ? (dentro15 / totalComTempo) * 100 : 0;
    const mediaGlobal = totalComTempo > 0 ? somaMediaPonderada / totalComTempo : null;

    // Estimar mediana a partir do histograma
    const estimarMediana = (): number | null => {
      if (totalComTempo === 0) return null;
      const bins = [
        { min: 0, max: 15, key: '0-15min' as const },
        { min: 15, max: 30, key: '15-30min' as const },
        { min: 30, max: 60, key: '30-60min' as const },
        { min: 60, max: 120, key: '1-2h' as const },
        { min: 120, max: 240, key: '2h+' as const },
      ];
      const target = totalComTempo / 2;
      let cumulative = 0;
      for (const bin of bins) {
        const count = faixasConsolidadas[bin.key] || 0;
        if (count === 0) continue;
        cumulative += count;
        if (cumulative >= target) {
          const binStart = cumulative - count;
          const positionInBin = count > 0 ? (target - binStart) / count : 0;
          return Math.round(bin.min + positionInBin * (bin.max - bin.min));
        }
      }
      return null;
    };

    return {
      faixas: faixasConsolidadas as Record<string, number>,
      totalComTempo,
      totalAgendamentos: totalAgendamentosFiltrados,
      slaPercent: slaPct,
      stretchPercent: stretchPct,
      mediaMinutos: mediaGlobal,
      medianaMinutos: estimarMediana(),
    };
  }, [statisticsData]);

  // 🎯 Atualizar timestamp
  useEffect(() => {
    if (statisticsData?.generatedAt) {
      setLastUpdate(
        new Date(statisticsData.generatedAt).toLocaleTimeString("pt-BR"),
      );
    }
  }, [statisticsData]);

  // 🔄 Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 🎨 Toggle para ver todos os exames
  const toggleShowAllExams = (unitName: string) => {
    setShowAllExams((prev) => ({
      ...prev,
      [unitName]: !prev[unitName],
    }));
  };

  // 🎨 Estados de loading e erro
  if (error) {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-2xl p-6 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-1">
              Erro ao carregar estatísticas
            </h3>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              size="sm"
              onClick={handleRefresh}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (loading && !statisticsData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm p-5 animate-pulse"
            >
              <div className="h-12 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totais = statisticsData?.totaisGerais;

  return (
    <AnimatePresence>
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
        exit={{ opacity: 0, y: -20 }}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4 }}
      >
        {/* 📊 HEADER - Dashboard de Estatísticas */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard de Estatísticas
              </h1>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date().toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {lastUpdate && (
                  <>
                    <span className="text-gray-300">•</span>
                    <Clock className="h-4 w-4" />
                    Atualizado às {lastUpdate}
                    {statisticsData?.source === "cache" && " (cache)"}
                  </>
                )}
              </p>
            </div>
          </div>

          <Button
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 border border-gray-200 cursor-pointer"
            disabled={loading || isRefreshing}
            onClick={handleRefresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="font-medium">
              {isRefreshing ? "Atualizando..." : "Atualizar Dados"}
            </span>
          </Button>
        </div>

        {/* 📈 LINHA 1: 3 CARDS PRINCIPAIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <KpiCard
            gradient
            delay={0}
            icon={Users}
            title="Atendimentos Totais"
            value={totais?.totalAgendamentos || 0}
          />

          <KpiCard
            delay={0.1}
            icon={Calendar}
            title="Atendimentos Previstos"
            value={totais?.atendimentosPrevistos || 0}
          />

          <KpiCard
            delay={0.2}
            icon={FileText}
            title="Total de Prontuários"
            value={totais?.totalProntuarios || 0}
          />
        </div>

        {/* 📊 LINHA 2: 3 CARDS DE EXAMES E STATUS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            icon={FlaskConical}
            iconBgColor="rgba(16, 185, 129, 0.15)"
            iconColor="#10b981"
            title="Exames Realizados"
            value={totais?.totalExamesRealizados || 0}
          />

          <MetricCard
            icon={Clock}
            iconBgColor="rgba(139, 92, 246, 0.15)"
            iconColor="#8b5cf6"
            title="Aguardando Resultados"
            value={totais?.aguardandoResultados || 0}
          />

          <MetricCard
            icon={Stethoscope}
            iconBgColor="rgba(245, 158, 11, 0.15)"
            iconColor="#f59e0b"
            title="Aguardando Avaliação Médica"
            value={totais?.aguardandoAvaliacaoMedica || 0}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <ScraperMonitor />
        </div>

        {/* 📊 STATUS E TIPOS DE EXAME */}
        {totais && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Consolidados */}
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
            >
              <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-[#44735E]" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Status dos Atendimentos
                      </h3>
                      <p className="text-sm text-gray-600">
                        Todas as unidades
                      </p>
                    </div>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-4">
                  {/* Total Previstos */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-flex" style={{ backgroundColor: COLORS.info }} />
                        <span className="text-sm font-semibold" style={{ color: COLORS.info }}>
                          PREVISTOS
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{ color: COLORS.info }}>
                          {totais.atendimentosPrevistos}
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      color={COLORS.info}
                      max={totais.atendimentosPrevistos}
                      size="sm"
                      value={totais.atendimentosPrevistos}
                    />
                  </div>

                  {/* Não Compareceram */}
                  {(() => {
                    const faltantes = Math.max(
                      0,
                      totais.atendimentosPrevistos - totais.totalAgendamentos,
                    );
                    if (faltantes <= 0) return null;
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-flex bg-gray-400" />
                            <span className="text-sm font-medium text-gray-500">
                              NÃO COMPARECERAM
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-500">
                              {faltantes}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({((faltantes / totais.atendimentosPrevistos) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <ProgressBar
                          color="#9ca3af"
                          max={totais.atendimentosPrevistos}
                          size="sm"
                          value={faltantes}
                        />
                      </div>
                    );
                  })()}

                  {Object.entries(totais.atendimentosPorStatus || {})
                    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
                    .map(([status, count]) => {
                      const maxVal = Math.max(totais.totalAgendamentos, count as number);
                      const percentage =
                        ((count as number) / maxVal) * 100;

                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-flex"
                                style={{
                                  backgroundColor:
                                    status.includes("FINALIZADO") ||
                                    status.includes("CONCLUIDO")
                                      ? COLORS.success
                                      : status.includes("AVALIACAO_MEDICA")
                                        ? COLORS.warning
                                        : status.includes("AGUARDANDO_RESULTADOS")
                                          ? COLORS.purple
                                          : status.includes("EM_ATENDIMENTO") ||
                                              status.includes("ATENDIMENTO")
                                            ? COLORS.danger
                                            : COLORS.primary,
                                }}
                              />
                              <span className="text-sm font-medium text-gray-900">
                                {(STATUS_LABELS[status] || status)
                                  .toUpperCase()
                                  .replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-900 font-bold">
                                {count as number}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <ProgressBar
                            color={
                              status.includes("FINALIZADO") ||
                              status.includes("CONCLUIDO")
                                ? COLORS.success
                                : status.includes("AVALIACAO_MEDICA")
                                  ? COLORS.warning
                                  : status.includes("AGUARDANDO_RESULTADOS")
                                    ? COLORS.purple
                                    : status.includes("EM_ATENDIMENTO") ||
                                        status.includes("ATENDIMENTO")
                                      ? COLORS.danger
                                      : COLORS.primary
                            }
                            max={maxVal}
                            size="sm"
                            value={count as number}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            </motion.div>

            {/* Tipos de Exame */}
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.1 }}
            >
              <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-[#44735E]" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Tipos de Exame
                    </h3>
                    <p className="text-sm text-gray-600">
                      {Object.keys(totais.atendimentosPorTipoExame).length}{" "}
                      tipos solicitados
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {Object.entries(totais.atendimentosPorTipoExame)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([tipo, count]) => {
                      const percentage =
                        ((count as number) / totais.totalAgendamentos) * 100;

                      return (
                        <div key={tipo}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {tipo}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-900 font-bold">
                                {count as number}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <ProgressBar
                            color="#B8D864"
                            max={totais.totalAgendamentos}
                            size="sm"
                            value={count as number}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* 🌍 SLA GLOBAL */}
        {globalSla && totais && (
          <GlobalSlaCard
            sla={globalSla}
            totalGeral={totais.totalAgendamentos}
          />
        )}

        {/* 🏥 UNIDADES - Detalhamento por gestor */}
        <div className="space-y-6">
          {statisticsData?.porUnidade?.map((unidade) => {
            const isExpanded = expandedUnit === unidade.unidade;
            const isExamExpanded = expandedExamUnit === unidade.unidade;
            const showAllForUnit = showAllExams[unidade.unidade] || false;
            const unitSummary = unitSummaries[unidade.unidade];

            return (
              <motion.div
                key={unidade.unidade}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
              >
                {/* Cabeçalho da Unidade */}
                <div
                  className="p-5 border-b border-gray-200 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() =>
                    setExpandedUnit(isExpanded ? null : unidade.unidade)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {unidade.unidade}
                        </h2>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-lg font-bold text-[#44735E]">
                              {unidade.totalAgendamentos}
                            </span>
                            <span className="text-sm text-gray-600">
                              atendimentos
                            </span>
                          </div>

                          {/* Métricas do dia por unidade */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                              <span className="text-sm text-gray-600">
                                {unidade.aguardandoResultados} Aguardando
                                Resultados
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="text-sm text-gray-600">
                                {unidade.aguardandoAvaliacaoMedica} Avaliação
                                Médica
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {unitSummary && (
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-green-600">
                              {unitSummary.percentualFinalizados.toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            Concluídos
                          </span>
                        </div>
                      )}

                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Prévia rápida */}
                  {!isExpanded && unitSummary && (
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <span>{unidade.exames.length} Exames</span>
                      <span>
                        {unidade.tickets.reduce((sum, t) => sum + t.total, 0)}{" "}
                        Senhas
                      </span>
                      <span>{unidade.atendimentosPrevistos} Previstos</span>
                    </div>
                  )}
                </div>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <motion.div
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-6 space-y-8"
                    exit={{ opacity: 0, height: 0 }}
                    initial={{ opacity: 0, height: 0 }}
                  >
                    {/* Status do Dia */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          Status do Dia
                        </h4>
                        <div className="space-y-3">
                          {/* Total Previstos */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-flex"
                                style={{ backgroundColor: COLORS.info }}
                              />
                              <span
                                className="text-sm font-medium"
                                style={{ color: COLORS.info }}
                              >
                                PREVISTOS
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className="font-bold"
                                style={{ color: COLORS.info }}
                              >
                                {unidade.atendimentosPrevistos}
                              </span>
                            </div>
                          </div>

                          {/* Não Compareceram */}
                          {(() => {
                            const faltantes = Math.max(
                              0,
                              unidade.atendimentosPrevistos -
                                unidade.totalAgendamentos,
                            );
                            if (faltantes <= 0) return null;
                            return (
                              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100/80">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full inline-flex bg-gray-400" />
                                  <span className="text-sm text-gray-500 font-medium">
                                    NÃO COMPARECERAM
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-gray-500">
                                    {faltantes}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    ({(
                                      (faltantes /
                                        unidade.atendimentosPrevistos) *
                                      100
                                    ).toFixed(1)}
                                    %)
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {Object.entries(unidade.atendimentosPorStatus || {})
                            .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
                            .map(([status, count]) => {
                              const statusColor =
                                status.includes("FINALIZADO") ||
                                status.includes("CONCLUIDO")
                                  ? COLORS.success
                                  : status.includes("AVALIACAO_MEDICA")
                                    ? COLORS.warning
                                    : status.includes("AGUARDANDO_RESULTADOS")
                                      ? COLORS.purple
                                      : status.includes("EM_ATENDIMENTO") ||
                                          status.includes("ATENDIMENTO")
                                        ? COLORS.danger
                                        : COLORS.primary;
                              const maxVal = Math.max(unidade.totalAgendamentos, count as number);
                              return (
                                <div
                                  key={status}
                                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full inline-flex"
                                      style={{ backgroundColor: statusColor }}
                                    />
                                    <span className="text-sm text-gray-700">
                                      {(STATUS_LABELS[status] || status)
                                        .toUpperCase()
                                        .replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900">
                                      {count as number}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      (
                                      {(
                                        ((count as number) /
                                          maxVal) *
                                        100
                                      ).toFixed(1)}
                                      %)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          Tipos do Dia
                        </h4>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                          {Object.entries(unidade.atendimentosPorTipoExame)
                            .sort(
                              ([, a], [, b]) => (b as number) - (a as number),
                            )
                            .slice(0, 8)
                            .map(([tipo, count]) => (
                              <div
                                key={tipo}
                                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                              >
                                <span className="text-sm text-gray-700 truncate">
                                  {tipo}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900">
                                    {count as number}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({((count as number) / unidade.totalAgendamentos * 100).toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Tickets do Dia (Pref/Prio/Agendados/Geral) */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          Senhas do Dia
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            const tickets = unidade.tickets || [];
                            if (tickets.length === 0) return (
                              <div className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                                Nenhuma senha emitida
                              </div>
                            );
                            const total = tickets.reduce((s, t) => s + t.total, 0);
                            const preferencial = tickets.reduce((s, t) => s + t.preferencial, 0);
                            const comPrefixo = tickets.reduce((s, t) => s + t.comPrefixo, 0);
                            const comPrefixoC = tickets.reduce((s, t) => s + (t.comPrefixoC || 0), 0);
                            const geral = total - preferencial - comPrefixo - comPrefixoC;
                            return (
                              <>
                                <div className="flex items-center justify-between p-2 rounded-lg bg-red-50/50">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full inline-flex bg-red-500" />
                                    <span className="text-sm font-medium text-red-700">Preferencial</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-700">{preferencial}</span>
                                    <span className="text-xs text-red-500">
                                      ({((preferencial / total) * 100).toFixed(0)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full inline-flex bg-blue-500" />
                                    <span className="text-sm font-medium text-blue-700">Prioridade</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-700">{comPrefixo}</span>
                                    <span className="text-xs text-blue-500">
                                      ({((comPrefixo / total) * 100).toFixed(0)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50/50">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full inline-flex bg-orange-500" />
                                    <span className="text-sm font-medium text-orange-700">Agendados</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-orange-700">{comPrefixoC}</span>
                                    <span className="text-xs text-orange-500">
                                      ({((comPrefixoC / total) * 100).toFixed(0)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100/80">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full inline-flex bg-gray-500" />
                                    <span className="text-sm font-medium text-gray-600">Atendimento Geral</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-700">{geral}</span>
                                    <span className="text-xs text-gray-500">
                                      ({((geral / total) * 100).toFixed(0)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800">Total Senhas</span>
                                  </div>
                                  <span className="font-bold text-gray-900">{total}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Exames Detalhados */}
                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#44735E]/12 border border-[#44735E]/20">
                            <FlaskConical className="h-5 w-5 text-[#44735E]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Detalhamento de Exames
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block" /> ≤15min
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] inline-block" /> 16–30min
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] inline-block" /> &gt;30min
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e5e7eb] inline-block border border-gray-300" /> sem dados
                              </span>
                            </p>
                            <p className="text-[11px] text-gray-400 italic mt-0.5">
                              Tempo entre realização do exame anterior e atual
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="light"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedExamUnit(
                                isExamExpanded ? null : unidade.unidade,
                              );
                            }}
                          >
                            {isExamExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" /> Recolher
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />{" "}
                                Expandir
                              </>
                            )}
                          </Button>

                          {unidade.exames.length > 8 && (
                            <Button
                              className="text-[#44735E]"
                              size="sm"
                              variant="light"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleShowAllExams(unidade.unidade);
                              }}
                            >
                              {showAllForUnit ? (
                                <>
                                  <EyeOff className="h-4 w-4 mr-1" /> Ver menos
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" /> Ver todos
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Grid de Exames */}
                      <div
                        className={`grid grid-cols-1 ${showAllForUnit ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4`}
                      >
                        {(showAllForUnit
                          ? unidade.exames
                          : unidade.exames.slice(0, 8)
                        )
                          .sort((a, b) => b.total - a.total)
                          .map((exame) => (
                            <ExamCard
                              key={`${unidade.unidade}-${exame.nomeExame}`}
                              exame={exame}
                              expanded={isExamExpanded}
                            />
                          ))}
                      </div>

                      {/* Ver mais */}
                      {!showAllForUnit && unidade.exames.length > 8 && (
                        <div className="mt-6 text-center">
                          <Button
                            className="text-[#44735E] font-medium"
                            size="sm"
                            variant="light"
                            onClick={() => toggleShowAllExams(unidade.unidade)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver mais {unidade.exames.length - 8} exames
                          </Button>
                        </div>
                      )}

                      {/* Resumo */}
                      {unitSummary && (
                        <div className="mt-8 p-5 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-green-600">
                                {unitSummary.totalExamesFinalizados}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Finalizados
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-yellow-600">
                                {unitSummary.totalExamesPendentes}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Pendentes
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-blue-600">
                                {unitSummary.percentualFinalizados.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Taxa de conclusão
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gráficos de Tempo de Atendimento */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">
                        Tempo de Atendimento
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TempoPrimeiroExameChart
                          data={unidade.temposAtendimento?.primeiroExame ?? null}
                        />
                        <TempoPermanenciaChart
                          data={unidade.temposAtendimento?.permanencia ?? []}
                          totalAgendamentos={unidade.temposAtendimento?.totalAgendamentos ?? 0}
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <SlaChart
                          data={unidade.temposAtendimento?.primeiroExame ?? null}
                          totalAgendamentos={unidade.temposAtendimento?.totalAgendamentos ?? 0}
                        />

                        {/* Guia explicativo do SLA */}
                        <div className="bg-gradient-to-br from-[#f8faf8] to-white rounded-xl border border-gray-200 p-5 flex flex-col justify-center">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#44735E]/10 flex items-center justify-center text-[11px] font-bold text-[#44735E]">?</span>
                            Como funciona este SLA?
                          </h4>
                          <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
                            <p>
                              <strong className="text-gray-900">SLA</strong> é uma sigla que usamos para medir a qualidade do atendimento. Ele mostra <strong className="text-gray-900">quanto tempo as pessoas esperaram até fazer o primeiro exame</strong> depois de chegar na unidade.
                            </p>
                            <div>
                              <p className="font-medium text-gray-900 mb-1">Nota (A a F):</p>
                              <ul className="space-y-1">
                                <li className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                                  <span><strong>A / B</strong> — Ótimo, a maioria esperou menos de 30min</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                                  <span><strong>C</strong> — Regular, metade esperou mais de 30min</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                                  <span><strong>D / F</strong> — Ruim, a maioria esperou mais de 30min</span>
                                </li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 mb-1">Curva Acumulada:</p>
                              <p>
                                Mostra de forma progressiva quantas pessoas foram atendidas dentro de cada limite de tempo. Ex: se "≤30min" mostra <strong className="text-gray-900">68%</strong>, significa que <strong className="text-gray-900">68 em cada 100</strong> pessoas começaram o exame em até meia hora.
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 mb-1">Média vs Mediana:</p>
                              <p>
                                <strong className="text-gray-900">Média</strong> é a soma de todos os tempos dividida pelo número de pessoas. <strong className="text-gray-900">Mediana</strong> é o valor do meio: metade esperou menos que isso, metade esperou mais. A mediana é mais justa quando alguns casos fogem muito do normal.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

      </motion.section>
    </AnimatePresence>
  );
}
