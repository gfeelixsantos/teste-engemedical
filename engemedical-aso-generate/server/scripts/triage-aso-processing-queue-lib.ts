import {
  getMessageMissingRequiredFields,
  normalizeGroup,
} from './requeue-aso-processing-lib';

export type QueuePayload = {
  schedulingId?: string;
  nomeFuncionario?: string;
  tipoExameNome?: string;
  codEmpresa?: string;
  codFuncionario?: string;
  sequencial?: string;
  medico?: string;
  parecer?: string;
  action?: string;
};

export type QueueMessageSnapshot = {
  messageId: string;
  popReceipt?: string;
  insertedOn?: Date | string | null;
  expiresOn?: Date | string | null;
  dequeueCount?: number;
  payload: QueuePayload | null;
  rawText?: string;
};

export type BackendEligibilitySnapshot = {
  eligible: boolean;
  reasons: string[];
  clinicalDoctorCode?: string | null;
};

export type SchedulingTriageDecision =
  | 'KEEP_AS_IS'
  | 'DELETE_DUPLICATES_KEEP_LATEST'
  | 'DELETE_AND_REQUEUE_FROM_MONGO'
  | 'DELETE_INELIGIBLE'
  | 'INVESTIGATE_MANUALLY';

export type SchedulingTriageReport = {
  schedulingId: string;
  nomeFuncionario: string;
  messageCount: number;
  dequeueCounts: number[];
  hasInvalidPayload: boolean;
  missingFieldsUnion: string[];
  backendEligible: boolean | null;
  backendReasons: string[];
  hasMongoDoc: boolean;
  canonicalMessageId?: string;
  payloadDoctorCodes: string[];
  mongoDoctorCode?: string | null;
  decision: SchedulingTriageDecision;
  rationale: string[];
};

function normalizeValue(value: unknown): string {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function getInsertedMs(message: QueueMessageSnapshot): number {
  const value = message.insertedOn;
  if (!value) {
    return 0;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function pickCanonicalMessage(messages: QueueMessageSnapshot[]) {
  return [...messages].sort((a, b) => getInsertedMs(b) - getInsertedMs(a))[0];
}

export function evaluateBackendEligibility(doc: any): BackendEligibilitySnapshot {
  const reasons: string[] = [];
  const exams = Array.isArray(doc?.EXAMES) ? doc.EXAMES : [];
  const clinicalExam = exams.find((exam: any) =>
    normalizeGroup(exam?.grupo).includes('clin'),
  );

  const parecer = normalizeValue(doc?.PARECERMEDICO);
  const recommendation = String(doc?.RECOMENDACAOMEDICA || '').trim();
  const cargo = String(doc?.NOMECARGO || '');
  const tipoExameNome = normalizeValue(doc?.TIPOEXAMENOME);
  const altura = normalizeValue(
    doc?.PARECERTRABALHOALTURA || doc?.parecerTrabalhoAltura,
  );
  const espacoConfinado = normalizeValue(
    doc?.PARECERESPACOCONFINADO || doc?.parecerEspacoConfinado,
  );

  if (parecer !== 'APTO') {
    reasons.push('parecer_diferente_de_apto');
  }

  if (recommendation.length > 0) {
    reasons.push('possui_recomendacao_medica');
  }

  if (!clinicalExam) {
    reasons.push('sem_exame_clinico');
  }

  if (cargo.includes('KIT CREDENCIADA')) {
    reasons.push('cargo_kit_credenciada');
  }

  if (tipoExameNome === 'MONITORACAO PONTUAL') {
    reasons.push('monitoracao_pontual');
  }

  if (altura === 'INAPTO_ALTURA') {
    reasons.push('inapto_altura');
  }

  if (espacoConfinado === 'INAPTO_ESPACO_CONFINADO') {
    reasons.push('inapto_espaco_confinado');
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    clinicalDoctorCode: String(
      clinicalExam?.formulario?.codigoMedico ||
        clinicalExam?.formulario?.codigoProfissional ||
        clinicalExam?.codigoProfissional ||
        doc?.ASOINFO?.professional?.codigo ||
        doc?.ASOINFO?.codigoProfissional ||
        '',
    ).trim() || null,
  };
}

export function buildSchedulingTriageReport(params: {
  schedulingId: string;
  messages: QueueMessageSnapshot[];
  mongoDoc?: any | null;
}): SchedulingTriageReport {
  const { schedulingId, messages, mongoDoc } = params;
  const canonical = pickCanonicalMessage(messages);
  const invalidMessages = messages.filter(
    (message) => getMessageMissingRequiredFields(message.payload || {}).length > 0,
  );
  const missingFieldsUnion = Array.from(
    new Set(
      invalidMessages.flatMap((message) =>
        getMessageMissingRequiredFields(message.payload || {}),
      ),
    ),
  );
  const dequeueCounts = messages.map((message) => Number(message.dequeueCount || 0));
  const payloadDoctorCodes = Array.from(
    new Set(
      messages
        .map((message) => String(message.payload?.medico || '').trim())
        .filter(Boolean),
    ),
  );
  const backend = mongoDoc ? evaluateBackendEligibility(mongoDoc) : null;
  const rationale: string[] = [];
  let decision: SchedulingTriageDecision = 'KEEP_AS_IS';

  if (!mongoDoc) {
    decision = 'INVESTIGATE_MANUALLY';
    rationale.push('scheduling_nao_encontrado_no_mongo');
  } else if (backend && !backend.eligible) {
    decision = 'DELETE_INELIGIBLE';
    rationale.push(...backend.reasons);
  } else if (invalidMessages.length > 0) {
    decision = 'DELETE_AND_REQUEUE_FROM_MONGO';
    rationale.push('payload_incompleto_na_fila');
    rationale.push(...missingFieldsUnion.map((field) => `missing_${field}`));
  } else if (messages.length > 1) {
    const hasDoctorMismatch =
      backend?.clinicalDoctorCode &&
      payloadDoctorCodes.length > 0 &&
      payloadDoctorCodes.some((code) => code !== backend.clinicalDoctorCode);

    if (hasDoctorMismatch) {
      decision = 'DELETE_AND_REQUEUE_FROM_MONGO';
      rationale.push('duplicidade_com_medico_divergente');
    } else {
      decision = 'DELETE_DUPLICATES_KEEP_LATEST';
      rationale.push('duplicidade_por_scheduling_id');
    }
  }

  if (
    backend?.eligible &&
    mongoDoc?.ASOINFO?.error &&
    /codigo emissor de aso nao encontrado|ficha clinica nao encontrada/i.test(
      normalizeValue(mongoDoc.ASOINFO.error),
    )
  ) {
    decision = 'INVESTIGATE_MANUALLY';
    rationale.push('falha_soap_semantica_registrada');
  }

  return {
    schedulingId,
    nomeFuncionario: String(
      canonical?.payload?.nomeFuncionario || mongoDoc?.NOME || '',
    ),
    messageCount: messages.length,
    dequeueCounts,
    hasInvalidPayload: invalidMessages.length > 0,
    missingFieldsUnion,
    backendEligible: backend?.eligible ?? null,
    backendReasons: backend?.reasons || [],
    hasMongoDoc: Boolean(mongoDoc),
    canonicalMessageId: canonical?.messageId,
    payloadDoctorCodes,
    mongoDoctorCode: backend?.clinicalDoctorCode || null,
    decision,
    rationale,
  };
}
