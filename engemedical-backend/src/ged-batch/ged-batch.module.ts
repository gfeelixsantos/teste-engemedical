import { Module } from '@nestjs/common';
import { MongoModule } from 'src/mongo/mongo.module';
import { AzureModule } from 'src/azure/azure.module';
import { PushModule } from 'src/push/push.module';
import { WebsocketConnectionModule } from 'src/websocket/websocket-connection.module';
import { GedBatchController } from './ged-batch.controller';
import { GedBatchService } from './ged-batch.service';

@Module({
  imports: [MongoModule, AzureModule, PushModule, WebsocketConnectionModule],
  controllers: [GedBatchController],
  providers: [GedBatchService],
  exports: [GedBatchService],
})
export class GedBatchModule {}
