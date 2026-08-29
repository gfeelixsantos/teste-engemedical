const PSYCHOSOCIAL_FORM_FIELDS = [
  'transtornoEmocional',
  'medicamentosControlados',
  'usoAlcoolDrogas',
  'tonturaDesmaios',
  'problemasSensoriais',
  'hipertensaoDiabetes',
  'relacionamentoFamiliar',
  'medoAlturaEspacos',
  'experienciaAlturaConfinado',
  'autoAvaliacaoAltura',
  'autoAvaliacaoConfinado',
  'observacoes',
];

const PSYCHOSOCIAL_TRIGGER_GROUPS = new Set(['ecg', 'eeg']);
const PSYCHOSOCIAL_TRIGGER_CODES = new Set(['22010017', '20.01.001-0']);

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

/**
 * Detecta se um payload de formulário contém dados psicossociais reais.
 * A heurística precisa ser mais ampla do que um único campo porque o frontend
 * pode enviar o formulário completo já preenchido com valores padrão.
 */
export function hasPsychosocialFormData(formulario: unknown): boolean {
  if (!formulario || typeof formulario !== 'object') return false;

  const form = formulario as Record<string, unknown>;

  return PSYCHOSOCIAL_FORM_FIELDS.some((field) =>
    hasMeaningfulValue(form[field]),
  );
}

function normalizeGroupName(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Quando ECG/EEG carregam o formulário psicossocial, o exame atual deve ser
 * concluído com um payload neutro e o conteúdo psicossocial deve seguir para
 * o exame Psicossocial.
 */
export function shouldPersistConcludedPayloadForAuxiliaryExam(params: {
  grupo?: unknown;
  codigoExame?: unknown;
  formulario?: unknown;
}): boolean {
  if (!hasPsychosocialFormData(params.formulario)) {
    return false;
  }

  const grupoNormalizado = normalizeGroupName(params.grupo);
  const codigoNormalizado = String(params.codigoExame ?? '').trim();

  return (
    PSYCHOSOCIAL_TRIGGER_GROUPS.has(grupoNormalizado) ||
    PSYCHOSOCIAL_TRIGGER_CODES.has(codigoNormalizado)
  );
}

/**
 * Garante que formulários psicossociais válidos possuam conclusao: 'Apto' se estiver ausente ou vazia.
 */
export function ensurePsicossocialConclusao(formulario: unknown): any {
  if (!formulario || typeof formulario !== 'object' || Array.isArray(formulario)) {
    return formulario;
  }

  const form = { ...(formulario as Record<string, any>) };

  if (hasPsychosocialFormData(form)) {
    if (!form.conclusao || String(form.conclusao).trim() === '') {
      form.conclusao = 'Apto';
    }
  }

  return form;
}

