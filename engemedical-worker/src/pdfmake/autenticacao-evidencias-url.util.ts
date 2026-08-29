import { buildValidationBlobPath } from './termo-consentimento.types';

export function buildPublicEvidenceUrl(
  prontuario?: string | null,
): string | null {
  const id = String(prontuario || '').trim();
  if (!id) {
    return null;
  }

  const account = process.env.AZURE_STORAGE_ACCOUNT || 'cmsodocs';
  const container = process.env.AZURE_CONTAINER_PUBLIC || 'public';
  const blobPath = buildValidationBlobPath(id);

  return `https://${account}.blob.core.windows.net/${container}/${blobPath}`;
}

/**
 * URL canonica do relatorio de evidencias — mesma regra do termo de aceite.
 */
export function resolveRelatorioEvidenciasUrl(
  prontuario?: string | null,
  current?: string | null,
): string | null {
  const canonical = buildPublicEvidenceUrl(prontuario);
  if (canonical) {
    return canonical;
  }

  const trimmed = String(current || '').trim();
  return trimmed || null;
}
