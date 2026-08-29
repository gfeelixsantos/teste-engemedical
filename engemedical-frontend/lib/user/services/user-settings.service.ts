import {
  IUserInfo,
  IUserInfoSettings,
  IPscAuthStatus,
} from "../interfaces/IUser";

import { getCurrentUser } from "@/lib/utils";
import { NEST_USER_SETTINGS_URL } from "@/config/constants";

// Cache simples em memória: chave = codigo do usuário
const settingsCache = new Map<string, {
  data: { user: IUserInfo; settings: IUserInfoSettings | null; pscAuthStatus: IPscAuthStatus };
  expires: number;
}>();
const SETTINGS_CACHE_TTL = 60_000; // 60 segundos

export async function getUserSettings(): Promise<{
  user: IUserInfo;
  settings: IUserInfoSettings | null;
  pscAuthStatus: IPscAuthStatus;
  error?: string;
}> {
  const user = getCurrentUser();

  if (!user) {
    return {
      user: {} as IUserInfo,
      settings: null,
      pscAuthStatus: {
        status: "NOT_AUTHENTICATED",
        isActive: false,
        expiresAt: null,
        pscName: null,
      },
      error: "Usuário não autenticado",
    };
  }

  const cacheKey = String(user.codigo);
  const cached = settingsCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const response = await fetch(`${NEST_USER_SETTINGS_URL}${user.codigo}`);

    if (!response.ok) {
      throw new Error("Erro ao buscar configurações");
    }

    const data = await response.json();

    const result = {
      user: data.user,
      settings: data.settings,
      pscAuthStatus: data.pscAuthStatus,
    };

    settingsCache.set(cacheKey, {
      data: result,
      expires: Date.now() + SETTINGS_CACHE_TTL,
    });

    return result;
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);

    return {
      user: user,
      settings: null,
      pscAuthStatus: {
        status: "ERROR",
        isActive: false,
        expiresAt: null,
        pscName: null,
      },
    };
  }
}

export async function saveUserSettings(
  settings: IUserInfoSettings,
): Promise<{ success: boolean; error?: string }> {
  const user = getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "Usuário não autenticado",
    };
  }

  try {
    // Converter PIN para base64 se fornecido
    const settingsToSave = {
      ...settings,
      pin: settings.pin ? btoa(settings.pin) : null,
    };

    const response = await fetch(NEST_USER_SETTINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settingsToSave),
    });

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(errorData.message || "Erro ao salvar configurações");
    }

    // Invalida cache após salvar
    settingsCache.delete(String(user.codigo));

    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
