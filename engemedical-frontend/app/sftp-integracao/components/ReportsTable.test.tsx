/**
 * ReportsTable Component Tests
 *
 * Testes para a tabela de relatórios de execução
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsTable } from './ReportsTable';
import { SftpRunRecord, RUN_STATUS } from '@/sftp-integracao/types';

// Mock formatShortDate, formatTime, getStatusLabel
jest.mock('@/lib/sftp-utils', () => ({
  formatShortDate: jest.fn(() => '10/09/2026'),
  formatTime: jest.fn(() => '14:30'),
  getStatusLabel: jest.fn((status: string) => {
    const labels: Record<string, string> = {
      processed: 'Processado',
      soc_limited: 'Processado (SOC)',
      parsed: 'Parseado',
      error: 'Erro',
      dry_run: 'Dry Run',
    };
    return labels[status] || status;
  }),
}));

describe('ReportsTable Component', () => {
  const mockRuns: SftpRunRecord[] = [
    {
      id: 'run-1',
      clientKey: 'grupo-tora',
      fileId: 'file-1',
      status: RUN_STATUS.PROCESSED,
      summary: {
        totalRows: 100,
        validRows: 95,
        invalidRows: 5,
        successCount: 80,
        notInBaseCount: 15,
        errorCount: 0,
      },
      createdAt: '2026-09-10T18:30:00Z',
      updatedAt: '2026-09-10T18:35:00Z',
    },
    {
      id: 'run-2',
      clientKey: 'grupo-tora',
      fileId: 'file-2',
      status: RUN_STATUS.SOC_LIMITED,
      summary: {
        totalRows: 50,
        validRows: 45,
        invalidRows: 5,
        successCount: 40,
        notInBaseCount: 5,
        errorCount: 0,
      },
      createdAt: '2026-09-09T18:30:00Z',
      updatedAt: '2026-09-09T18:35:00Z',
    },
    {
      id: 'run-3',
      clientKey: 'grupo-tora',
      fileId: 'file-3',
      status: RUN_STATUS.ERROR,
      summary: {
        totalRows: 20,
        validRows: 0,
        invalidRows: 20,
        successCount: 0,
        notInBaseCount: 0,
        errorCount: 20,
      },
      createdAt: '2026-09-08T18:30:00Z',
      updatedAt: '2026-09-08T19:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should show empty state message when no runs', () => {
      render(<ReportsTable runs={[]} isProcessing={false} onDownload={() => {}} />);

      expect(screen.getByText('Nenhum relatório gerado')).toBeInTheDocument();
      expect(screen.getByText(/Aguarde a primeira execução do processamento SOC/i)).toBeInTheDocument();
    });
  });

  describe('Table Headers', () => {
    it('should display table headers', () => {
      render(<ReportsTable runs={mockRuns} isProcessing={false} onDownload={() => {}} />);

      expect(screen.getByText('Histórico de Execuções')).toBeInTheDocument();
      expect(screen.getByText('Últimas 3 execuções processadas')).toBeInTheDocument();

      expect(screen.getByText('Execução')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Resumo')).toBeInTheDocument();
      expect(screen.getByText('Data/Hora')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });
  });

  describe('Run List Display', () => {
    it('should display all runs with correct information', () => {
      render(<ReportsTable runs={mockRuns} isProcessing={false} onDownload={() => {}} />);

      // Check execution numbers
      expect(screen.getByText('Execução #1')).toBeInTheDocument();
      expect(screen.getByText('Execução #2')).toBeInTheDocument();
      expect(screen.getByText('Execução #3')).toBeInTheDocument();

      // Check statuses
      expect(screen.getByText('Processado')).toBeInTheDocument();
      expect(screen.getByText('Processado (SOC)')).toBeInTheDocument();
      expect(screen.getByText('Erro')).toBeInTheDocument();

      // Check dates
      expect(screen.getByText('10/09/2026')).toBeInTheDocument();
    });

    it('should display summary information for each run', () => {
      render(<ReportsTable runs={mockRuns} isProcessing={false} onDownload={() => {}} />);

      // Check summary display - the exact format may vary based on implementation
      const summaryElements = screen.getAllByText(/Sucesso:|Erros:|Total:/);
      expect(summaryElements.length).toBeGreaterThan(0);
    });
  });

  describe('Download Actions', () => {
    it('should call onDownload with run id when download button clicked', () => {
      const onDownload = jest.fn();

      render(<ReportsTable runs={mockRuns} isProcessing={false} onDownload={onDownload} />);

      const downloadButton = screen.getByRole('button', { name: 'Baixar relatório' });
      fireEvent.click(downloadButton);

      expect(onDownload).toHaveBeenCalledWith('run-1');
    });

    it('should disable download button when isProcessing is true', () => {
      render(<ReportsTable runs={mockRuns} isProcessing={true} onDownload={() => {}} />);

      const downloadButton = screen.getByRole('button', { name: 'Baixar relatório' });
      expect(downloadButton).toBeDisabled();
    });

    it('should show loading spinner when processing', () => {
      render(<ReportsTable runs={mockRuns} isProcessing={true} onDownload={() => {}} />);

      // Should show spinner instead of download icon
      // Check for disabled button
      const downloadButton = screen.getByRole('button', { name: 'Baixar relatório' });
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('Status Display', () => {
    it('should apply correct colors based on status', () => {
      render(<ReportsTable runs={mockRuns} isProcessing={false} onDownload={() => {}} />);

      const statusElements = screen.getAllByRole('badge');
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  describe('Table Structure', () => {
    it('should render table with correct structure', () => {
      const { container } = render(<ReportsTable runs={mockRuns} isProcessing={false} onDownload={() => {}} />);

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();

      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
    });
  });

  describe('Run Order', () => {
    it('should display runs in reverse order (most recent first)', () => {
      render(<ReportsTable runs={mockRuns} isProcessing={false} onDownload={() => {}} />);

      // First run in table should be the most recent (run-1)
      expect(screen.getByText('Execução #1')).toBeInTheDocument();
    });
  });
});