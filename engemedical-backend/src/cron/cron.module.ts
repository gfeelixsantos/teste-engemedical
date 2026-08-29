import { Module } from '@nestjs/common';
import { GedBatchModule } from 'src/ged-batch/ged-batch.module';
import { MongoModule } from 'src/mongo/mongo.module';
import { ScrapersModule } from 'src/scrapers/scrapers.module';
import { SocModule } from 'src/soc/soc.module';
import { TicketModule } from 'src/ticket/ticket.module';
import { WebsocketConnectionModule } from 'src/websocket/websocket-connection.module';
import { CronJobs } from './cron';

@Module({
  imports: [
    TicketModule,
    MongoModule,
    SocModule,
    WebsocketConnectionModule,
    ScrapersModule,
    GedBatchModule,
  ],
  providers: [CronJobs],
})
export class CronModule {}
