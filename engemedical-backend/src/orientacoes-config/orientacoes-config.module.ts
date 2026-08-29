import { Module } from '@nestjs/common';
import { OrientacoesConfigService } from './orientacoes-config.service';
import { OrientacoesConfigController } from './orientacoes-config.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [SupabaseModule, AuditLogModule],
  providers: [OrientacoesConfigService],
  controllers: [OrientacoesConfigController],
  exports: [OrientacoesConfigService],
})
export class OrientacoesConfigModule {}
