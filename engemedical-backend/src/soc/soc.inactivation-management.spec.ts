import { SocController } from './soc.controller';

describe('SocController inactivation management', () => {
  it('lists the latest inactivation runs', async () => {
    const service = {
      listInactivationRuns: jest.fn().mockResolvedValue({ runs: [], total: 0 }),
    };
    const controller = new SocController(service as any, {} as any, { setContext: jest.fn() } as any);

    await (controller as any).getInactivationRuns('10', '0');

    expect(service.listInactivationRuns).toHaveBeenCalledWith({ limit: 10, skip: 0 });
  });

  it('returns an inactivation report download', async () => {
    const service = {
      getInactivationReportForDownload: jest.fn().mockResolvedValue({
        buffer: Buffer.from('xlsx'),
        fileName: 'relatorio.xlsx',
      }),
    };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new SocController(service as any, {} as any, { setContext: jest.fn() } as any);

    await (controller as any).downloadInactivationReport('run-1', response);

    expect(service.getInactivationReportForDownload).toHaveBeenCalledWith('run-1');
    expect(response.send).toHaveBeenCalledWith(Buffer.from('xlsx'));
  });

  it('starts a scoped manual dry-run with selected companies', async () => {
    const service = { inactivateEmployeesFlow: jest.fn().mockResolvedValue({ success: true }) };
    const controller = new SocController(service as any, {} as any, { setContext: jest.fn() } as any);

    await (controller as any).manualInactivation({ companyCodes: ['101', '202'], dryRun: true }, { headers: { 'x-auth-user': JSON.stringify({ nome: 'ABC', email: 'abc@example.com' }) } });

    expect(service.inactivateEmployeesFlow).toHaveBeenCalledWith({
      companyCodes: ['101', '202'],
      dryRun: true,
      trigger: 'manual',
      executionId: expect.any(String),
      reportRecipients: ['abc@example.com'],
      initiatedBy: 'ABC',
    });
  });
});
