import { Module } from '@nestjs/common';
import { SftpReportsController } from './sftp-reports.controller';
import { SftpReportsService } from './sftp-reports.service';
import { MongoModule } from 'src/mongo/mongo.module';

@Module({
  imports: [MongoModule],
  controllers: [SftpReportsController],
  providers: [SftpReportsService],
  exports: [SftpReportsService],
})
export class SftpReportsModule {}