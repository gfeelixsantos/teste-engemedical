import {
  AtendimentoAuthInfo,
  AtendimentoBiometriaInfo,
  AtendimentoEvidenceInfo,
  AtendimentoFacialInfo,
} from 'src/mongo/types/scheduling';

export type UnifiedAtendimentoAuthInfo = {
  metodo: AtendimentoAuthInfo['metodo'];
  status: AtendimentoAuthInfo['status'] | null;
  requestId: string | null;
  validadoEm: string | null;
  validadoPor: string | null;
  evidencias: Required<AtendimentoEvidenceInfo>;
  biometria: Required<AtendimentoBiometriaInfo>;
  facial: Required<AtendimentoFacialInfo>;
};

function buildEmptyEvidence(): Required<AtendimentoEvidenceInfo> {
  return {
    termoCienciaUrl: null,
    termoCienciaHash: null,
    relatorioEvidenciasUrl: null,
    relatorioEvidenciasHash: null,
  };
}

function buildEmptyBiometria(): Required<AtendimentoBiometriaInfo> {
  return {
    cadastroId: null,
    dedo: null,
    templateVersion: null,
  };
}

function buildEmptyFacial(): Required<AtendimentoFacialInfo> {
  return {
    provider: null,
    sessionId: null,
    transactionId: null,
    imagemRepresentativaUrl: null,
    imagemRepresentativaHash: null,
    confidence: null,
  };
}

function mergeMaybeObjects<T extends Record<string, unknown>>(
  base: T,
  override?: Partial<T> | null,
): T {
  return {
    ...base,
    ...(override || {}),
  };
}

export function buildUnifiedAtendimentoAuthInfo(
  input: Partial<AtendimentoAuthInfo> & Pick<AtendimentoAuthInfo, 'metodo'>,
): UnifiedAtendimentoAuthInfo {
  const evidencias = mergeMaybeObjects(buildEmptyEvidence(), input.evidencias);
  const biometria = mergeMaybeObjects(buildEmptyBiometria(), input.biometria);
  const facial = mergeMaybeObjects(buildEmptyFacial(), input.facial);

  return {
    metodo: input.metodo,
    status: input.status ?? null,
    requestId: input.requestId ?? null,
    validadoEm: input.validadoEm ?? null,
    validadoPor: input.validadoPor ?? null,
    evidencias,
    biometria:
      input.metodo === 'FACIAL' ? buildEmptyBiometria() : biometria,
    facial:
      input.metodo === 'BIOMETRIA' || input.metodo === 'SOC'
        ? buildEmptyFacial()
        : facial,
  };
}

export function mergeUnifiedAtendimentoAuthInfo(
  existing: Partial<AtendimentoAuthInfo> | null | undefined,
  update: Partial<AtendimentoAuthInfo>,
): UnifiedAtendimentoAuthInfo {
  const metodo =
    update.metodo || existing?.metodo || ('SOC' as AtendimentoAuthInfo['metodo']);
  const merged = {
    ...(existing || {}),
    ...(update || {}),
    evidencias: {
      ...(existing?.evidencias || {}),
      ...(update.evidencias || {}),
    },
    biometria: {
      ...(existing?.biometria || {}),
      ...(update.biometria || {}),
    },
    facial: {
      ...(existing?.facial || {}),
      ...(update.facial || {}),
    },
    metodo,
  } as Partial<AtendimentoAuthInfo> & Pick<AtendimentoAuthInfo, 'metodo'>;

  return buildUnifiedAtendimentoAuthInfo(merged);
}
