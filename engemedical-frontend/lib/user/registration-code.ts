export type RegistrationUserType = "interno" | "cliente";

export interface RegistrationCodeResolution {
  normalizedCode: string;
  userCodigo: string;
  socCodigo: string | null;
  tipoUsuario: RegistrationUserType;
}

const INTERNAL_PREFIX = "ENGM-";

export function resolveRegistrationCode(code: string): RegistrationCodeResolution {
  const normalizedCode = String(code ?? "").trim().toUpperCase();

  if (normalizedCode.startsWith("ENGM-")) {
    const socCodigo = normalizedCode.slice(INTERNAL_PREFIX.length).trim();

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
