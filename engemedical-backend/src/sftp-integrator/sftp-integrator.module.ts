import { Module } from '@nestjs/common';
import { MongoModule } from 'src/mongo/mongo.module';
import { NodemailerModule } from 'src/nodemailer/nodemailer.module';
import { Ssh2SftpClientAdapter } from './sftp-client.adapter';
import { SftpIntegratorController } from './sftp-integrator.controller';
import { SftpIntegratorFs } from './sftp-integrator.fs';
import { SftpIntegratorService } from './sftp-integrator.service';
import { SftpIntegratorScheduler } from './sftp-integrator.scheduler';
import { SftpSocEmployeeLookupService } from './sftp-soc-employee-lookup.service';
import { SftpSocProcessor } from './sftp-soc-processor';
import { SftpSpreadsheetParser } from './sftp-spreadsheet-parser';
import { CloudflareR2Service } from './sftp-r2-storage.service';
import { CloudflareQueueService } from './sftp-queue.service';

@Module({
  imports: [MongoModule, NodemailerModule],
  controllers: [SftpIntegratorController],
  providers: [
    SftpIntegratorFs,
    SftpSpreadsheetParser,
    SftpSocEmployeeLookupService,
    SftpSocProcessor,
    SftpIntegratorService,
    SftpIntegratorScheduler,
    CloudflareR2Service,
    CloudflareQueueService,
    {
      provide: 'SFTP_CLIENT_ADAPTER',
      useClass: Ssh2SftpClientAdapter,
    },
    {
      provide: 'SFTP_INTEGRATOR_BACKEND_ROOT',
      useValue: process.cwd(),
    },
  ],
  exports: [SftpIntegratorService, CloudflareR2Service, CloudflareQueueService],
})
export class SftpIntegratorModule {}
