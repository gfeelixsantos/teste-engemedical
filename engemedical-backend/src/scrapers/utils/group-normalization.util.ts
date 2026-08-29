const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_PATTERN = /[^A-Z0-9]/g;

export function normalizeGroupValue(
  value?: string,
  options?: { removeNonAlphanumeric?: boolean },
): string {
  const removeNonAlphanumeric = options?.removeNonAlphanumeric ?? true;
  const normalized = (value || '')
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .trim()
    .toUpperCase();

  if (!removeNonAlphanumeric) {
    return normalized.replace(/\s+/g, ' ');
  }

  return normalized.replace(NON_ALPHANUMERIC_PATTERN, '');
}

export function normalizeScraperGroup(value?: string): string {
  const normalized = normalizeGroupValue(value);

  if (!normalized) return '';
  if (normalized === 'RX' || normalized.startsWith('RAIOX')) return 'RAIOX';
  if (normalized.startsWith('LABORATORIO')) return 'LABORATORIO';
  if (normalized.startsWith('ELETROENCEFALOGRAMA')) return 'EEG';
  if (normalized.startsWith('EEG')) return 'EEG';
  if (normalized.startsWith('ELETROCARDIOGRAMA')) return 'ECG';
  if (normalized.startsWith('ECG')) return 'ECG';

  return normalized;
}

export function matchesAllowedGroups(
  groupValue: string | undefined,
  allowedGroups: readonly string[],
): boolean {
  const normalizedGroup = normalizeScraperGroup(groupValue);
  return allowedGroups.some(
    (allowedGroup) => normalizeScraperGroup(allowedGroup) === normalizedGroup,
  );
}
