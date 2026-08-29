import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Frontend Audit Event DTO ──────────────────────────────────────────────────

export class FrontendAuditEventDto {
  @IsString()
  acao: string;

  @IsOptional()
  @IsString()
  userCodigo?: string;

  @IsOptional()
  @IsString()
  userNome?: string;

  @IsOptional()
  @IsString()
  userPerfil?: string;

  @IsOptional()
  @IsString()
  pacienteCodigo?: string;

  @IsOptional()
  @IsString()
  pacienteNome?: string;

  @IsOptional()
  @IsString()
  unidade?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

// ─── Query DTO ───────────────────────────────────────────────────────────────

export class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsISO8601()
  dataInicio?: string;

  @IsOptional()
  @IsISO8601()
  dataFim?: string;

  @IsOptional()
  @IsString()
  userCodigo?: string;

  @IsOptional()
  @IsString()
  userPerfil?: string;

  @IsOptional()
  @IsString()
  acao?: string;

  @IsOptional()
  @IsString()
  recursoTipo?: string;

  @IsOptional()
  @IsString()
  recursoId?: string;

  @IsOptional()
  @IsString()
  pacienteCodigo?: string;

  @IsOptional()
  @IsString()
  unidade?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

// ─── Response interfaces ──────────────────────────────────────────────────────

export interface AuditLogRecord {
  id: string;
  user_codigo: string | null;
  user_nome: string | null;
  user_perfil: string | null;
  acao: string;
  recurso_id: string | null;
  recurso_tipo: string | null;
  paciente_codigo: string | null;
  paciente_nome: string | null;
  unidade: string | null;
  /** Sanitized per LGPD rules — forbidden fields removed at all nesting levels */
  detalhes: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditResponseDto {
  data: AuditLogRecord[];
  pagination: PaginationMeta;
  filters: {
    dataInicio: string;
    dataFim: string;
  };
}
