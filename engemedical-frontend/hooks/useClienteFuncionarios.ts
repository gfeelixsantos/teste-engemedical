"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ClienteFuncionariosError,
  ClienteFuncionariosQuery,
  ClienteFuncionariosResponse,
} from "@/lib/cliente/funcionarios/types";

interface HttpError extends Error {
  status?: number;
}

function classifyError(error: unknown): ClienteFuncionariosError {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;

  if (status === 401 || status === 403) {
    return {
      kind: "access",
      message: "Você não tem acesso aos funcionários desta empresa.",
    };
  }

  if (status === 502 || status === 504) {
    return {
      kind: "upstream",
      message: "O serviço de funcionários está temporariamente indisponível.",
    };
  }

  return {
    kind: "unknown",
    message: "Não foi possível carregar os funcionários.",
  };
}

export function useClienteFuncionarios({
  empresaCodigo,
  page,
  limit,
  q,
  status,
}: ClienteFuncionariosQuery): {
  data: ClienteFuncionariosResponse | null;
  isLoading: boolean;
  error: ClienteFuncionariosError | null;
  refetch: () => void;
} {
  const [data, setData] = useState<ClienteFuncionariosResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ClienteFuncionariosError | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const searchParams = new URLSearchParams({
      empresa: empresaCodigo,
      page: String(page),
      limit: String(limit),
    });

    if (q) searchParams.set("q", q);
    if (status) searchParams.set("status", status);

    setIsLoading(true);
    setError(null);

    fetch(`/api/cliente/funcionarios?${searchParams.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const httpError = new Error(`HTTP ${response.status}`) as HttpError;
          httpError.status = response.status;
          throw httpError;
        }
        return (await response.json()) as ClienteFuncionariosResponse;
      })
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((requestError: unknown) => {
        if (!active || (requestError instanceof DOMException && requestError.name === "AbortError")) {
          return;
        }
        setError(classifyError(requestError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [empresaCodigo, page, limit, q, status, refreshKey]);

  return { data, isLoading, error, refetch };
}
