/**
 * SFTP Utilities Tests
 *
 * Testes para funções utilitárias de formatação e transformação de dados SFTP
 */

import {
  formatFileSize,
  formatFileDate,
  formatShortDate,
  formatTime,
  getStatusColor,
  getStatusLabel,
  getStatusBadgeProps,
  computeKpis,
  computeScheduleInfo,
  validateRunStatus,
  validateFileStatus,
} from '../lib/sftp-utils';
import { FILE_STATUS, RUN_STATUS } from '../types';

describe('SFTP Utilities', () => {
  describe('formatFileSize', () => {
    it('should return "0 B" for zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should format bytes as B when less than 1KB', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('should format bytes as KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(512345)).toBe('500.3 KB');
    });

    it('should format bytes as MB', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('should format bytes as GB', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should format bytes as TB', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
    });
  });

  describe('formatFileDate', () => {
    it('should format date in pt-BR format', () => {
      const result = formatFileDate('2026-09-10T18:30:00.000Z');
      expect(result).toContain('10');
      expect(result).toContain('09');
      expect(result).toContain('2026');
    });

    it('should include time in formatted output', () => {
      const result = formatFileDate('2026-09-10T18:30:00.000Z');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatShortDate', () => {
    it('should format date without time', () => {
      const result = formatShortDate('2026-09-10T18:30:00.000Z');
      expect(result).toContain('10');
      expect(result).toContain('09');
      expect(result).toContain('2026');
    });
  });

  describe('formatTime', () => {
    it('should format time in pt-BR format', () => {
      const result = formatTime('2026-09-10T18:30:00.000Z');
      expect(result).toContain('18:30');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for file status', () => {
      expect(getStatusColor(FILE_STATUS.DOWNLOADED)).toBe('text-emerald-600');
      expect(getStatusColor(FILE_STATUS.ERROR)).toBe('text-red-600');
      expect(getStatusColor(FILE_STATUS.DOWNLOADING)).toBe('text-amber-600');
    });

    it('should return correct colors for run status', () => {
      expect(getStatusColor(RUN_STATUS.DRY_RUN)).toBe('text-blue-600');
      expect(getStatusColor(RUN_STATUS.SOC_LIMITED)).toBe('text-teal-600');
    });

    it('should return gray for unknown status', () => {
      expect(getStatusColor('unknown' as any)).toBe('text-gray-600');
    });
  });

  describe('getStatusLabel', () => {
    it('should return pt-BR labels for file status', () => {
      expect(getStatusLabel(FILE_STATUS.DOWNLOADED)).toBe('Baixado');
      expect(getStatusLabel(FILE_STATUS.ERROR)).toBe('Erro');
      expect(getStatusLabel(FILE_STATUS.DOWNLOADING)).toBe('Baixando');
    });

    it('should return pt-BR labels for run status', () => {
      expect(getStatusLabel(RUN_STATUS.DRY_RUN)).toBe('Dry Run');
      expect(getStatusLabel(RUN_STATUS.SOC_LIMITED)).toBe('Processado (SOC)');
    });
  });

  describe('getStatusBadgeProps', () => {
    it('should return correct badge props for downloaded status', () => {
      const props = getStatusBadgeProps(FILE_STATUS.DOWNLOADED);
      expect(props.color).toBe('success');
      expect(props.icon).toBe('check');
    });

    it('should return correct badge props for error status', () => {
      const props = getStatusBadgeProps(FILE_STATUS.ERROR);
      expect(props.color).toBe('danger');
      expect(props.icon).toBe('alert-triangle');
    });

    it('should return default props for unknown status', () => {
      const props = getStatusBadgeProps('unknown' as any);
      expect(props.color).toBe('neutral');
      expect(props.icon).toBe('circle');
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

      expect(kpis.totalFiles).toBe(2);
      expect(kpis.totalExecutions).toBe(2);
      expect(kpis.lastExecutionStatus).toBe('soc_limited');
    });

    it('should handle empty arrays', () => {
      const kpis = computeKpis([], []);

      expect(kpis.totalFiles).toBe(0);
      expect(kpis.totalExecutions).toBe(0);
      expect(kpis.lastExecutionStatus).toBeNull();
    });

    it('should sort runs by date descending', () => {
      const runs = [
        { id: 'r1', status: 'parsed', createdAt: '2026-09-09T19:00:00Z' },
        { id: 'r2', status: 'soc_limited', createdAt: '2026-09-10T19:00:00Z' },
      ] as any[];

      const kpis = computeKpis([], runs);

      expect(kpis.lastExecutionStatus).toBe('soc_limited');
      expect(kpis.lastExecutionDate).toBe('10/09/2026');
    });
  });

  describe('computeScheduleInfo', () => {
    it('should return enabled schedule info', () => {
      const schedule = computeScheduleInfo(true);

      expect(schedule.cronEnabled).toBe(true);
      expect(schedule.timezone).toBe('America/Sao_Paulo');
      expect(schedule.cronExpression).toBe('30 18 * * 1-5');
      expect(schedule.description).toContain('18:30');
    });

    it('should return disabled schedule info', () => {
      const schedule = computeScheduleInfo(false);

      expect(schedule.cronEnabled).toBe(false);
      expect(schedule.description).toContain('Desativado');
      expect(schedule.nextExecution).toBeNull();
    });
  });

  describe('validateRunStatus', () => {
    it('should return true for valid run statuses', () => {
      expect(validateRunStatus(RUN_STATUS.DRY_RUN)).toBe(true);
      expect(validateRunStatus(RUN_STATUS.PARSED)).toBe(true);
      expect(validateRunStatus(RUN_STATUS.SOC_LIMITED)).toBe(true);
      expect(validateRunStatus(RUN_STATUS.ERROR)).toBe(true);
    });

    it('should return false for invalid run statuses', () => {
      expect(validateRunStatus('invalid')).toBe(false);
      expect(validateRunStatus('downloaded')).toBe(false);
    });
  });

  describe('validateFileStatus', () => {
    it('should return true for valid file statuses', () => {
      expect(validateFileStatus(FILE_STATUS.DOWNLOADING)).toBe(true);
      expect(validateFileStatus(FILE_STATUS.DOWNLOADED)).toBe(true);
      expect(validateFileStatus(FILE_STATUS.ERROR)).toBe(true);
    });

    it('should return false for invalid file statuses', () => {
      expect(validateFileStatus('invalid')).toBe(false);
      expect(validateFileStatus('soc_limited')).toBe(false);
    });
  });
});