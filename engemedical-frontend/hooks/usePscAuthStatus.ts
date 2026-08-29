import { useState, useEffect, useCallback } from "react";

import { IUserInfoSettings, IPscAuthStatus } from "@/lib/user/interfaces/IUser";
import { getUserSettings } from "@/lib/user/services/user-settings.service";

export interface UsePscAuthStatusResult {
  settings: IUserInfoSettings | null;
  pscAuthStatus: IPscAuthStatus;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultPscAuthStatus: IPscAuthStatus = {
  status: "NOT_AUTHENTICATED",
  isActive: false,
  expiresAt: null,
  pscName: null,
};

export function usePscAuthStatus(): UsePscAuthStatusResult {
  const [settings, setSettings] = useState<IUserInfoSettings | null>(null);
  const [pscAuthStatus, setPscAuthStatus] =
    useState<IPscAuthStatus>(defaultPscAuthStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getUserSettings();

      if (result.error) {
        setError(result.error);
      }

      setSettings(result.settings);
      setPscAuthStatus(result.pscAuthStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    settings,
    pscAuthStatus,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
