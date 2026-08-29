import axios from 'axios';
import { CedillScraper } from './cedill.scraper';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CedillScraper', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('logs structured search diagnostics with parsed result count', async () => {
    const scraper = new CedillScraper();
    (scraper as any).sessionId = 'session-123';
    (scraper as any).useBrowser = false; // Disable browser mode for tests

    const logger = (scraper as any).logger;
    const logSpy = jest
      .spyOn(logger, 'log')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(logger, 'warn')
      .mockImplementation(() => undefined);

    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: "aciona_evento(event,'123','456','01/04/2026','CMSO','789',",
    } as any);

    await expect(
      scraper.searchPatient('Joao da Silva', 'LABORATORIO'),
    ).resolves.toEqual([]);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Cedill][SEARCH][START]'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Cedill][SEARCH][RESULT]'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Cedill][SEARCH][NO_RESULT]'),
    );
  });

  it('logs download start diagnostics', async () => {
    const scraper = new CedillScraper();
    (scraper as any).sessionId = 'session-123';
    (scraper as any).useBrowser = false; // Disable browser mode for tests

    const logger = (scraper as any).logger;
    const logSpy = jest
      .spyOn(logger, 'log')
      .mockImplementation(() => undefined);

    // Mock axios POST for download
    mockedAxios.post.mockResolvedValue({
      data: Buffer.from('%PDF-1.4 test'),
    } as any);

    await scraper.downloadReport({
      nic: '123',
      visita: '456',
      date: '01/04/2026',
      posto: 'CMSO',
      crm: '789',
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Cedill][DOWNLOAD][START]'),
    );
  });
});
