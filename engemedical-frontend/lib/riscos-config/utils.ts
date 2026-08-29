import { IRiscoConfig } from "./services/riscos-config.service";

import { RiscosAso } from "@/lib/scheduling/interface/scheduling";

export const normalizeRiskCode = (value: unknown) =>
  String(value ?? "").trim().toUpperCase();

export const normalizeRiskType = (value: unknown) =>
  String(value ?? "").trim().toUpperCase();

export const parseSchedulingRisks = (raw: unknown): RiscosAso[] => {
  if (Array.isArray(raw)) return raw as RiscosAso[];

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) return parsed as RiscosAso[];
    } catch {
      return [];
    }
  }

  return [];
};

export const getRiskConfigByType = (
  configs: IRiscoConfig[],
  tipo: string,
): IRiscoConfig | undefined => {
  const normalizedType = normalizeRiskType(tipo);

  return configs.find((config) => normalizeRiskType(config.tipo) === normalizedType);
};

export const getRiskCodesForType = (
  configs: IRiscoConfig[],
  tipo: string,
  fallbackCodes: Iterable<string> = [],
): Set<string> => {
  const config = getRiskConfigByType(configs, tipo);
  const configCodes = (config?.codigos ?? [])
    .map(normalizeRiskCode)
    .filter(Boolean);

  if (configCodes.length > 0) return new Set(configCodes);

  return new Set(Array.from(fallbackCodes, normalizeRiskCode).filter(Boolean));
};

export const hasConfiguredRisk = (
  risks: Array<Pick<RiscosAso, "codigo">> | undefined | null,
  configs: IRiscoConfig[],
  tipo: string,
  fallbackCodes: Iterable<string> = [],
): boolean => {
  if (!risks?.length) return false;

  const validCodes = getRiskCodesForType(configs, tipo, fallbackCodes);

  return risks.some((risk) => validCodes.has(normalizeRiskCode(risk?.codigo)));
};

export const getRiskOpinionOptions = (
  configs: IRiscoConfig[],
  tipo: string,
  fallbackOptions: string[] = [],
): string[] => {
  const config = getRiskConfigByType(configs, tipo);
  const configOptions = (config?.parecer_opcoes ?? [])
    .map((option) => String(option ?? "").trim())
    .filter(Boolean);

  if (configOptions.length > 0) return configOptions;

  return fallbackOptions;
};
