import { Module } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { GruposController } from './grupos.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [SupabaseModule, AuditLogModule],
  providers: [GruposService],
  controllers: [GruposController],
  exports: [GruposService],
})
export class GruposModule {}
