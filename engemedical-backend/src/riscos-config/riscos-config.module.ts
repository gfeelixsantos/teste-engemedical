import { Module } from '@nestjs/common';
import { RiscosConfigService } from './riscos-config.service';
import { RiscosConfigController } from './riscos-config.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [SupabaseModule, AuditLogModule],
  providers: [RiscosConfigService],
  controllers: [RiscosConfigController],
  exports: [RiscosConfigService],
})
export class RiscosConfigModule {}
