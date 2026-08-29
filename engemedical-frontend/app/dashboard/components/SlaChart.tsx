"use client";

import { Target, TrendingUp, Gauge } from "lucide-react";
import { TempoPrimeiroExameDto } from "@/hooks/useStatictics";

const SLA_LIMIT_MIN = 30;

const FAIXA_CONFIG: { key: string; label: string; color: string; withinSla: boolean }[] = [
  { key: "0-15min", label: "≤15min", color: "#10b981", withinSla: true },
  { key: "15-30min", label: "15-30min", color: "#f59e0b", withinSla: true },
  { key: "30-60min", label: "30-60min", color: "#f97316", withinSla: false },
  { key: "1-2h", label: "1-2h", color: "#ef4444", withinSla: false },
  { key: "2h+", label: "2h+", color: "#991b1b", withinSla: false },
];

function getSlaGrade(pct: number): { label: string; color: string; bg: string } {
  if (pct >= 90) return { label: "A — Excelente", color: "#10b981", bg: "bg-green-50 border-green-200" };
  if (pct >= 75) return { label: "B — Bom", color: "#22c55e", bg: "bg-green-50 border-green-200" };
  if (pct >= 60) return { label: "C — Regular", color: "#f59e0b", bg: "bg-amber-50 border-amber-200" };
  if (pct >= 40) return { label: "D — Ruim", color: "#f97316", bg: "bg-orange-50 border-orange-200" };
  return { label: "F — Crítico", color: "#ef4444", bg: "bg-red-50 border-red-200" };
}

type Props = {
  data: TempoPrimeiroExameDto | null;
  totalAgendamentos: number;
};

const SlaChart = ({ data, totalAgendamentos }: Props) => {
  if (!data) return null;

  const faixas = data.faixas || {};
  const totalComTempo = data.totalComTempo || 0;

  const chartData = FAIXA_CONFIG.map((f) => ({
    name: f.label,
    value: faixas[f.key] || 0,
    color: f.color,
    withinSla: f.withinSla,
  }));

  const dentroSla = chartData
    .filter((d) => d.withinSla)
    .reduce((s, d) => s + d.value, 0);
  const slaPercent = totalComTempo > 0 ? (dentroSla / totalComTempo) * 100 : 0;
  const grade = getSlaGrade(slaPercent);

  // Cumulative distribution
  const cumulativo = [
    { label: "≤15min", pct: totalComTempo > 0 ? ((faixas["0-15min"] || 0) / totalComTempo) * 100 : 0, color: "#10b981" },
    { label: "≤30min", pct: totalComTempo > 0 ? (((faixas["0-15min"] || 0) + (faixas["15-30min"] || 0)) / totalComTempo) * 100 : 0, color: "#22c55e" },
    { label: "≤60min", pct: totalComTempo > 0 ? (((faixas["0-15min"] || 0) + (faixas["15-30min"] || 0) + (faixas["30-60min"] || 0)) / totalComTempo) * 100 : 0, color: "#f59e0b" },
    { label: "≤2h", pct: totalComTempo > 0 ? (((faixas["0-15min"] || 0) + (faixas["15-30min"] || 0) + (faixas["30-60min"] || 0) + (faixas["1-2h"] || 0)) / totalComTempo) * 100 : 0, color: "#f97316" },
    { label: ">2h", pct: totalComTempo > 0 ? ((faixas["2h+"] || 0) / totalComTempo) * 100 : 0, color: "#ef4444" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-5 w-5 text-[#44735E]" />
        <h4 className="text-sm font-semibold text-gray-900">SLA de Atendimento</h4>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        {totalComTempo} de {totalAgendamentos} agendamentos com tempo registrado
      </p>

      {totalComTempo > 0 ? (
        <>
          {/* SLA Score + Grade */}
          <div className="flex items-center gap-5 mb-6 p-4 rounded-xl bg-gray-50/80">
            <div className="flex flex-col items-center">
              <span
                className="text-4xl font-bold leading-none"
                style={{ color: grade.color }}
              >
                {slaPercent.toFixed(0)}%
              </span>
              <span className="text-[10px] text-gray-500 mt-1">em ≤30min</span>
            </div>
            <div className="flex-1">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${grade.bg}`}
                style={{ color: grade.color }}
              >
                <Gauge className="h-3.5 w-3.5" />
                {grade.label}
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(slaPercent, 100)}%`,
                    backgroundColor: grade.color,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col items-end text-xs text-gray-500">
              <span>Média: <strong>{Math.round(data.mediaMinutos || 0)}min</strong></span>
              {data.medianaMinutos != null && (
                <span>Mediana: <strong>{Math.round(data.medianaMinutos)}min</strong></span>
              )}
            </div>
          </div>

          {/* Cumulative Distribution */}
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Curva Acumulada
              </span>
            </div>
            <div className="space-y-2">
              {cumulativo.map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600">{c.label}</span>
                    <span className="font-bold" style={{ color: c.color }}>
                      {c.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${c.pct}%`, backgroundColor: c.color, opacity: 0.8 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution Bar */}
          <div className="mb-4">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
              Distribuição por Faixa
            </span>
            <div className="flex h-7 rounded-lg overflow-hidden">
              {chartData.map((d, i) => (
                <div
                  key={i}
                  className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700 first:rounded-l-lg last:rounded-r-lg"
                  style={{
                    width: `${(d.value / totalComTempo) * 100}%`,
                    backgroundColor: d.color,
                    opacity: 0.85,
                    minWidth: d.value > 0 ? "24px" : "0",
                  }}
                  title={`${d.name}: ${d.value} (${((d.value / totalComTempo) * 100).toFixed(1)}%)`}
                >
                  {d.value > 0 && ((d.value / totalComTempo) * 100 > 8) && `${((d.value / totalComTempo) * 100).toFixed(0)}%`}
                </div>
              ))}
            </div>
          </div>

          {/* Faixas Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {FAIXA_CONFIG.map((f) => {
              const pct = totalComTempo > 0 ? ((faixas[f.key] || 0) / totalComTempo) * 100 : 0;
              return (
                <div key={f.key} className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: f.color }} />
                  <span className="text-gray-600">{f.label}:</span>
                  <span className="font-medium text-gray-900">
                    {faixas[f.key] || 0} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">Nenhum dado disponível</p>
      )}
    </div>
  );
};

export default SlaChart;
