function sanitize(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function toProxyUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return `/api/blob/proxy?url=${encodeURIComponent(url)}&_t=${Date.now()}`;
}

export function buildViewerUrl(url: string | null | undefined, displayName?: string): string | undefined {
  if (!url) return undefined;
  const name = displayName ? sanitize(displayName).replace(/\.pdf$/i, '') : 'Documento';
  return `/view?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
}

export function buildDocFilename(parts: string[], ext = '.pdf'): string {
  return [...parts, ext].join('');
}
