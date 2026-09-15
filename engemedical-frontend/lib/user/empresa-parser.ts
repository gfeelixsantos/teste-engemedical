import { CadastroEmpresa } from "../soc/interfaces/CadastroEmpresa";
import { NEST_URL } from "@/config/constants";

export interface EmpresaParseResult {
  empresas: CadastroEmpresa[];
  missingCodes: string[];
  invalidCodes: string[];
  originalCode: string;
}

/**
 * Converte string de códigos de empresa separados por "-"
 * Exemplo: "1153506-2182291-2106632" → ["1153506", "2182291", "2106632"]
 */
export function parseEmpresaCodes(codes: string): string[] {
  if (!codes || !codes.trim()) return [];
  return codes
    .split("-")
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Valida se um código de empresa é numérico
 */
function isValidEmpresaCode(code: string): boolean {
  return /^\d{3,10}$/.test(code);
}

/**
 * Busca empresas no backend NestJS (server-side).
 * Retorna apenas as empresas cujo CODIGO está na lista de códigos válidos.
 */
export async function fetchEmpresasFromBackend(
  codes: string[]
): Promise<CadastroEmpresa[]> {
  try {
    const response = await fetch(`${NEST_URL}soc/empresas`);
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter((e: CadastroEmpresa) => codes.includes(String(e.CODIGO)));
  } catch {
    return [];
  }
}

/**
 * Busca empresas para o registration_code.
 * No servidor: busca via API do backend.
 * No cliente: busca via IndexedDB (fallback).
 */
export async function getEmpresasFromRegistrationCode(
  registrationCode: string
): Promise<EmpresaParseResult> {
  const codes = parseEmpresaCodes(registrationCode);
  const invalidCodes = codes.filter((c) => !isValidEmpresaCode(c));
  const validCodes = codes.filter((c) => isValidEmpresaCode(c));

  if (validCodes.length === 0) {
    return { empresas: [], missingCodes: [], invalidCodes, originalCode: registrationCode };
  }

  if (typeof window === "undefined") {
    const empresas = await fetchEmpresasFromBackend(validCodes);
    const foundCodes = empresas.map((e) => String(e.CODIGO));
    const missingCodes = validCodes.filter((c) => !foundCodes.includes(c));
    return { empresas, missingCodes, invalidCodes, originalCode: registrationCode };
  }

  const { IndexDb } = await import("../indexDb/indexdb");
  const empresas: CadastroEmpresa[] = [];
  const missingCodes: string[] = [];

  for (const code of validCodes) {
    const empresa = await IndexDb.getCompanyById(code);
    if (empresa) {
      empresas.push(empresa);
    } else {
      missingCodes.push(code);
    }
  }

  return { empresas, missingCodes, invalidCodes, originalCode: registrationCode };
}

/**
 * Retorna apenas os códigos das empresas (sem detalhes)
 */
export function getEmpresaCodes(registrationCode: string): string[] {
  return parseEmpresaCodes(registrationCode);
}

/**
 * Verifica se o registration_code está vazio ou é inválido
 */
export function isRegistrationCodeEmpty(registrationCode: string | undefined): boolean {
  return !registrationCode || !registrationCode.trim();
}
