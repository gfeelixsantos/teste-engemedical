import { ExamToogle } from 'src/soc/exames';

const IDENTITY_ONLY_FORM_KEYS = new Set([
  'medico',
  'codigoMedico',
  'profissional',
  'codigoProfissional',
]);

function isMeaningfulValue(value: any, key?: string): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (Array.isArray(value)) {
    return value.some((item) => isMeaningfulValue(item, key));
  }

  if (typeof value === 'object') {
    return Object.entries(value).some(([nestedKey, nestedValue]) =>
      isMeaningfulValue(nestedValue, nestedKey),
    );
  }

  return false;
}

export function hasMeaningfulExamFormData(formulario: any): boolean {
  if (
    !formulario ||
    typeof formulario !== 'object' ||
    Array.isArray(formulario)
  ) {
    return false;
  }

  const entries = Object.entries(formulario);
  if (entries.length === 0) {
    return false;
  }

  return entries.some(([key, value]) => {
    if (IDENTITY_ONLY_FORM_KEYS.has(key)) {
      return false;
    }

    return isMeaningfulValue(value, key);
  });
}

export function shouldRequireMeaningfulExamForm(
  exameInfo?: Partial<ExamToogle> | null,
): boolean {
  void exameInfo;
  return true;
}

export function buildMissingExamFormMessage(grupo?: string): string {
  const suffix = grupo ? ` do grupo ${grupo}` : '';
  return `Formulario${suffix} vazio ou sem dados clinicos/tecnicos suficientes para persistencia.`;
}
