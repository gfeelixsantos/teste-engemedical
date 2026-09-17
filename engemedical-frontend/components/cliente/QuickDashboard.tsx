"use client";

import { useEffect, useMemo, useState } from "react";
import { useEmpresas } from "./EmpresaProvider";
import { useClienteDashboard } from "@/hooks/useClienteDashboard";

function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

function useAnimatedPct(targetPct: number, duration = 800, delay = 0) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (targetPct === 0) { setPct(0); return; }
    let raf: number;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setPct(eased * targetPct);
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [targetPct, duration, delay]);

  return pct;
}

function VerticalBar({ label, value, color, total, delay }: { label: string; value: number; color: string; total: number; delay: number }) {
  const animatedValue = useCountUp(value);
  const targetPct = total > 0 ? (value / total) * 100 : 0;
  const animatedPct = useAnimatedPct(targetPct, 1000, delay);

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <span className="text-lg font-black tracking-tight text-gray-900">
        {animatedValue.toLocaleString("pt-BR")}
      </span>

      <div className="relative flex w-full flex-1 items-end justify-center">
        <div className="relative w-full max-w-[52px] overflow-hidden rounded-xl bg-gray-100" style={{ height: "140px" }}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-xl"
            style={{
              height: `${animatedPct}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      <div className="text-center">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className="mt-0.5 block text-[11px] font-bold" style={{ color }}>
          {Math.round(animatedPct)}%
        </span>
      </div>
    </div>
  );
}

export function QuickDashboard() {
  const { selectedEmpresa } = useEmpresas();
  const { data, isLoading, error } = useClienteDashboard();

  const chartData = useMemo(() => {
    if (!data) return null;
    return [
      { name: "Válidos", value: data.validos, color: "#0BA942" },
      { name: "A vencer", value: data.aVencer, color: "#F59E0B" },
      { name: "Vencidos", value: data.vencidos, color: "#EF4444" },
      { name: "Sem histórico", value: data.semHistorico, color: "#8B5CF6" },
    ];
  }, [data]);

  const displayTotal = data ? data.validos + data.aVencer + data.vencidos + data.semHistorico : 0;
  const animatedTotal = useCountUp(displayTotal);

  if (isLoading && !data) {
    return (
      <div className="flex h-[340px] flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Visão Geral</h3>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="grid w-full grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-6 w-12 animate-pulse rounded bg-gray-100" />
                <div className="h-[140px] w-[52px] animate-pulse rounded-xl bg-gray-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!chartData || !data) {
    return (
      <div className="flex h-[340px] flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Visão Geral</h3>
        <p className="mt-2 text-xs text-gray-400">
          {error ? `Erro ao carregar: ${error}` : "Sem dados para as empresas vinculadas."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[340px] flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-2">
        <h3 className="text-base font-bold text-gray-900">Visão Geral</h3>
        <p className="mt-0.5 text-sm text-gray-500">
          {displayTotal.toLocaleString("pt-BR")} colaboradores • {data.porEmpresa.length} empresa(s)
        </p>
        {error && <p className="mt-1 text-[11px] text-amber-600">Aviso: {error}</p>}
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="flex items-end gap-4">
          {chartData.map((item, i) => (
            <VerticalBar
              key={item.name}
              label={item.name}
              value={item.value}
              color={item.color}
              total={displayTotal}
              delay={i * 150}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
