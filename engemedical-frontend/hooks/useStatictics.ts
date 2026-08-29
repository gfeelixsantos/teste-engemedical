import { useState, useEffect, useCallback } from "react";

import { NEST_SCHEDULINGS_STATISTICS } from "@/config/constants";

interface StatisticsData {
  totalGeral: number;
  porUnidade: UnidadeStatisticsDto[];
  exames: ExameStatisticsDto[];
  tickets: TicketStatisticsDto[];
  dataReferencia: Date;
  generatedAt: Date;
  source: "cache" | "database";
  processingTimeMs?: number;
}

interface UseStatisticsOptions {
  unidade?: string;
  data?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// ===============================
// 📊 DTO Principal
// ===============================
export type StatisticsResponseDto = {
  porUnidade: UnidadeStatisticsDto[];
  totaisGerais: TotaisGeraisDto;
  dataReferencia: Date;
  generatedAt: Date;
  source: "cache" | "database";
  processingTimeMs?: number;
};

// ===============================
// 🏥 DTO Completo por Unidade
// ===============================
export type UnidadeStatisticsDto = {
  unidade: string;
  totalAgendamentos: number;
  atendimentosPrevistos: number;
  aguardandoResultados: number;
  aguardandoAvaliacaoMedica: number;
  atendimentosPorStatus: Record<string, number>;
  atendimentosPorTipoExame: Record<string, number>;
  exames: ExameStatisticsDto[];
  tickets: TicketStatisticsDto[];
  temposAtendimento?: {
    primeiroExame: TempoPrimeiroExameDto | null;
    permanencia: TempoPermanenciaDto[];
    totalAgendamentos: number;
  };
};

// ===============================
// 🧪 DTO de Exames
// ===============================
export type ExameStatisticsDto = {
  nomeExame: string;
  total: number;
  porStatus: Record<string, number>;
  tempoMedioEspera?: number | null;
  tempoContexto?: 'primeiro' | 'subsequente' | null;
};

// ===============================
// 🎟️ DTO de Tickets
// ===============================
export type TicketStatisticsDto = {
  status: string;
  total: number;
  preferencial: number;
  comPrefixo: number;
  comPrefixoC: number;
};

export type TempoPrimeiroExameDto = {
  mediaMinutos: number | null;
  medianaMinutos: number | null;
  faixas: Record<string, number>;
  totalAgendamentos: number;
  totalComTempo: number;
};

export type TempoPermanenciaDto = {
  exames: number;
  quantidade: number;
  tempoMedioMinutos: number | null;
};

// ===============================
// 📈 DTO de Totais Gerais (consolidado)
// ===============================
export type TotaisGeraisDto = {
  totalAgendamentos: number;
  atendimentosPrevistos: number; // ✨ Nova Propriedade
  aguardandoResultados: number; // ✨ Nova Propriedade
  aguardandoAvaliacaoMedica: number; // ✨ Nova Propriedade
  totalProntuarios: number; // ✨ Nova Propriedade
  atendimentosPorStatus: Record<string, number>;
  atendimentosPorTipoExame: Record<string, number>;
  totalExamesRealizados: number;
  totalTicketsEmitidos: number;
};

export function useStatistics({
  unidade,
  data,
  autoRefresh = false,
  refreshInterval = 600000, // 10 minutos
}: UseStatisticsOptions = {}) {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (unidade) params.append("unidade", unidade);
      if (data) params.append("data", data);

      const url = `${NEST_SCHEDULINGS_STATISTICS}${params.toString() ? `?${params.toString()}` : ""}`;

      console.log(url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      setStatistics(result);
    } catch (err) {
      setError(err as Error);
      console.error("Erro ao buscar estatísticas:", err);
    } finally {
      setLoading(false);
    }
  }, [unidade, data]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStatistics, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStatistics]);

  return { data: statistics, loading, error, refetch: fetchStatistics };
}
