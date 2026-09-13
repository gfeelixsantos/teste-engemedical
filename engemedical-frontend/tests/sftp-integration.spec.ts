/**
 * SFTP Integration — Test Suite (TDD)
 *
 * Testes cobrem:
 * 1. Types/Interfaces (compile-time)
 * 2. API Route handlers
 * 3. useSftpIntegration hook
 * 4. Component rendering
 * 5. Data transformations
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* ─── 1. Types Validation ────────────────────────────── */

describe('SFTP Types', () => {
  it('SFTP_CLIENT_KEY should be "grupo-tora"', async () => {
    const { SFTP_CLIENT_KEY } = await import('../app/sftp-integracao/types');
    assert.equal(SFTP_CLIENT_KEY, 'grupo-tora');
  });

  it('FILE_STATUS should have all required states', async () => {
    const { FILE_STATUS } = await import('../app/sftp-integracao/types');
    assert.equal(FILE_STATUS.DOWNLOADING, 'downloading');
    assert.equal(FILE_STATUS.DOWNLOADED, 'downloaded');
    assert.equal(FILE_STATUS.PARSING, 'parsing');
    assert.equal(FILE_STATUS.PARSED, 'parsed');
    assert.equal(FILE_STATUS.PROCESSING, 'processing');
    assert.equal(FILE_STATUS.PROCESSED, 'processed');
    assert.equal(FILE_STATUS.ERROR, 'error');
  });

  it('RUN_STATUS should have all required states', async () => {
    const { RUN_STATUS } = await import('../app/sftp-integracao/types');
    assert.equal(RUN_STATUS.DRY_RUN, 'dry_run');
    assert.equal(RUN_STATUS.PARSED, 'parsed');
    assert.equal(RUN_STATUS.SOC_LIMITED, 'soc_limited');
    assert.equal(RUN_STATUS.ERROR, 'error');
  });
});

/* ─── 2. Data Transformations ────────────────────────── */

describe('SFTP Data Transformations', () => {
  it('formatFileSize should convert bytes to human-readable', async () => {
    const { formatFileSize } = await import('../lib/sftp-utils');
    assert.equal(formatFileSize(0), '0 B');
    assert.equal(formatFileSize(1024), '1 KB');
    assert.equal(formatFileSize(1048576), '1 MB');
    assert.equal(formatFileSize(1073741824), '1 GB');
    assert.equal(formatFileSize(512345), '500.3 KB');
  });

  it('formatFileDate should format dates to pt-BR', async () => {
    const { formatFileDate } = await import('../lib/sftp-utils');
    const date = '2026-09-10T18:30:00.000Z';
    const formatted = formatFileDate(date);
    assert.ok(formatted.includes('10'), 'should include day');
    assert.ok(formatted.includes('09') || formatted.includes('9'), 'should include month');
    assert.ok(formatted.includes('2026'), 'should include year');
  });

  it('getStatusColor should return correct colors for statuses', async () => {
    const { getStatusColor } = await import('../lib/sftp-utils');
    assert.equal(getStatusColor('downloaded'), 'text-emerald-600');
    assert.equal(getStatusColor('parsed'), 'text-blue-600');
    assert.equal(getStatusColor('error'), 'text-red-600');
    assert.equal(getStatusColor('downloading'), 'text-amber-600');
    assert.equal(getStatusColor('processing'), 'text-indigo-600');
  });

  it('getStatusLabel should return pt-BR labels', async () => {
    const { getStatusLabel } = await import('../lib/sftp-utils');
    assert.equal(getStatusLabel('downloaded'), 'Baixado');
    assert.equal(getStatusLabel('parsed'), 'Parseado');
    assert.equal(getStatusLabel('error'), 'Erro');
    assert.equal(getStatusLabel('processing'), 'Processando');
    assert.equal(getStatusLabel('soc_limited'), 'Processado (SOC)');
  });

  it('computeKpis should compute summary from files and runs', async () => {
    const { computeKpis } = await import('../lib/sftp-utils');
    const files = [
      { id: '1', createdAt: '2026-09-10T18:30:00Z', remoteName: 'a.xlsx' },
      { id: '2', createdAt: '2026-09-09T18:30:00Z', remoteName: 'b.xlsx' },
    ] as any[];
    const runs = [
      { id: 'r1', status: 'soc_limited', createdAt: '2026-09-10T19:00:00Z' },
      { id: 'r2', status: 'error', createdAt: '2026-09-09T19:00:00Z' },
    ] as any[];

    const kpis = computeKpis(files, runs);
    assert.equal(kpis.totalFiles, 2);
    assert.equal(kpis.totalExecutions, 2);
    assert.equal(kpis.lastExecutionStatus, 'soc_limited');
    assert.ok(kpis.lastExecutionDate, 'should have last execution date');
  });

  it('computeScheduleInfo should return schedule data', async () => {
    const { computeScheduleInfo } = await import('../lib/sftp-utils');
    const schedule = computeScheduleInfo(true);
    assert.equal(schedule.cronEnabled, true);
    assert.equal(schedule.timezone, 'America/Sao_Paulo');
    assert.ok(schedule.description.includes('18:30'));
    assert.equal(schedule.cronExpression, '30 18 * * 1-5');
  });

  it('computeScheduleInfo should handle disabled state', async () => {
    const { computeScheduleInfo } = await import('../lib/sftp-utils');
    const schedule = computeScheduleInfo(false);
    assert.equal(schedule.cronEnabled, false);
    assert.ok(schedule.description.includes('Desativado'));
  });
});

/* ─── 3. Hook Contract ───────────────────────────────── */

describe('useSftpIntegration Hook Contract', () => {
  it('should export the hook function', async () => {
    const mod = await import('../hooks/useSftpIntegration');
    assert.equal(typeof mod.useSftpIntegration, 'function');
  });
});

/* ─── 4. Component Exports ───────────────────────────── */

describe('SFTP Components', () => {
  it('KpiCards should be exported', async () => {
    const mod = await import('../app/sftp-integracao/components/KpiCards');
    assert.equal(typeof mod.KpiCards, 'function');
  });

  it('ExecutionTable should be exported', async () => {
    const mod = await import('../app/sftp-integracao/components/ExecutionTable');
    assert.equal(typeof mod.ExecutionTable, 'function');
  });

  it('ReportsTable should be exported', async () => {
    const mod = await import('../app/sftp-integracao/components/ReportsTable');
    assert.equal(typeof mod.ReportsTable, 'function');
  });

  it('ScheduleInfo should be exported', async () => {
    const mod = await import('../app/sftp-integracao/components/ScheduleInfo');
    assert.equal(typeof mod.ScheduleInfo, 'function');
  });

  it('ActionButtons should be exported', async () => {
    const mod = await import('../app/sftp-integracao/components/ActionButtons');
    assert.equal(typeof mod.ActionButtons, 'function');
  });
});

/* ─── 5. API Route Contract ──────────────────────────── */

describe('SFTP API Route', () => {
  it('api route should export GET handler', async () => {
    const mod = await import('../app/sftp-integracao/api/route');
    assert.equal(typeof mod.GET, 'function');
  });

  it('api route should export POST handler', async () => {
    const mod = await import('../app/sftp-integracao/api/route');
    assert.equal(typeof mod.POST, 'function');
  });
});

/* ─── 6. Page Export ─────────────────────────────────── */

describe('SFTP Page', () => {
  it('page should have default export', async () => {
    const mod = await import('../app/sftp-integracao/page');
    assert.ok(mod.default, 'page.tsx should have a default export');
  });
});