// hooks/useModalOptimizer.ts
import { useState, useCallback, useRef } from "react";

import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { NEST_RELATORIO_FUNCIONARIO } from "@/config/constants";

export const useModalOptimizer = () => {
  const [preloadedData, setPreloadedData] = useState<
    Record<string, Scheduling>
  >({});
  const preloadQueue = useRef<Set<string>>(new Set());

  const preloadModalData = useCallback(
    async (atendimentoId: string) => {
      // Evitar múltiplas requisições para o mesmo ID
      if (
        preloadQueue.current.has(atendimentoId) ||
        preloadedData[atendimentoId]
      ) {
        return;
      }

      preloadQueue.current.add(atendimentoId);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `${NEST_RELATORIO_FUNCIONARIO}${atendimentoId}`,
          { signal: controller.signal },
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          setPreloadedData((prev) => ({
            ...prev,
            [atendimentoId]: data,
          }));
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Erro ao pré-carregar dados:", error);
        }
      } finally {
        preloadQueue.current.delete(atendimentoId);
      }
    },
    [preloadedData],
  );

  const clearPreloadedData = useCallback((atendimentoId?: string) => {
    if (atendimentoId) {
      setPreloadedData((prev) => {
        const newData = { ...prev };

        delete newData[atendimentoId];

        return newData;
      });
      preloadQueue.current.delete(atendimentoId);
    } else {
      setPreloadedData({});
      preloadQueue.current.clear();
    }
  }, []);

  return { preloadedData, preloadModalData, clearPreloadedData };
};
