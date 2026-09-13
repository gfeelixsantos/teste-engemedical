/** @jest-environment node */

/**
 * SFTP API Route Tests
 *
 * Testes para os handlers da API de integração SFTP
 */

import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Supabase client
const mockSupabaseStorage = {
  from: jest.fn().mockReturnThis(),
  upload: jest.fn(),
  getPublicUrl: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: mockSupabaseStorage,
  })),
}));

describe('SFTP API Route', () => {
  const mockEnv = {
    NEXT_PUBLIC_BACKEND_URL: 'http://localhost:3001',
    INTERNAL_WORKER_TOKEN: 'test-token',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        horarios: [{
          clientKey: 'grupo-tora',
          cronEnabled: true,
          cronExpression: '30 18 * * 1-5',
          timezone: 'America/Sao_Paulo',
          lastExecution: null,
          nextExecution: null,
          description: 'Agendamento configurado',
        }],
      }),
    });
    // Set mock environment variables
    process.env.NEXT_PUBLIC_BACKEND_URL = mockEnv.NEXT_PUBLIC_BACKEND_URL;
    process.env.INTERNAL_WORKER_TOKEN = mockEnv.INTERNAL_WORKER_TOKEN;
    process.env.NEXT_PUBLIC_SUPABASE_URL = mockEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe('GET Handler', () => {
    it('should use backend totals and the real schedule instead of hardcoded values', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ runs: [{ id: 'r1', status: 'dry_run', createdAt: '2026-09-10T18:30:00Z' }], total: 42 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [{ id: 'f1', remoteName: 'test.xlsx' }], total: 99 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ runs: [{ id: 'r1', status: 'dry_run', createdAt: '2026-09-10T18:30:00Z' }], total: 42 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ horarios: [{ clientKey: 'grupo-tora', cronEnabled: false, cronExpression: '0 2 * * *', timezone: 'America/Sao_Paulo', lastExecution: null, nextExecution: null }] }) });

      const response = await GET(new NextRequest('http://localhost/api/sftp-integracao?limit=10'));
      const data = await response.json();

      expect(data.kpis.totalExecutions).toBe(42);
      expect(data.kpis.totalFiles).toBe(99);
      expect(data.schedule).toMatchObject({ cronEnabled: false, cronExpression: '0 2 * * *' });
      expect(data.kpis.cronEnabled).toBe(false);
    });

    it('should expose a backend HTTP failure instead of returning a false empty dashboard', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'unauthorized' }) });

      const response = await GET(new NextRequest('http://localhost/api/sftp-integracao'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Falha ao buscar dados SFTP');
    });

    it('should fetch KPIs from backend', async () => {
      const mockKpisRuns = { runs: [{ id: 'r1', status: 'processed', createdAt: '2026-09-10T18:30:00Z' }] };
      const mockFilesData = { files: [{ id: 'f1', remoteName: 'test.xlsx' }], total: 1 };
      const mockRunsData = { runs: mockKpisRuns.runs, total: 1 };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockKpisRuns })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFilesData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRunsData });

      const request = new NextRequest('http://localhost/api/sftp-integracao?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.kpis.totalExecutions).toBe(1);
      expect(data.files).toHaveLength(1);
      expect(data.runs).toHaveLength(1);
      expect(data.schedule).toMatchObject({
        cronEnabled: true,
        cronExpression: '30 18 * * 1-5',
        timezone: 'America/Sao_Paulo',
      });
    });

    it('should use custom limit parameter', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ runs: [], files: [] }) });

      const request = new NextRequest('http://localhost/api/sftp-integracao?limit=50');
      await GET(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-internal-token': 'test-token',
          }),
        })
      );
    });

    it('should handle backend errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Backend error'));

      const request = new NextRequest('http://localhost/api/sftp-integracao');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Falha ao buscar dados SFTP');
    });

    it('should use default limit when not specified', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ runs: [], files: [] }) });

      const request = new NextRequest('http://localhost/api/sftp-integracao');
      await GET(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });
  });

  describe('POST Handler', () => {
    describe('Pull Action', () => {
      it('should trigger pull from backend', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

        const request = new NextRequest('http://localhost/api/sftp-integracao', {
          method: 'POST',
          body: JSON.stringify({ action: 'pull' }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should forward x-internal-token header', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

        const request = new NextRequest('http://localhost/api/sftp-integracao', {
          method: 'POST',
          body: JSON.stringify({ action: 'pull' }),
          headers: { 'Content-Type': 'application/json' },
        });

        await POST(request);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-internal-token': expect.any(String),
            }),
          })
        );
      });
    });

    describe('list-files Action', () => {
      it('should fetch files list from backend', async () => {
        const mockFiles = { files: [{ id: 'f1', remoteName: 'test.xlsx' }], total: 1 };
        mockFetch.mockResolvedValue({ ok: true, json: async () => mockFiles });

        const request = new NextRequest('http://localhost/api/sftp-integracao', {
          method: 'POST',
          body: JSON.stringify({ action: 'list-files' }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.files).toHaveLength(1);
      });
    });

    describe('download-file Action', () => {
      it('should download file and upload to Supabase R2', async () => {
        const mockBlob = new Blob(['test content'], { type: 'application/octet-stream' });
        const mockArrayBuffer = await mockBlob.arrayBuffer();

        mockFetch.mockResolvedValue({
          ok: true,
          blob: async () => mockBlob,
        });

        mockSupabaseStorage.upload.mockResolvedValue({ data: { path: 'uploaded-file.xlsx' }, error: null });
        mockSupabaseStorage.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/file.xlsx' } });

        const request = new NextRequest('http://localhost/api/sftp-integracao', {
          method: 'POST',
          body: JSON.stringify({ action: 'download-file', fileId: 'file-123' }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.url).toBe('https://example.com/file.xlsx');
      });

      it('should return error when download fails', async () => {
        mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Not found' }) });

        const request = new NextRequest('http://localhost/api/sftp-integracao', {
          method: 'POST',
          body: JSON.stringify({ action: 'download-file', fileId: 'invalid-id' }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain('Falha ao baixar arquivo');
      });

      it('should return error when Supabase upload fails', async () => {
        const mockBlob = new Blob(['test content'], { type: 'application/octet-stream' });

        mockFetch.mockResolvedValue({
          ok: true,
          blob: async () => mockBlob,
        });

        mockSupabaseStorage.upload.mockResolvedValue({ 
          data: null, 
          error: { message: 'Upload failed' } 
        });

        const request = new NextRequest('http://localhost/api/sftp-integracao', {
          method: 'POST',
          body: JSON.stringify({ action: 'download-file', fileId: 'file-123' }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain('Falha ao salvar no R2');
      });
    });

    describe('Unknown Action', () => {
      it('should return 400 for unknown action', async () => {
        const request = new NextRequest('http://localhost/api/sftp-integracao', {
          method: 'POST',
          body: JSON.stringify({ action: 'unknown-action' }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Ação não implementada');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const request = new NextRequest('http://localhost/api/sftp-integracao');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Falha ao buscar dados SFTP');
    });

    it('should return 500 on POST error', async () => {
      mockFetch.mockRejectedValue(new Error('Backend down'));

      const request = new NextRequest('http://localhost/api/sftp-integracao', {
        method: 'POST',
        body: JSON.stringify({ action: 'pull' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Falha na operação SFTP');
    });
  });
});
