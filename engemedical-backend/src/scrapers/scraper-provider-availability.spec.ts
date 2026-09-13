import { ScraperMetricsService } from './scraper-metrics.service';

jest.mock('../websocket/websocket-connection', () => ({
  WebsocketGateway: class WebsocketGateway {},
}));

describe('ScraperMetricsService providers', () => {
  it('exposes only the providers currently active for result collection', () => {
    const service = new ScraperMetricsService({ server: undefined } as any);

    expect(service.getMetrics().map((metric) => metric.provider)).toEqual([
      'Worklab',
      'Medical',
    ]);
  });
});
