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
});
