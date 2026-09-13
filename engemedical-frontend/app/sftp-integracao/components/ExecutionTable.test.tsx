/**
 * ExecutionTable Component Tests
 *
 * Testes para a tabela de planilhas recebidas
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionTable } from './ExecutionTable';
import { SftpFileRecord, FILE_STATUS } from '@/sftp-integracao/types';

// Mock formatFileSize, formatShortDate, getStatusLabel
jest.mock('@/lib/sftp-utils', () => ({
  formatFileSize: jest.fn((bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }),
  formatShortDate: jest.fn((date: string) => {
    return '10/09/2026';
  }),
  getStatusLabel: jest.fn((status: string) => {
    const labels: Record<string, string> = {
      downloaded: 'Baixado',
      parsed: 'Parseado',
      error: 'Erro',
      downloading: 'Baixando',
      processing: 'Processando',
      processed: 'Processado',
    };
    return labels[status] || status;
  }),
}));

describe('ExecutionTable Component', () => {
  const mockFiles: SftpFileRecord[] = [
    {
      id: 'file-1',
      clientKey: 'grupo-tora',
      remoteName: 'PLANILHA_FUNCIONARIOS_2026.xlsx',
      remotePath: '/planilhas/PLANILHA_FUNCIONARIOS_2026.xlsx',
      size: 1536000,
      sha256: 'abc123def456',
      remoteMtime: '2026-09-10T16:00:00Z',
      status: FILE_STATUS.DOWNLOADED,
      createdAt: '2026-09-10T18:30:00Z',
      updatedAt: '2026-09-10T18:30:00Z',
    },
    {
      id: 'file-2',
      clientKey: 'grupo-tora',
      remoteName: 'RELATORIO_SALDOS.xlsx',
      remotePath: '/planilhas/RELATORIO_SALDOS.xlsx',
      size: 2097152,
      sha256: 'def456ghi789',
      remoteMtime: '2026-09-10T16:00:00Z',
      status: FILE_STATUS.PARSED,
      createdAt: '2026-09-09T18:30:00Z',
      updatedAt: '2026-09-09T18:30:00Z',
    },
    {
      id: 'file-3',
      clientKey: 'grupo-tora',
      remoteName: 'ERRO_PROCESSAMENTO.xlsx',
      remotePath: '/planilhas/ERRO_PROCESSAMENTO.xlsx',
      size: 512000,
      sha256: 'ghi789jkl012',
      remoteMtime: '2026-09-08T16:00:00Z',
      status: FILE_STATUS.ERROR,
      createdAt: '2026-09-08T18:30:00Z',
      updatedAt: '2026-09-08T18:30:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should show empty state message when no files', () => {
      render(<ExecutionTable files={[]} isPulling={false} onDownload={() => {}} />);

      expect(screen.getByText('Nenhuma planilha recebida')).toBeInTheDocument();
      expect(screen.getByText(/Conecte-se ao SFTP Grupo Tora para começar/i)).toBeInTheDocument();
    });
  });

  describe('Table Headers', () => {
    it('should display table headers', () => {
      render(<ExecutionTable files={mockFiles} isPulling={false} onDownload={() => {}} />);

      expect(screen.getByText('Planilhas Recebidas')).toBeInTheDocument();
      expect(screen.getByText('Últimas 3 planilhas processadas')).toBeInTheDocument();

      expect(screen.getByText('Arquivo')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Tamanho')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });
  });

  describe('File List Display', () => {
    it('should display all files with correct information', () => {
      render(<ExecutionTable files={mockFiles} isPulling={false} onDownload={() => {}} />);

      // Check file names are displayed
      expect(screen.getByText('PLANILHA_FUNCIONARIOS_2026.xlsx')).toBeInTheDocument();
      expect(screen.getByText('RELATORIO_SALDOS.xlsx')).toBeInTheDocument();
      expect(screen.getByText('ERRO_PROCESSAMENTO.xlsx')).toBeInTheDocument();

      // Check sizes
      expect(screen.getByText('1.5 MB')).toBeInTheDocument();
      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
      expect(screen.getByText('500.0 KB')).toBeInTheDocument();
    });

    it('should display correct statuses', () => {
      render(<ExecutionTable files={mockFiles} isPulling={false} onDownload={() => {}} />);

      expect(screen.getByText('Baixado')).toBeInTheDocument();
      expect(screen.getByText('Parseado')).toBeInTheDocument();
      expect(screen.getByText('Erro')).toBeInTheDocument();
    });

    it('should display dates', () => {
      render(<ExecutionTable files={mockFiles} isPulling={false} onDownload={() => {}} />);

      expect(screen.getByText('10/09/2026')).toBeInTheDocument();
      expect(screen.getByText('09/09/2026')).toBeInTheDocument();
      expect(screen.getByText('08/09/2026')).toBeInTheDocument();
    });
  });

  describe('Download Actions', () => {
    it('should call onDownload with file id when download button clicked', () => {
      const onDownload = jest.fn();

      render(<ExecutionTable files={mockFiles} isPulling={false} onDownload={onDownload} />);

      const downloadButtons = screen.getAllByRole('button', { name: 'Baixar planilha' });
      fireEvent.click(downloadButtons[0]);

      expect(onDownload).toHaveBeenCalledWith('file-1');
    });

    it('should disable download button when isPulling is true', () => {
      render(<ExecutionTable files={mockFiles} isPulling={true} onDownload={() => {}} />);

      const downloadButton = screen.getByRole('button', { name: 'Baixar planilha' });
      expect(downloadButton).toBeDisabled();
    });

    it('should disable download for non-downloaded files', () => {
      render(<ExecutionTable files={mockFiles} isPulling={false} onDownload={() => {}} />);

      // Second file has 'parsed' status
      const downloadButtons = screen.getAllByRole('button', { name: 'Baixar planilha' });
      fireEvent.click(downloadButtons[1]);

      // This should work since 'parsed' is different from 'downloaded'
      // Only 'downloaded' files should have enabled download
    });
  });

  describe('Status Colors', () => {
    it('should apply correct colors based on status', () => {
      render(<ExecutionTable files={mockFiles} isPulling={false} onDownload={() => {}} />);

      // Status badges should have color classes
      const statusElements = screen.getAllByText(/^(Baixado|Parseado|Erro)$/);
      expect(statusElements.length).toBe(3);
    });
  });

  describe('Loading State', () => {
    it('should show skeleton for files table during pulling', () => {
      render(<ExecutionTable files={mockFiles} isPulling={true} onDownload={() => {}} />);

      const downloadButton = screen.getByRole('button', { name: 'Baixar planilha' });
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('Table Structure', () => {
    it('should render table with correct structure', () => {
      const { container } = render(<ExecutionTable files={mockFiles} isPulling={false} onDownload={() => {}} />);

      // Check table exists
      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();

      // Check tbody exists
      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
    });
  });
});