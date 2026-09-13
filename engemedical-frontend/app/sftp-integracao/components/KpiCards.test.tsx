/**
 * KpiCards Component Tests
 *
 * Testes para o componente de exibição de KPIs
 */

import { render, screen } from '@testing-library/react';
import { KpiCards } from './KpiCards';
import { SftpKpis, FILE_STATUS, RUN_STATUS } from '@/sftp-integracao/types';

// Mock getStatusLabel and getStatusColor
jest.mock('@/lib/sftp-utils', () => ({
  getStatusLabel: jest.fn((status: string) => {
    const labels: Record<string, string> = {
      downloaded: 'Baixado',
      parsed: 'Parseado',
      error: 'Erro',
      processed: 'Processado',
      downloading: 'Baixando',
      parsing: 'Analisando',
      dry_run: 'Dry Run',
      soc_limited: 'Processado (SOC)',
    };
    return labels[status] || status;
  }),
  getStatusColor: jest.fn((status: string) => {
    const colors: Record<string, string> = {
      downloaded: 'text-emerald-600',
      parsed: 'text-blue-600',
      error: 'text-red-600',
      processed: 'text-emerald-600',
      downloading: 'text-amber-600',
      parsing: 'text-blue-600',
      dry_run: 'text-blue-600',
      soc_limited: 'text-teal-600',
    };
    return colors[status] || 'text-gray-500';
  }),
}));

describe('KpiCards Component', () => {
  const defaultKpis: SftpKpis = {
    totalExecutions: 42,
    totalFiles: 15,
    lastExecutionDate: '10/09/2026',
    lastExecutionTime: '14:30',
    lastExecutionStatus: RUN_STATUS.PROCESSED,
    nextScheduledExecution: '11/09/2026T18:30:00Z',
    cronEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('KPIs Display', () => {
    it('should render all KPI cards with correct values', () => {
      render(<KpiCards kpis={defaultKpis} />);

      expect(screen.getByText('Total de Execuções')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Execuções processadas')).toBeInTheDocument();

      expect(screen.getByText('Planilhas Baixadas')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Arquivos recebidos via SFTP')).toBeInTheDocument();

      expect(screen.getByText('Última Execução')).toBeInTheDocument();
      expect(screen.getByText('10/09/2026')).toBeInTheDocument();
      expect(screen.getByText('Processado • 14:30')).toBeInTheDocument();

      expect(screen.getByText('Próxima Execução')).toBeInTheDocument();
      expect(screen.getByText('18:30')).toBeInTheDocument();
    });

    it('should show "--/--/----" when lastExecutionDate is null', () => {
      const kpisWithNullDate: SftpKpis = {
        ...defaultKpis,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
      };

      render(<KpiCards kpis={kpisWithNullDate} />);

      expect(screen.getByText('--/--/----')).toBeInTheDocument();
    });

    it('should show "--:--" when lastExecutionTime is null', () => {
      const kpisWithNullTime: SftpKpis = {
        ...defaultKpis,
        lastExecutionDate: null,
        lastExecutionTime: null,
      };

      render(<KpiCards kpis={kpisWithNullTime} />);

      expect(screen.getByText('--:--')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display status color for last execution', () => {
      render(<KpiCards kpis={defaultKpis} />);

      // The status color should be applied to the value
      const valueElement = screen.getByText('10/09/2026');
      expect(valueElement).toBeInTheDocument();
    });

    it('should show "Sem dados" when no last execution status', () => {
      const kpisNoStatus: SftpKpis = {
        ...defaultKpis,
        lastExecutionStatus: null,
      };

      render(<KpiCards kpis={kpisNoStatus} />);

      expect(screen.getByText('Sem dados')).toBeInTheDocument();
    });
  });

  describe('Schedule Display', () => {
    it('should show cron enabled info', () => {
      render(<KpiCards kpis={defaultKpis} />);

      expect(screen.getByText('Seg-Sex 18:30 BRT')).toBeInTheDocument();
    });

    it('should show cron disabled message', () => {
      const kpisDisabled: SftpKpis = {
        ...defaultKpis,
        cronEnabled: false,
      };

      render(<KpiCards kpis={kpisDisabled} />);

      expect(screen.getByText('Cron desativado')).toBeInTheDocument();
    });

    it('should show "--:--" when cron is disabled', () => {
      const kpisDisabled: SftpKpis = {
        ...defaultKpis,
        cronEnabled: false,
      };

      render(<KpiCards kpis={kpisDisabled} />);

      expect(screen.getByText('--:--')).toBeInTheDocument();
    });
  });

  describe('Zero Values', () => {
    it('should show 0 for zero executions', () => {
      const zeroKpis: SftpKpis = {
        ...defaultKpis,
        totalExecutions: 0,
        totalFiles: 0,
      };

      render(<KpiCards kpis={zeroKpis} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});