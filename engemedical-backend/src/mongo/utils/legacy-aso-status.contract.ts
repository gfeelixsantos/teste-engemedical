import { AsoStatus } from '../enum/scheduling.enum';
import type { SignatureStatus } from '../types/scheduling';

type LegacyAsoStatusInput = {
  currentLegacyStatus?: string | null;
  currentUrl?: string | null;
  nextStatus?: SignatureStatus | string | null;
  nextUrl?: string | null;
};

function hasUrl(value?: string | null): boolean {
  return Boolean(String(value || '').trim());
}

export function mapToLegacyAsoStatus(
  input: LegacyAsoStatusInput,
): string {
  const currentLegacyStatus = String(input.currentLegacyStatus || '')
    .trim()
    .toUpperCase();
  const nextStatus = String(input.nextStatus || '')
    .trim()
    .toUpperCase();
  const effectiveHasUrl = hasUrl(input.nextUrl) || hasUrl(input.currentUrl);

  if (currentLegacyStatus === AsoStatus.KIT_CREDENCIADA) {
    return AsoStatus.KIT_CREDENCIADA;
  }

  switch (nextStatus) {
    case 'LIBERADO':
    case 'ASSINADO':
    case 'DIGITALIZADA':
    case 'PROCESSANDO':
      return AsoStatus.GERADO;
    case 'FALHA':
      return 'ERRO';
    case 'PENDENTE':
    case 'AGUARDANDO_AUTENTICACAO':
    case 'ERRO_IDENTIDADE_PROFISSIONAL':
      return effectiveHasUrl ? AsoStatus.GERADO : AsoStatus.NAO_GERADO;
    default:
      return effectiveHasUrl ? AsoStatus.GERADO : AsoStatus.NAO_GERADO;
  }
}
