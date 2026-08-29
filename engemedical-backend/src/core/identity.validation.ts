import { HttpException, HttpStatus, Logger } from '@nestjs/common';

import { ExamsScheduled } from 'src/mongo/types/scheduling';
import { UserSignatureSettings } from 'src/signature/signature.service';
import { IUserInfo } from 'src/user/interfaces/user.interface';

import {
  hasProfessionalMismatch,
  normalizeUserInfo,
} from './professional-identity.resolver';

export const PROFESSIONAL_IDENTITY_ERROR_CODE = 'PROFESSIONAL_IDENTITY_INVALID';

export const PROFESSIONAL_IDENTITY_FLAGS = {
  mismatchBlock: 'ENABLE_AUTH_USER_MISMATCH_BLOCK',
  examIdentityBlock: 'ENABLE_PDF_IDENTITY_422_BLOCK',
  asoIdentityBlock: 'ENABLE_ASO_IDENTITY_422_BLOCK',
  identityErrorStatus: 'ENABLE_IDENTITY_ERROR_STATUS',
} as const;

const STRICT_PROFESSIONAL_IDENTITY_GROUPS = new Set([
  'exameclinico',
  'audiometria',
  'aso',
]);

const normalizeString = (value: unknown): string => String(value || '').trim();

const isFeatureEnabled = (flagName: string): boolean =>
  String(process.env[flagName] || '')
    .trim()
    .toLowerCase() === 'true';

const normalizeGroup = (value?: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

type ProfessionalIdentityLike = Partial<IUserInfo> | null | undefined;

export function requiresStrictProfessionalIdentityForGroup(
  group?: string,
): boolean {
  return STRICT_PROFESSIONAL_IDENTITY_GROUPS.has(normalizeGroup(group));
}

export function hasMinimumProfessionalIdentity(
  professional?: ProfessionalIdentityLike,
): boolean {
  const normalized = normalizeUserInfo({
    codigo: normalizeString((professional as any)?.codigo),
    nome: normalizeString((professional as any)?.nome),
    cpf: normalizeString((professional as any)?.cpf),
    conselho: normalizeString((professional as any)?.conselho),
    ufconselho: normalizeString((professional as any)?.ufconselho),
    perfil: normalizeString((professional as any)?.perfil),
  });

  return Boolean(normalized?.codigo && normalized?.nome);
}

export function isAuthUserMismatchBlockEnabled(): boolean {
  return isFeatureEnabled(PROFESSIONAL_IDENTITY_FLAGS.mismatchBlock);
}

export function isExamProfessionalIdentityBlockEnabled(): boolean {
  return isFeatureEnabled(PROFESSIONAL_IDENTITY_FLAGS.examIdentityBlock);
}

export function isAsoProfessionalIdentityBlockEnabled(): boolean {
  return isFeatureEnabled(PROFESSIONAL_IDENTITY_FLAGS.asoIdentityBlock);
}

export function isIdentityErrorStatusEnabled(): boolean {
  return isFeatureEnabled(PROFESSIONAL_IDENTITY_FLAGS.identityErrorStatus);
}

function buildProfessionalIdentityException(params: {
  route: string;
  status: HttpStatus;
  grupo?: string;
  reason: string;
  authCodigo?: string;
  bodyCodigo?: string;
}) {
  return new HttpException(
    {
      message: 'Identidade profissional inconsistente ou insuficiente.',
      code: PROFESSIONAL_IDENTITY_ERROR_CODE,
      details: {
        route: params.route,
        grupo: params.grupo || undefined,
        reason: params.reason,
        authCodigo: params.authCodigo || undefined,
        bodyCodigo: params.bodyCodigo || undefined,
      },
    },
    params.status,
  );
}

export function assertProfessionalMismatch(params: {
  route: string;
  authUser?: IUserInfo | null;
  bodyProfessional?: IUserInfo | null;
  grupo?: string;
  enforced?: boolean;
}): void {
  if (!params.enforced) {
    return;
  }

  if (!hasProfessionalMismatch(params.authUser, params.bodyProfessional)) {
    return;
  }

  throw buildProfessionalIdentityException({
    route: params.route,
    grupo: params.grupo,
    status: HttpStatus.CONFLICT,
    reason: 'AUTH_BODY_MISMATCH',
    authCodigo: normalizeString(params.authUser?.codigo),
    bodyCodigo: normalizeString(params.bodyProfessional?.codigo),
  });
}

export function assertProfessionalIdentityAvailable(params: {
  route: string;
  professional?: ProfessionalIdentityLike;
  grupo?: string;
  required?: boolean;
  enforced?: boolean;
}): void {
  if (!params.required || !params.enforced) return;
  if (hasMinimumProfessionalIdentity(params.professional)) return;

  throw buildProfessionalIdentityException({
    route: params.route,
    grupo: params.grupo,
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    reason: 'INSUFFICIENT_IDENTITY',
  });
}

export class IdentityValidator {
  private static readonly logger = new Logger(IdentityValidator.name);

  static validateProfessionalIdentity(
    user: IUserInfo,
    supabaseSettings: UserSignatureSettings | null,
    exam: ExamsScheduled,
  ): boolean {
    if (supabaseSettings && user.codigo !== supabaseSettings.user_codigo) {
      this.logger.error(
        `Mismatch: Frontend User ${user.codigo} vs Supabase ${supabaseSettings.user_codigo}`,
      );
      return false;
    }

    if (exam.codigoProfissional && exam.codigoProfissional !== user.codigo) {
      this.logger.warn(
        `Warning: Exam signed by ${exam.codigoProfissional} but current user is ${user.codigo}`,
      );
      return false;
    }

    if (
      !hasMinimumProfessionalIdentity({
        codigo: exam.codigoProfissional,
        nome: exam.profissional || exam.formulario?.medico,
      })
    ) {
      this.logger.error(
        `Erro Crítico: Exame ${exam.codigoExame} elegível para assinatura sem codigoProfissional!`,
      );
      return false;
    }

    return true;
  }
}
