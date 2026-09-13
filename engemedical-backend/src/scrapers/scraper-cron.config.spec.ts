import { isScraperCronEnabled } from './scraper-cron.config';

describe('scraper cron configuration', () => {
  it('keeps the automatic scraper disabled unless explicitly enabled', () => {
    expect(isScraperCronEnabled(undefined)).toBe(false);
    expect(isScraperCronEnabled('false')).toBe(false);
    expect(isScraperCronEnabled('true')).toBe(true);
  });
});
