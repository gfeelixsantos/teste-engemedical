import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ExamMatcherService } from './exam-matcher.service';
import { MongoModule } from '../mongo/mongo.module';
import { AzureModule } from '../azure/azure.module';
import { ScraperMetricsService } from './scraper-metrics.service';
import { ScraperController } from './scraper.controller';
import { WebsocketConnectionModule } from '../websocket/websocket-connection.module';
import { NodemailerModule } from '../nodemailer/nodemailer.module';

@Module({
  imports: [
    MongoModule,
    AzureModule,
    WebsocketConnectionModule,
    NodemailerModule,
  ],
  controllers: [ScraperController],
  providers: [ScraperService, ExamMatcherService, ScraperMetricsService],
  exports: [ScraperService, ScraperMetricsService],
})
export class ScrapersModule {}
