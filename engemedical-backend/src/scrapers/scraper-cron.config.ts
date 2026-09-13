export const isScraperCronEnabled = (value = process.env.SCRAPER_CRON_ENABLED) =>
  String(value ?? 'false').toLowerCase() === 'true';
