import { forwardRef, Module } from '@nestjs/common';
import { AzureService } from './azure.service';
import { MongoModule } from 'src/mongo/mongo.module';
import { AzureQueueWorkerService } from './azure-queue-worker.service';
import { AzureQueueController } from './azure-queue.controller';
import { SocModule } from 'src/soc/soc.module';
import { GoogleDriveModule } from 'src/google/drive/google-drive.module';
import { GoogleDriveUploadService } from './google-drive-upload.service';

@Module({
  imports: [
    forwardRef(() => MongoModule),
    forwardRef(() => SocModule),
    GoogleDriveModule,
  ],
  controllers: [AzureQueueController],
  providers: [AzureService, AzureQueueWorkerService, GoogleDriveUploadService],
  exports: [AzureService, AzureQueueWorkerService, GoogleDriveUploadService],
})
export class AzureModule {}
