import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from 'src/supabase/supabase.service';
import { setExamesData, ExamToogle } from './exames.provider';
import { TEMPLATE_MAP } from './exames.constant';

@Injectable()
export class ExamesLoaderService implements OnModuleInit {
  private readonly logger = new Logger(ExamesLoaderService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async onModuleInit() {
    await this.loadExames();
  }

  // Recarrega o catálogo de exames automaticamente a cada 5 minutos do Supabase
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePeriodicReload() {
    this.logger.log('Recarregamento periódico do catálogo de exames disparado.');
    await this.loadExames();
  }

  async loadExames() {
    try {
      this.logger.log('Carregando catálogo de exames do Supabase...');
      const supabase = this.supabaseService.getClient();

      const { data: exames, error } = await supabase
        .from('exames')
        .select('*')
        .eq('ativo', true);

      if (error) {
        throw error;
      }

      if (!exames || exames.length === 0) {
        this.logger.warn('Nenhum exame ativo encontrado no Supabase. Usando catálogo hardcoded.');
        return;
      }

      const grouped: Record<string, ExamToogle[]> = {};

      for (const exame of exames) {
        if (!grouped[exame.grupo]) {
          grouped[exame.grupo] = [];
        }
        grouped[exame.grupo].push({
          codigos: exame.codigos || [],
          nome: exame.nome,
          statusFinalizacao: exame.status_finalizacao,
          enviarParaAzure: exame.enviar_para_azure,
          requerAssinaturaDigital: exame.requer_assinatura,
          template: exame.template_key ? (TEMPLATE_MAP[exame.template_key] as ExamToogle['template']) : undefined,
        });
      }

      setExamesData(grouped);
      this.logger.log(`Catálogo de exames carregado com sucesso (${exames.length} exames mapeados em ${Object.keys(grouped).length} grupos).`);
    } catch (err: any) {
      this.logger.error(`Erro ao carregar catálogo de exames do Supabase: ${err.message || err}. Usando catálogo hardcoded como fallback.`);
    }
  }
}
