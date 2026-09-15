"use client";

import { useEffect, useState } from "react";
import { useEmpresas } from "@/components/cliente/EmpresaProvider";

export interface DashboardResumo {
  validos: number;
  aVencer: number;
  vencidos: number;
  semHistorico: number;
  total: number;
  porEmpresa: Array<{
    codigo: string;
    validos: number;
    aVencer: number;
    vencidos: number;
    semHistorico: number;
    total: number;
  }>;
}

export function useClienteDashboard() {
  const { empresas } = useEmpresas();
  const [data, setData] = useState<DashboardResumo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empresas.length) {
      setData(null);
      return;
    }
    const codigos = empresas.map((e) => String(e.CODIGO)).join(",");
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetch(`/api/cliente/dashboard?codigos=${encodeURIComponent(codigos)}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<DashboardResumo>;
      })
      .then((j) => {
        if (cancelled) return;
        setData((prev) => {
          const incomingTotal = (j?.validos ?? 0) + (j?.aVencer ?? 0) + (j?.vencidos ?? 0) + (j?.semHistorico ?? 0);
          if (incomingTotal === 0 && prev && prev.total > 0) return prev;
          return j;
        });
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [empresas]);

  return { data, isLoading, error };
}
