import { Module } from '@nestjs/common';
import { PrestadoresService } from './prestadores.service';
import { PrestadoresController } from './prestadores.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [SupabaseModule, AuditLogModule],
  providers: [PrestadoresService],
  controllers: [PrestadoresController],
  exports: [PrestadoresService],
})
export class PrestadoresModule {}
