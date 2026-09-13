/**
 * SFTP Utilities — Helper functions for the SFTP Integration page
 */

import { FileStatus, RunStatus } from '../types';
import type { SftpKpis, SftpScheduleInfo } from '../types';

/* ─── File Size Formatter ─────────────────────────────── */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  if (i === 0) return `${bytes} B`;
  return `${value.toFixed(1)} ${units[i]}`;
}

/* ─── Date Formatters ───────────────────────────────── */

export function formatFileDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ─── Status Utilities ───────────────────────────────── */

export function getStatusColor(status: FileStatus | RunStatus): string {
  const colors: Record<FileStatus | RunStatus, string> = {
    downloading: 'text-amber-600',
    downloaded: 'text-emerald-600',
    parsing: 'text-blue-600',
    parsed: 'text-blue-600',
    processing: 'text-indigo-600',
    processed: 'text-emerald-600',
    error: 'text-red-600',
    dry_run: 'text-blue-600',
    soc_limited: 'text-teal-600',
  };
  return colors[status] || 'text-gray-600';
}

export function getStatusLabel(status: FileStatus | RunStatus): string {
  const labels: Record<FileStatus | RunStatus, string> = {
    downloading: 'Baixando',
    downloaded: 'Baixado',
    parsing: 'Analisando',
    parsed: 'Parseado',
    processing: 'Processando',
    processed: 'Processado',
    error: 'Erro',
    dry_run: 'Dry Run',
    soc_limited: 'Processado (SOC)',
  };
  return labels[status] || status;
}

export function getStatusBadgeProps(
  status: FileStatus | RunStatus
): { color: string; icon: string } {
  const statusMap: Record<FileStatus | RunStatus, { color: string; icon: string }> = {
    downloading: { color: 'warning', icon: 'download' },
    downloaded: { color: 'success', icon: 'check' },
    parsing: { color: 'info', icon: 'file-text' },
    parsed: { color: 'info', icon: 'file-text' },
    processing: { color: 'primary', icon: 'settings' },
    processed: { color: 'success', icon: 'check-circle' },
    error: { color: 'danger', icon: 'alert-triangle' },
    dry_run: { color: 'info', icon: 'search' },
    soc_limited: { color: 'secondary', icon: 'server' },
  };
  return statusMap[status] || { color: 'neutral', icon: 'circle' };
}

/* ─── Schedule Info ───────────────────────────────────── */

export function computeScheduleInfo(cronEnabled: boolean): SftpScheduleInfo {
  const timezone = 'America/Sao_Paulo';
  const cronExpression = '30 18 * * 1-5';

  const description = cronEnabled
    ? 'Execução automática de segunda a sexta, às 18:30 (BRT)'
    : 'Execução desativada';

  return {
    cronExpression,
    cronEnabled,
    timezone,
    lastExecution: null,
    nextExecution: cronEnabled ? calculateNextRun() : null,
    description,
  };
}

function calculateNextRun(): string {
  const now = new Date();
  // Simple calculation: next weekday at 18:30
  const today = now.getDay();
  const nextRun = new Date(now);

  if (today === 1) {
    // Monday - run same day if before 18:30, else next day
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() < 30)) {
      nextRun.setHours(18, 30, 0, 0);
    } else {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(18, 30, 0, 0);
    }
  } else {
    // Tue-Fri - check if before time, else next day
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() < 30)) {
      nextRun.setHours(18, 30, 0, 0);
    } else {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(18, 30, 0, 0);
    }
  }
  return nextRun.toISOString();
}

/* ─── KPI Computation ───────────────────────────────── */

export function computeKpis(files: any[], runs: any[]): SftpKpis {
  const totalFiles = files.length;
  const totalExecutions = runs.length;

  const sortedRuns = [...runs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const lastRun = sortedRuns[0];
  const lastExecutionDate = lastRun ? formatShortDate(lastRun.createdAt) : null;
  const lastExecutionTime = lastRun ? formatTime(lastRun.createdAt) : null;
  const lastExecutionStatus = lastRun?.status || null;

  const nextScheduled = lastRun ? calculateNextRun() : null;

  return {
    totalExecutions,
    totalFiles,
    lastExecutionDate,
    lastExecutionTime,
    lastExecutionStatus,
    nextScheduledExecution: nextScheduled,
    cronEnabled: true,
  };
}

/* ─── Validation Helpers ─────────────────────────────── */

export function validateRunStatus(status: string): status is RunStatus {
  return ['dry_run', 'parsed', 'soc_limited', 'error'].includes(status);
}

export function validateFileStatus(status: string): status is FileStatus {
  return [
    'downloading',
    'downloaded',
    'parsing',
    'parsed',
    'processing',
    'processed',
    'error',
  ].includes(status);
}