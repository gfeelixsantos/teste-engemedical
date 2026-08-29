export type AsoRequeuePayload = {
  commandId?: string;
  schedulingId: string;
  sequencial: string;
  nomeFuncionario: string;
  nomeEmpresa: string;
  tipoExame: string;
  tipoExameNome: string;
  dataFicha: string;
  codEmpresa: string;
  codFuncionario: string;
  cpfFuncionario: string;
  parecer: string;
  observacoesParecer?: string[];
  action: 'REPROCESSAR';
  createdAt: string;
  medico: string;
  prontuario: string;
  socgedCode: string;
  profissional?: any;
  credentials?: {
    pin?: string;
  };
};

export function normalizeGroup(value: unknown): string {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeDoctorCode(value: unknown): string {
  const raw = String(value || '').trim();
  return /^\d+$/.test(raw) ? raw : '';
}

function resolveProfessionalCode(doc: any): string {
  const clinicalExam = Array.isArray(doc?.EXAMES)
    ? doc.EXAMES.find((exam: any) =>
        normalizeGroup(exam?.grupo).includes('clin'),
      )
    : undefined;
  const clinicalForm = clinicalExam?.formulario || {};
  const professional =
    doc?.ASOINFO?.professional && typeof doc.ASOINFO.professional === 'object'
      ? doc.ASOINFO.professional
      : undefined;

  const candidates = [
    clinicalForm?.codigoMedico,
    clinicalForm?.codigoProfissional,
    clinicalExam?.codigoProfissional,
    professional?.codigo,
    doc?.ASOINFO?.codigoProfissional,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeDoctorCode(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

export function buildAsoRequeuePayload(doc: any): AsoRequeuePayload {
  const professional =
    doc?.ASOINFO?.professional && typeof doc.ASOINFO.professional === 'object'
      ? doc.ASOINFO.professional
      : undefined;
  const professionalCode = resolveProfessionalCode(doc);

  return {
    schedulingId: String(doc?._id || ''),
    sequencial: String(doc?.SEQUENCIAFICHA || ''),
    nomeFuncionario: String(doc?.NOME || ''),
    nomeEmpresa: String(doc?.NOMEEMPRESA || ''),
    tipoExame: String(doc?.TIPOEXAME || ''),
    tipoExameNome: String(doc?.TIPOEXAMENOME || ''),
    dataFicha: String(doc?.DATAAGENDAMENTO || ''),
    codEmpresa: String(doc?.CODIGOEMPRESA || ''),
    codFuncionario: String(doc?.CODIGO || ''),
    cpfFuncionario: String(doc?.CPFFUNCIONARIO || ''),
    parecer: String(doc?.PARECERMEDICO || ''),
    observacoesParecer: Array.isArray(doc?.ASOINFO?.observacoesParecer)
      ? doc.ASOINFO.observacoesParecer
      : [],
    action: 'REPROCESSAR',
    createdAt: new Date().toISOString(),
    medico: professionalCode,
    prontuario: String(doc?.CODIGOPRONTUARIO || ''),
    socgedCode: '',
    ...(professional ? { profissional: professional } : {}),
    ...(doc?.ASOINFO?.credentials
      ? { credentials: doc.ASOINFO.credentials }
      : {}),
  };
}

export function isAsoEligibleForProcessing(doc: any): boolean {
  const parecer = String(doc?.PARECERMEDICO || '')
    .trim()
    .toUpperCase();
  const recommendation = String(doc?.RECOMENDACAOMEDICA || '').trim();
  const tipoExameNome = String(doc?.TIPOEXAMENOME || '')
    .trim()
    .toUpperCase();
  const asoInfoStatus = String(doc?.ASOINFO?.status || '')
    .trim()
    .toUpperCase();
  const asoStatus = String(doc?.ASOSTATUS || '')
    .trim()
    .toUpperCase();
  const hasAsoUrl = Boolean(String(doc?.ASOINFO?.url || '').trim());
  const alreadyGenerated =
    hasAsoUrl ||
    asoInfoStatus === 'LIBERADO' ||
    asoInfoStatus === 'DIGITALIZADA' ||
    asoStatus === 'LIBERADO';

  return (
    parecer === 'APTO' &&
    recommendation.length === 0 &&
    tipoExameNome !== 'MONITORACAO PONTUAL' &&
    !alreadyGenerated
  );
}

export function isPendingMongoAsoCandidate(
  doc: any,
  allowedStatuses: Set<string>,
): boolean {
  const status = String(doc?.ASOINFO?.status || '')
    .trim()
    .toUpperCase();
  const hasUrl = Boolean(String(doc?.ASOINFO?.url || '').trim());

  return (
    allowedStatuses.has(status) &&
    !hasUrl &&
    isAsoEligibleForProcessing(doc)
  );
}

export function getMissingRequiredFields(payload: {
  schedulingId?: string;
  sequencial?: string;
  codEmpresa?: string;
  codFuncionario?: string;
  medico?: string;
}): string[] {
  const missing = [
    ['schedulingId', payload.schedulingId],
    ['sequencial', payload.sequencial],
    ['codEmpresa', payload.codEmpresa],
    ['codFuncionario', payload.codFuncionario],
    ['medico', payload.medico],
  ] as const;

  return missing
    .filter(([, value]) => !String(value || '').trim())
    .map(([field]) => field);
}

export function getMessageMissingRequiredFields(message: any): string[] {
  return getMissingRequiredFields({
    schedulingId: message?.schedulingId,
    sequencial: message?.sequencial,
    codEmpresa: message?.codEmpresa,
    codFuncionario: message?.codFuncionario,
    medico: message?.medico,
  });
}
