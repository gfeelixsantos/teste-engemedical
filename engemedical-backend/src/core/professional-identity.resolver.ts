import { ExamsScheduled } from 'src/mongo/types/scheduling';
import { IUserInfo } from 'src/user/interfaces/user.interface';

type ResolveProfessionalIdentityParams = {
  authUser?: IUserInfo | null;
  bodyProfessional?: IUserInfo | null;
  existingExam?: ExamsScheduled | null;
  route: string;
  requestId?: string;
};

type ResolveAsoFinishProfessionalIdentityParams = {
  authUser?: IUserInfo | null;
  bodyProfessional?: IUserInfo | null;
  clinicalProfessional?: Partial<IUserInfo> | null;
};

const normalizeString = (value: unknown): string => String(value || '').trim();

export function normalizeUserInfo(
  user?: Partial<IUserInfo> | null,
): IUserInfo | null {
  if (!user) return null;

  const codigo = normalizeString(user.codigo);
  const nome = normalizeString(user.nome);

  if (!codigo && !nome) {
    return null;
  }

  return {
    codigo,
    nome,
    email: normalizeString((user as any).email).toLowerCase(),
    cpf: normalizeString(user.cpf),
    conselho: normalizeString(user.conselho),
    ufconselho: normalizeString(user.ufconselho),
    perfil: normalizeString(user.perfil),
  };
}

export function parseAuthUserHeader(headerValue: unknown): IUserInfo | null {
  if (typeof headerValue !== 'string' || !headerValue.trim()) {
    return null;
  }

  try {
    return normalizeUserInfo(JSON.parse(headerValue));
  } catch {
    return null;
  }
}

export function snapshotToUserInfo(
  snapshot?: Partial<IUserInfo> | null,
): IUserInfo | null {
  return normalizeUserInfo({
    codigo: normalizeString(snapshot?.codigo),
    nome: normalizeString(snapshot?.nome),
    cpf: normalizeString(snapshot?.cpf),
    conselho: normalizeString(snapshot?.conselho),
    ufconselho: normalizeString(snapshot?.ufconselho),
    perfil: normalizeString(snapshot?.perfil),
  });
}

export function resolveProfessionalIdentity(
  params: ResolveProfessionalIdentityParams,
): IUserInfo | null {
  const bodyProfessional = normalizeUserInfo(params.bodyProfessional);
  if (bodyProfessional) {
    return bodyProfessional;
  }

  const authUser = normalizeUserInfo(params.authUser);
  if (authUser) {
    return authUser;
  }

  const existingProfessionalSnapshot = normalizeUserInfo(
    (params.existingExam as any)?.professional,
  );
  if (existingProfessionalSnapshot) {
    return existingProfessionalSnapshot;
  }

  const legacyExamProfessional = normalizeUserInfo({
    codigo: params.existingExam?.codigoProfissional,
    nome: params.existingExam?.profissional,
  });
  if (legacyExamProfessional) {
    return legacyExamProfessional;
  }

  return null;
}

export function resolveAsoFinishProfessionalIdentity(
  params: ResolveAsoFinishProfessionalIdentityParams,
): IUserInfo | null {
  const clinicalProfessional = normalizeUserInfo(params.clinicalProfessional);
  const authUser = normalizeUserInfo(params.authUser);
  const bodyProfessional = normalizeUserInfo(params.bodyProfessional);

  if (clinicalProfessional || authUser || bodyProfessional) {
    return normalizeUserInfo({
      codigo:
        clinicalProfessional?.codigo ||
        authUser?.codigo ||
        bodyProfessional?.codigo,
      nome:
        clinicalProfessional?.nome ||
        authUser?.nome ||
        bodyProfessional?.nome,
      cpf:
        clinicalProfessional?.cpf ||
        authUser?.cpf ||
        bodyProfessional?.cpf,
      conselho:
        clinicalProfessional?.conselho ||
        authUser?.conselho ||
        bodyProfessional?.conselho,
      ufconselho:
        clinicalProfessional?.ufconselho ||
        authUser?.ufconselho ||
        bodyProfessional?.ufconselho,
      perfil:
        clinicalProfessional?.perfil ||
        authUser?.perfil ||
        bodyProfessional?.perfil,
    });
  }

  return null;
}

export function hasProfessionalMismatch(
  authUser?: IUserInfo | null,
  bodyProfessional?: IUserInfo | null,
): boolean {
  const normalizedAuthUser = normalizeUserInfo(authUser);
  const normalizedBodyProfessional = normalizeUserInfo(bodyProfessional);

  if (!normalizedAuthUser || !normalizedBodyProfessional) {
    return false;
  }

  return (
    normalizeString(normalizedAuthUser.codigo) !==
      normalizeString(normalizedBodyProfessional.codigo) ||
    normalizeString(normalizedAuthUser.nome) !==
      normalizeString(normalizedBodyProfessional.nome)
  );
}
