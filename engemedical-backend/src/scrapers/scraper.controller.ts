import { Controller, Get, Post, Query } from '@nestjs/common';
import { ScraperMetricsService } from './scraper-metrics.service';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly scraperMetricsService: ScraperMetricsService,
    private readonly scraperService: ScraperService,
  ) {}

  @Get('status')
  getScraperStatus() {
    return this.scraperMetricsService.getMetrics();
  }

  @Post('run-now')
  async runNow(@Query('provider') provider?: string) {
    this.scraperService.runManual();
    return { message: `Scraper triggered${provider ? ` for ${provider}` : ''}` };
  }
}
