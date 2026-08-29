import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ExamesService } from './exames.service';
import { ExamesController } from './exames.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [SupabaseModule, AuditLogModule],
  providers: [ExamesService],
  controllers: [ExamesController],
  exports: [ExamesService],
})
export class ExamesModule implements OnModuleInit {
  private readonly logger = new Logger(ExamesModule.name);

  constructor(private readonly examesService: ExamesService) {}

  async onModuleInit(): Promise<void> {
    await this.loadCacheWithRetry();
  }

  private async loadCacheWithRetry(maxRetries = 3, delayMs = 1000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.examesService.refreshProviderCache();
        this.logger.log(`Cache de exames carregado do Supabase (tentativa ${attempt}/${maxRetries})`);
        return;
      } catch (error) {
        this.logger.warn(
          `Tentativa ${attempt}/${maxRetries} falhou ao carregar exames do Supabase: ${error.message || error}`,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    this.logger.warn('Fallback hardcoded ativado - cache do Supabase indisponível.');
  }
}
