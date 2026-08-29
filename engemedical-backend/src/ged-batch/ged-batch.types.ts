import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export type GedBatchJobStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'partial';

export type GedBatchJobItemStatus = 'pending' | 'completed' | 'failed';

export type GedBatchScope = 'empresa' | 'periodo' | 'prontuario';
export type GedBatchTipo = 'prontuario' | 'aso';

export type GedBatchJobItem = {
  codigoProntuario: string;
  nome: string;
  status: GedBatchJobItemStatus;
  error?: string;
  dataAgendamento?: string;
  tipoExame?: string;
};

export type GedBatchJobResult = {
  zipBlobName?: string;
  zipUrl?: string;
};

export type GedBatchJobError = {
  codigoProntuario?: string;
  funcionario?: string;
  message: string;
};

export type GedBatchRequestedBy = {
  userId?: string;
  nome?: string;
  unidade?: string;
};

export type GedBatchEmpresa = {
  codigoEmpresa: string;
  razaoSocial: string;
};

export type GedBatchPeriodo = {
  ano?: string;
  mes?: string;
};

export type GedBatchJobDocument = {
  _id: string;
  scope: GedBatchScope;
  requestedBy: GedBatchRequestedBy;
  empresa: GedBatchEmpresa;
  periodo?: GedBatchPeriodo;
  tipo?: GedBatchTipo;
  createdAt: Date;
  updatedAt: Date;
  status: GedBatchJobStatus;
  totalFuncionarios: number;
  processedFuncionarios: number;
  succeededFuncionarios: number;
  failedFuncionarios: number;
  result?: GedBatchJobResult;
  errors?: GedBatchJobError[];
  items: GedBatchJobItem[];
};

export type GedBatchJob = Omit<GedBatchJobDocument, '_id'> & {
  id: string;
};

export type GedBatchJobSummary = GedBatchJob;

// ---------------------------------------------------------------------------
// DTOs com class-validator para validação automática no NestJS ValidationPipe
// ---------------------------------------------------------------------------

export class GedBatchPeriodoDto {
  @IsOptional()
  @IsString()
  ano?: string;

  @IsOptional()
  @IsString()
  mes?: string;
}

export class GedBatchProntuarioItemDto {
  @IsString()
  @IsNotEmpty()
  codigoProntuario: string;

  @IsString()
  @IsNotEmpty()
  nome: string;
}

export class CreateGedBatchDto {
  /**
   * Escopo do lote:
   * - `empresa`: usa apenas `codigoEmpresa` e resolve todos os prontuarios elegiveis.
   * - `periodo`: exige `periodo` (ano + mes).
   * - `prontuario`: exige `periodo` e ao menos um item em `prontuarios`.
   *
   * Retrocompatibilidade: quando omitido, o valor e inferido automaticamente.
   * Se `prontuarios` tiver ao menos 1 item => `prontuario`.
   * Se `periodo` estiver presente => `periodo`.
   * Caso contrario => `empresa`.
   */
  @IsOptional()
  @IsIn(['empresa', 'periodo', 'prontuario'])
  scope?: GedBatchScope;

  @IsString()
  @IsNotEmpty()
  codigoEmpresa: string;

  @IsString()
  @IsNotEmpty()
  razaoSocial: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GedBatchPeriodoDto)
  periodo?: GedBatchPeriodo;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GedBatchProntuarioItemDto)
  prontuarios?: { codigoProntuario: string; nome: string }[];

  @IsOptional()
  @IsIn(['prontuario', 'aso'])
  tipo?: GedBatchTipo;
}

/**
 * Infere o escopo a partir do payload quando `scope` nao foi fornecido explicitamente.
 * Garante retrocompatibilidade com jobs anteriores que nao tinham o campo.
 */
export function inferScope(dto: CreateGedBatchDto): GedBatchScope {
  if (dto.scope) return dto.scope;
  if (dto.prontuarios && dto.prontuarios.length >= 1) return 'prontuario';
  if (dto.periodo?.ano && dto.periodo?.mes) return 'periodo';
  return 'empresa';
}

/**
 * Valida as regras de negocio por escopo.
 * Lanca `Error` com mensagem descritiva se as restricoes nao forem atendidas.
 */
export function validateScopeConstraints(
  scope: GedBatchScope,
  dto: CreateGedBatchDto,
): void {
  switch (scope) {
    case 'periodo':
      if (!dto.periodo?.ano || !dto.periodo?.mes) {
        throw new Error(
          'scope=periodo exige periodo.ano e periodo.mes preenchidos.',
        );
      }
      break;

    case 'prontuario':
      if (!dto.periodo?.ano || !dto.periodo?.mes) {
        throw new Error(
          'scope=prontuario exige periodo.ano e periodo.mes preenchidos.',
        );
      }
      if (!dto.prontuarios || dto.prontuarios.length < 1) {
        throw new Error(
          'scope=prontuario exige ao menos um item em prontuarios.',
        );
      }
      break;

    case 'empresa':
    default:
      // empresa: apenas codigoEmpresa e razaoSocial sao obrigatorios (ja validados pelo ValidationPipe)
      break;
  }
}
