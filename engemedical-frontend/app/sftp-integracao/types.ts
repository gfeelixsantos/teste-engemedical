/**
 * SFTP Integration Types — Engemedical
 *
 * Tipos para a página de monitoramento SFTP Grupo Tora.
 * Backend: NestJS sftp-integrator module
 * Storage: Cloudflare R2 (files), Cloudflare Queues (emails)
 */

/* ─── Enums ──────────────────────────────────────────── */

export const SFTP_CLIENT_KEY = 'grupo-tora' as const;

export const FILE_STATUS = {
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  PARSING: 'parsing',
  PARSED: 'parsed',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  ERROR: 'error',
} as const;

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS];

export const RUN_STATUS = {
  DRY_RUN: 'dry_run',
  PARSED: 'parsed',
  SOC_LIMITED: 'soc_limited',
  ERROR: 'error',
} as const;

export type RunStatus = (typeof RUN_STATUS)[keyof typeof RUN_STATUS];

/* ─── File Records ───────────────────────────────────── */

export interface SftpFileRecord {
  id: string;
  clientKey: string;
  remoteName: string;
  remotePath: string;
  size: number;
  sha256: string;
  remoteMtime: string | null;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
  r2Key?: string | null;
}

/* ─── Run Records (Parse/Process) ────────────────────── */

export interface SftpRunSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  successCount?: number;
  notInBaseCount?: number;
  errorCount?: number;
}

export interface SftpRunRecord {
  id: string;
  clientKey: string;
  fileId: string;
  status: RunStatus;
  summary: SftpRunSummary;
  createdAt: string;
  updatedAt: string;
  reportKey?: string | null;
  reportFileName?: string | null;
}

/* ─── KPIs ────────────────────────────────────────────── */

export interface SftpKpis {
  totalExecutions: number;
  totalFiles: number;
  lastExecutionDate: string | null;
  lastExecutionTime: string | null;
  lastExecutionStatus: RunStatus | null;
  nextScheduledExecution: string | null;
  cronEnabled: boolean;
}

/* ─── Schedule ────────────────────────────────────────── */

export interface SftpScheduleInfo {
  cronExpression: string;
  cronEnabled: boolean;
  timezone: string;
  lastExecution: string | null;
  nextExecution: string | null;
  description: string;
}

/* ─── API Response Wrappers ──────────────────────────── */

export interface SftpFilesResponse {
  files: SftpFileRecord[];
  total: number;
}

export interface SftpRunsResponse {
  runs: SftpRunRecord[];
  total: number;
}

export interface SftpDashboardData {
  kpis: SftpKpis;
  files: SftpFileRecord[];
  runs: SftpRunRecord[];
  schedule: SftpScheduleInfo;
}

/* ─── Action States ──────────────────────────────────── */

export interface SftpActionState {
  isPulling: boolean;
  isProcessing: boolean;
  lastError: string | null;
  lastSuccess: string | null;
}
