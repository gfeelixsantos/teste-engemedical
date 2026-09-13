/**
 * Tipos para as APIs de relatórios SFTP (públicas)
 * Usadas pela página de Integração SFTP do frontend
 */

export type SftpStatus =
  | 'downloading'
  | 'downloaded'
  | 'parsing'
  | 'parsed'
  | 'processing'
  | 'processed'
  | 'error';

export type SftpRunStatus = 'parsed' | 'dry_run' | 'soc_limited' | 'error';

/**
 * Representa um registro de arquivo SFTP
 */
export interface SftpFileRecordDto {
  id: string;
  clientKey: string;
  remoteName: string;
  remotePath: string;
  size: number;
  sha256: string;
  remoteMtime: Date | null;
  status: SftpStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resumo de execução de um run/processamento
 */
export interface SftpRunSummaryDto {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  successCount?: number;
  notInBaseCount?: number;
  errorCount?: number;
}

/**
 * Representa um registro de execução
 */
export interface SftpRunRecordDto {
  id: string;
  clientKey: string;
  fileId: string;
  status: SftpRunStatus;
  summary: SftpRunSummaryDto;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resposta para GET /sftp-executions
 */
export interface SftpExecutionsResponse {
  executions: SftpRunRecordDto[];
  total: number;
}

/**
 * Resposta para GET /sftp-files
 */
export interface SftpFilesResponse {
  files: SftpFileRecordDto[];
  total: number;
}

/**
 * Resposta para GET /sftp-report/:id
 */
export interface SftpReportDto {
  execution: SftpRunRecordDto | null;
  file?: SftpFileRecordDto;
}

/**
 * Informações de horário/schedule
 */
export interface SftpHorariosDto {
  clientKey: string;
  cronExpression: string;
  cronEnabled: boolean;
  nextExecution?: Date | null;
  lastExecution?: Date | null;
  timezone: string;
}

/**
 * Resposta para GET /sftp-horarios
 */
export interface SftpHorariosResponse {
  horarios: SftpHorariosDto[];
}

/**
 * Tipos de queries permitidas
 */
export interface SftpExecutionsQuery {
  clientKey?: string;
  status?: SftpRunStatus;
  limit?: number;
  skip?: number;
}

export interface SftpFilesQuery {
  clientKey?: string;
  status?: SftpStatus;
  limit?: number;
  skip?: number;
}