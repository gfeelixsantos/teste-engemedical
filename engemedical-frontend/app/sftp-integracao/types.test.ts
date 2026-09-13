/**
 * SFTP Types Tests
 *
 * Testes para validação de tipos e constantes SFTP
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SFTP_CLIENT_KEY,
  FILE_STATUS,
  RUN_STATUS,
} from '../types';
import {
  formatFileSize,
  formatFileDate,
  getStatusColor,
  getStatusLabel,
  computeKpis,
  computeScheduleInfo,
} from '../../lib/sftp-utils';

describe('SFTP Types', () => {
  it('SFTP_CLIENT_KEY should be "grupo-tora"', () => {
    assert.equal(SFTP_CLIENT_KEY, 'grupo-tora');
  });

  it('FILE_STATUS should have all required states', () => {
    assert.equal(FILE_STATUS.DOWNLOADING, 'downloading');
    assert.equal(FILE_STATUS.DOWNLOADED, 'downloaded');
    assert.equal(FILE_STATUS.PARSING, 'parsing');
    assert.equal(FILE_STATUS.PARSED, 'parsed');
    assert.equal(FILE_STATUS.PROCESSING, 'processing');
    assert.equal(FILE_STATUS.PROCESSED, 'processed');
    assert.equal(FILE_STATUS.ERROR, 'error');
  });

  it('RUN_STATUS should have all required states', () => {
    assert.equal(RUN_STATUS.DRY_RUN, 'dry_run');
    assert.equal(RUN_STATUS.PARSED, 'parsed');
    assert.equal(RUN_STATUS.SOC_LIMITED, 'soc_limited');
    assert.equal(RUN_STATUS.ERROR, 'error');
  });
});

describe('SFTP Utilities', () => {
  describe('formatFileSize', () => {
    it('should return "0 B" for zero bytes', () => {
      assert.equal(formatFileSize(0), '0 B');
    });

    it('should format bytes as KB', () => {
      assert.equal(formatFileSize(1024), '1 KB');
      assert.equal(formatFileSize(512345), '500.3 KB');
    });

    it('should format bytes as MB', () => {
      assert.equal(formatFileSize(1048576), '1 MB');
    });

    it('should format bytes as GB', () => {
      assert.equal(formatFileSize(1073741824), '1 GB');
    });
  });

  describe('formatFileDate', () => {
    it('should format date to pt-BR', () => {
      const result = formatFileDate('2026-09-10T18:30:00.000Z');
      assert.ok(result.includes('10') || result.includes('09'));
      assert.ok(result.includes('2026'));
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for FileStatus', () => {
      assert.equal(getStatusColor('downloaded'), 'text-emerald-600');
      assert.equal(getStatusColor('error'), 'text-red-600');
      assert.equal(getStatusColor('downloading'), 'text-amber-600');
    });

    it('should return correct colors for RunStatus', () => {
      assert.equal(getStatusColor('dry_run'), 'text-blue-600');
      assert.equal(getStatusColor('soc_limited'), 'text-teal-600');
    });
  });

  describe('getStatusLabel', () => {
    it('should return pt-BR labels', () => {
      assert.equal(getStatusLabel('downloaded'), 'Baixado');
      assert.equal(getStatusLabel('error'), 'Erro');
      assert.equal(getStatusLabel('soc_limited'), 'Processado (SOC)');
    });
  });

  describe('computeKpis', () => {
    it('should compute KPIs from files and runs', () => {
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
    });
  });

  describe('computeScheduleInfo', () => {
    it('should return enabled schedule info', () => {
      const schedule = computeScheduleInfo(true);
      assert.equal(schedule.cronEnabled, true);
      assert.equal(schedule.timezone, 'America/Sao_Paulo');
      assert.ok(schedule.description.includes('18:30'));
      assert.equal(schedule.cronExpression, '30 18 * * 1-5');
    });

    it('should return disabled schedule info', () => {
      const schedule = computeScheduleInfo(false);
      assert.equal(schedule.cronEnabled, false);
      assert.ok(schedule.description.includes('Desativado'));
    });
  });
});