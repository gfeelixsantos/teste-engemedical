/**
 * Resolve o código do profissional responsável pelo ASO a partir de múltiplas
 * fontes, com normalização para lidar com CRM no formato "12345/SP".
 *
 * Ordem de prioridade:
 * 1. payload.medico (campo enviado pelo backend na mensagem da fila)
 * 2. exameClinico.codigoProfissional
 * 3. scheduling.MEDICO
 * 4. scheduling.profissional.codigo
 */
export function resolveAsoProfessionalCode(input: {
  payloadMedico?: string | null;
  exameClinico?: {
    codigoProfissional?: string | null;
  } | null;
  scheduling?:
    | ({
        MEDICO?: string | null;
        profissional?: {
          codigo?: string | null;
        } | null;
      } & Record<string, unknown>)
    | null;
}): string {
  const raw = String(
    input.payloadMedico ||
      input.exameClinico?.codigoProfissional ||
      input.scheduling?.MEDICO ||
      input.scheduling?.profissional?.codigo ||
      '',
  ).trim();

  return normalizeProfessionalCode(raw);
}

/**
 * Normaliza um código de profissional removendo sufixos de UF do CRM.
 *
 * Exemplos:
 *   "12345/SP"  → "12345"
 *   "CRM 12345" → "12345"
 *   "12345"     → "12345"
 *   "98765"     → "98765"
 */
export function normalizeProfessionalCode(value: string): string {
  if (!value) return '';

  // Remove prefixos textuais como "CRM", "CRO", "CFM" seguidos de espaço
  let normalized = value.replace(/^[A-Za-z]{2,4}\s*/i, '').trim();

  // Remove sufixo de UF: "12345/SP" → "12345"
  if (normalized.includes('/')) {
    normalized = normalized.split('/')[0].trim();
  }

  // Remove zeros à esquerda para normalizar "00123" → "123" (compatível com SOC)
  if (/^\d+$/.test(normalized)) {
    normalized = String(Number(normalized));
  }

  return normalized;
}
