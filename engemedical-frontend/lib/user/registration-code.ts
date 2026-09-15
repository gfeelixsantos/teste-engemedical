export type RegistrationUserType = "interno" | "cliente";

export interface RegistrationCodeResolution {
  normalizedCode: string;
  userCodigo: string;
  socCodigo: string | null;
  tipoUsuario: RegistrationUserType;
}

const INTERNAL_PREFIX = "ENGM-";

export function normalizeRegistrationCode(code: string): string {
  return String(code ?? "").toUpperCase().replace(/\s+/g, "");
}

export function resolveRegistrationCode(code: string): RegistrationCodeResolution {
  const normalizedCode = normalizeRegistrationCode(code);

  if (normalizedCode.startsWith("ENGM-")) {
    const socCodigo = normalizedCode.slice(INTERNAL_PREFIX.length);

    return {
      normalizedCode,
      userCodigo: socCodigo,
      socCodigo,
      tipoUsuario: "interno",
    };
  }

  return {
    normalizedCode,
    userCodigo: normalizedCode,
    socCodigo: null,
    tipoUsuario: "cliente",
  };
}
