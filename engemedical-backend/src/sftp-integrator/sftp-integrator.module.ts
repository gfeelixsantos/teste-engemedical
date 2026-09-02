import { Module } from '@nestjs/common';
import { MongoModule } from 'src/mongo/mongo.module';
import { NodemailerModule } from 'src/nodemailer/nodemailer.module';
import { Ssh2SftpClientAdapter } from './sftp-client.adapter';
import { SftpIntegratorController } from './sftp-integrator.controller';
import { SftpIntegratorFs } from './sftp-integrator.fs';
import { SftpIntegratorService } from './sftp-integrator.service';
import { SftpSpreadsheetParser } from './sftp-spreadsheet-parser';

@Module({
  imports: [MongoModule, NodemailerModule],
  controllers: [SftpIntegratorController],
  providers: [
    SftpIntegratorFs,
    SftpSpreadsheetParser,
    SftpIntegratorService,
    {
      provide: 'SFTP_CLIENT_ADAPTER',
      useClass: Ssh2SftpClientAdapter,
    },
    {
      provide: 'SFTP_INTEGRATOR_BACKEND_ROOT',
      useValue: process.cwd(),
    },
  ],
  exports: [SftpIntegratorService],
})
export class SftpIntegratorModule {}
