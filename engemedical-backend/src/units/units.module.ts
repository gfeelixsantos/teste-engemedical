import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [SupabaseModule, AuditLogModule],
  providers: [UnitsService],
  controllers: [UnitsController],
  exports: [UnitsService],
})
export class UnitsModule {}
