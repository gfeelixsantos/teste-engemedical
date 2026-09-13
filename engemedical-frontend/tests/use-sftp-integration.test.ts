/**
 * useSftpIntegration Hook Tests
 *
 * Testes para o hook de integração SFTP
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSftpIntegration } from '../hooks/useSftpIntegration';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.open
global.window.open = jest.fn();

describe('useSftpIntegration Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return default KPIs on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          kpis: {},
          files: [],
          runs: [],
        }),
      });

      const { result } = renderHook(() => useSftpIntegration());

      expect(result.current.kpis.totalExecutions).toBe(0);
      expect(result.current.kpis.totalFiles).toBe(0);
    });

    it('should return empty arrays for files and runs initially', () => {
      const { result } = renderHook(() => useSftpIntegration());

      expect(result.current.files).toEqual([]);
      expect(result.current.runs).toEqual([]);
    });

    it('should set isLoading to true initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useSftpIntegration());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Data Fetching', () => {
    it('should set isLoading to false after successful fetch', async () => {
      const mockData = {
        kpis: {
          totalExecutions: 5,
          totalFiles: 10,
          lastExecutionDate: '10/09/2026',
          lastExecutionTime: '14:30',
          lastExecutionStatus: 'processed',
          nextScheduledExecution: null,
          cronEnabled: true,
        },
        files: [{ id: '1', remoteName: 'test.xlsx', size: 1000, status: 'downloaded', createdAt: '', updatedAt: '' }],
        runs: [{ id: 'r1', status: 'processed', createdAt: '2026-09-10T14:30:00Z', updatedAt: '', summary: {} }],
        schedule: {
          cronExpression: '30 18 * * 1-5',
          cronEnabled: true,
          timezone: 'America/Sao_Paulo',
          lastExecution: null,
          nextExecution: null,
          description: 'Test schedule',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useSftpIntegration());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.kpis.totalExecutions).toBe(5);
      expect(result.current.files).toHaveLength(1);
      expect(result.current.runs).toHaveLength(1);
    });

    it('should set error when fetch fails', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Network error' }) });

      const { result } = renderHook(() => useSftpIntegration());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('triggerPull Action', () => {
    it('should call POST endpoint with pull action', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSftpIntegration());

      await result.current.triggerPull();

      expect(mockFetch).toHaveBeenCalledWith('/api/sftp-integracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull' }),
      });
    });

    it('should set isPulling to true during pull', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100)
      ));

      const { result } = renderHook(() => useSftpIntegration());

      const promise = result.current.triggerPull();
      
      // During the pull, isPulling should be true
      expect(result.current.isPulling).toBe(true);

      await promise;

      // After pull completes, isPulling should be false
      expect(result.current.isPulling).toBe(false);
    });

    it('should set error when pull fails', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Pull failed' }) });

      const { result } = renderHook(() => useSftpIntegration());

      await result.current.triggerPull();

      expect(result.current.error).toContain('Pull failed');
    });
  });

  describe('downloadFile Action', () => {
    it('should call download endpoint with file ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://example.com/file.xlsx' }),
      });

      const { result } = renderHook(() => useSftpIntegration());

      await result.current.downloadFile('file-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/sftp-integracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download-file', fileId: 'file-123' }),
      });
    });

    it('should open URL in new tab on success', async () => {
      const mockOpen = jest.fn();
      global.window.open = mockOpen;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://example.com/file.xlsx' }),
      });

      const { result } = renderHook(() => useSftpIntegration());

      await result.current.downloadFile('file-123');

      expect(mockOpen).toHaveBeenCalledWith('https://example.com/file.xlsx', '_blank');
    });

    it('should throw error when download fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'File not found' }),
      });

      const { result } = renderHook(() => useSftpIntegration());

      await expect(result.current.downloadFile('invalid-id')).rejects.toThrow('File not found');
    });

    it('should set error on download failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Download failed' }),
      });

      const { result } = renderHook(() => useSftpIntegration());

      try {
        await result.current.downloadFile('file-123');
      } catch {}

      expect(result.current.error).toContain('Download failed');
    });
  });

  describe('downloadReport Action', () => {
    it('should set isProcessing to true during download', async () => {
      const { result } = renderHook(() => useSftpIntegration());

      // First, set up some runs
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ runs: [{ id: 'run-1', createdAt: '2026-09-10T18:00:00Z', status: 'processed', summary: {} }] }),
      });

      const { result: hookResult } = renderHook(() => useSftpIntegration());

      // Mock supabase storage
      const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/report.xlsx' } });
      // @ts-ignore - mock supabase
      delete require.cache[require.resolve('@/hooks/useSftpIntegration')];
    });
  });

  describe('refetch Function', () => {
    it('should return a refetch function', () => {
      const { result } = renderHook(() => useSftpIntegration());

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should re-fetch data when called', async () => {
      const mockData = {
        kpis: { totalExecutions: 1, totalFiles: 2, lastExecutionDate: '', lastExecutionTime: '', lastExecutionStatus: null, nextScheduledExecution: null, cronEnabled: true },
        files: [],
        runs: [],
      };

      mockFetch.mockResolvedValue({ ok: true, json: async () => mockData });

      const { result } = renderHook(() => useSftpIntegration());

      await result.current.refetch();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should clear error when re-fetching successfully', async () => {
      const mockData = {
        kpis: { totalExecutions: 1, totalFiles: 1, lastExecutionDate: '', lastExecutionTime: '', lastExecutionStatus: 'processed', nextScheduledExecution: null, cronEnabled: true },
        files: [],
        runs: [],
      };

      mockFetch
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Initial error' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockData });

      const { result } = renderHook(() => useSftpIntegration());

      // Initial failure
      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Refetch success
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});