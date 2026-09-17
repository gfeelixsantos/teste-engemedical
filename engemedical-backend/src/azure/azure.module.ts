import { forwardRef, Module } from '@nestjs/common';
import { AzureService } from './azure.service';
import { MongoModule } from 'src/mongo/mongo.module';
import { AzureQueueWorkerService } from './azure-queue-worker.service';
import { AzureQueueController } from './azure-queue.controller';
import { SocModule } from 'src/soc/soc.module';

@Module({
  imports: [
    forwardRef(() => MongoModule),
    forwardRef(() => SocModule),
  ],
  controllers: [AzureQueueController],
  providers: [AzureService, AzureQueueWorkerService],
  exports: [AzureService, AzureQueueWorkerService],
})
export class AzureModule {}
