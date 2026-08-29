import { Module } from '@nestjs/common';
import { BlobProxyController } from './blob-proxy.controller';
import { AzureModule } from '../azure/azure.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MongoModule } from '../mongo/mongo.module';

@Module({
  imports: [AzureModule, AuditLogModule, MongoModule],
  controllers: [BlobProxyController],
})
export class BlobProxyModule {}
