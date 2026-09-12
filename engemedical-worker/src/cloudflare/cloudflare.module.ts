import { Module } from '@nestjs/common';
import { CloudflareQueueService } from './cloudflare-queue.service';
import { SftpEmailWorker } from './sftp-email.worker';
import { NodmailerModule } from '../nodemailer/nodemailer.module';

@Module({
  imports: [NodmailerModule],
  providers: [CloudflareQueueService, SftpEmailWorker],
  exports: [CloudflareQueueService],
})
export class CloudflareModule {}
