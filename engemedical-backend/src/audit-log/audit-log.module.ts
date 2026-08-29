import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogQueryService } from './audit-log-query.service';
import { AuditLogController } from './audit-log.controller';
import { MasterGuard } from './master.guard';

@Module({
  providers: [AuditLogService, AuditLogInterceptor, AuditLogQueryService, MasterGuard],
  controllers: [AuditLogController],
  exports: [AuditLogService],
})
export class AuditLogModule {}
