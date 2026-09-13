import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { MongoService } from 'src/mongo/mongo.service';
import { ScraperMetricsService } from 'src/scrapers/scraper-metrics.service';
import { SocService } from 'src/soc/soc.service';
import { TicketService } from 'src/ticket/ticket.service';
import { StructuredLogger } from 'src/utils/logger';
import { calcularRangePipeline } from 'src/utils/util';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { GedBatchService } from 'src/ged-batch/ged-batch.service';
import { SftpIntegratorService } from 'src/sftp-integrator/sftp-integrator.service';

@Injectable()
export class CronJobs implements OnModuleInit {
  private readonly enableSocSyncCron =
    String(process.env.ENABLE_SOC_SYNC_CRON ?? 'false').toLowerCase() ===
    'true';
  private readonly enableGrupoToraSftpCron =
    String(
      process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED ??
        process.env.ENABLE_TORA_SFTP_CRON ??
        'false',
    ).toLowerCase() === 'true';

  constructor(
    private readonly ticketsService: TicketService,
    private readonly mongoService: MongoService,
    private readonly socService: SocService,
    private readonly wsGateway: WebsocketGateway,
    private readonly scraperMetrics: ScraperMetricsService,
    private readonly logger: StructuredLogger,
    private readonly gedBatchService: GedBatchService,
    private readonly sftpIntegratorService: SftpIntegratorService,
  ) {
    this.logger.setContext(CronJobs.name);
  }

  onModuleInit() {
    this.logger.log(
      'CronJobs inicializado: 00:01 (janela orquestrada) e 12:45 (BRT)',
    );
  }

  /**
   * Executa todos os dias à meia-noite + 1min (horário São Paulo).
   * Orquestra a janela de manutenção em ordem explícita para evitar
   * corrida entre jobs que compartilham dados e side effects.
   */
  @Cron('1 0 * * *', { timeZone: 'America/Sao_Paulo' })
  async midnightMaintenanceWindow() {
    await this.midnightChangeStreamReset();
    await this.clearDailyTickets();
    await this.maintainOldSchedulingsBacklog();
    await this.autoFinalizeAgedSchedulingsBacklog();
    await this.reportUnfinishedExamsFromYesterday();
  }

  async midnightChangeStreamReset() {
    this.logger.log(
      'Meia-noite: reiniciando ChangeStream para o novo dia...',
    );
    try {
      await this.mongoService.restartChangeStream();
      this.scraperMetrics.clearTodayMetrics();
      this.logger.log('ChangeStream e métricas de scrapers reiniciados.');
    } catch (error) {
      this.logger.error(
        'Erro ao reiniciar ChangeStream na virada do dia:',
        error,
      );
    }
  }

  /**
   * Executa dentro da janela orquestrada das 00:01.
   */
  async clearDailyTickets() {
    this.logger.log('Iniciando rotina diária da janela das 00:01...');

    try {
      // Reinicia o ChangeStream primeiro para recalcular o range de datas do novo dia.
      // Sem este restart, o pipeline de filtro continua com a data de ontem
      // e eventos do novo dia são silenciosamente ignorados até o próximo watchdog.
      this.logger.log('Reiniciando ChangeStream para o novo dia...');
      await this.mongoService.restartChangeStream();
      this.logger.log('ChangeStream reiniciado com range do novo dia.');

      await this.ticketsService.deleteOldTickets();
      if (!this.enableSocSyncCron) {
        this.logger.warn({
          event: 'SOC_SYNC_CRON_DISABLED',
          message: '[CRON][SOC] Execucao desativada por configuracao',
          enabled: this.enableSocSyncCron,
        });
      } else {
        const socSyncResult = await this.socService.handleUpdateSocToMongo();
        if (!socSyncResult?.success) {
          this.logger.warn({
            event: 'SOC_SYNC_CRON_UNSUCCESSFUL',
            message:
              socSyncResult?.message ?? 'Resultado de sincronizacao ausente',
            empresasProcessadas: socSyncResult?.empresasProcessadas ?? null,
            erros: socSyncResult?.erros ?? [],
          });
        } else {
          this.logger.log({
            event: 'SOC_SYNC_CRON_SUCCESS',
            message: socSyncResult.message,
            empresasProcessadas: socSyncResult.empresasProcessadas ?? null,
          });
        }
      }
      const { inicioDoDiaBR } = calcularRangePipeline();

      await this.mongoService.db.collection('available_dates').deleteMany({
        Date: { $lt: inicioDoDiaBR },
      });

      await this.mongoService.cleanupSchedule();

      // NOTA: Limpeza de áudio removida - sistema agora gerencia arquivos
      // via deleteMp3 quando tickets são retornados/finalizados, e arquivos
      // têm nomes únicos (unidade_sala_ticket_id.mp3) evitando colisões
      this.logger.log('Rotina diária da janela das 00:01 finalizada.');
    } catch (error) {
      this.logger.error('Erro na rotina diária da janela das 00:01:', error);
    }
  }

  /**
   * Executa dentro da janela orquestrada das 00:01.
   */
  async maintainOldSchedulingsBacklog() {
    this.logger.log(
      '[CRON][BACKLOG] Iniciando manutencao de agendamentos antigos...',
    );

    try {
      await this.mongoService.processUnfinishedSchedulings();
      this.logger.log(
        '[CRON][BACKLOG] Manutencao de agendamentos antigos finalizada.',
      );
    } catch (error) {
      this.logger.error(
        '[CRON][BACKLOG] Erro na manutencao de agendamentos antigos:',
        error,
      );
    }
  }

  /**
   * Executa dentro da janela orquestrada das 00:01.
   * Identifica, envia resultados para o SOCGED/SOC e finaliza atendimentos com mais de 90 dias.
   */
  async autoFinalizeAgedSchedulingsBacklog() {
    this.logger.log(
      '[CRON][AUTO_FINALIZE] Iniciando finalização automática de atendimentos antigos (> 90 dias)...',
    );

    try {
      const summary = await this.mongoService.autoFinalizeAgedSchedulings();
      this.logger.log(
        `[CRON][AUTO_FINALIZE] Finalização concluída. Encontrados: ${summary.queriedCount}, Processados com sucesso: ${summary.finalizedCount}, Erros: ${summary.errorsCount}`,
      );
    } catch (error) {
      this.logger.error(
        '[CRON][AUTO_FINALIZE] Erro na finalização automática de atendimentos antigos:',
        error,
      );
    }
  }

  /**
   * Executa dentro da janela orquestrada das 00:01.
   * Busca atendimentos do dia anterior com exames NAO_REALIZADO e envia relatório por email.
   */
  async reportUnfinishedExamsFromYesterday() {
    this.logger.log(
      '[CRON][UNFINISHED_EXAMS] Iniciando relatório de exames não realizados...',
    );

    try {
      // Calcula a data anterior (ontem)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const schedulings =
        await this.mongoService.findSchedulingsWithUnfinishedExams(yesterday);

      if (schedulings.length > 0) {
        await this.mongoService.sendUnfinishedExamsReport(schedulings);
      }

      this.logger.log(
        `[CRON][UNFINISHED_EXAMS] Relatório de exames não realizados finalizado.`,
      );
    } catch (error) {
      this.logger.error(
        '[CRON][UNFINISHED_EXAMS] Erro no relatório de exames não realizados:',
        error,
      );
    }
  }

  @Cron('45 12 * * *', { timeZone: 'America/Sao_Paulo' })
  async middayJob() {
    this.logger.log('Iniciando rotinas das 12:45...');

    try {
      await this.ticketsService.deleteOldTickets();
      this.logger.log('Rotina das 12:45 finalizada.');
    } catch (error) {
      this.logger.error('Erro na rotina das 12:45:', error);
    }
  }

  @Cron('*/5 * * * *', { timeZone: 'America/Sao_Paulo' })
  async reconcileActiveTickets() {
    try {
      // 1. Reconciliação do MongoDB (Painel TV)
      const result =
        await this.mongoService.reconcileInconsistentActiveTickets('cron');

      if (result.reconciled > 0) {
        this.logger.log({
          event: 'TICKET_RECONCILE_CRON_MONGO',
          source: result.source,
          evaluated: result.evaluated,
          reconciled: result.reconciled,
        });
      }
    } catch (error) {
      this.logger.error('Erro ao reconciliar tickets ativos:', error);
    }
  }

  /**
   * Executa todo dia 23 às 22:00 para inativação em massa no SOC.
   */
  @Cron('0 22 23 * *', { timeZone: 'America/Sao_Paulo' })
  async socInactivationJob() {
    this.logger.log(
      'Iniciando rotina de inativação em massa (todo dia 23 às 22:00)...',
    );
    try {
      const result = await this.socService.inactivateEmployeesFlow();
      this.logger.log({
        event: 'SOC_INACTIVATION_CRON_FINISH',
        success: result.success,
        message: result.message,
        totalEmpresas: result.totalEmpresas,
        totalInativados: result.totalInativados,
      });
    } catch (error) {
      this.logger.error('Erro na rotina de inativação em massa:', error);
    }
  }

  @Cron('30 18 * * *', { timeZone: 'America/Sao_Paulo' })
  async grupoToraSftpPullJob() {
    if (!this.enableGrupoToraSftpCron) {
      this.logger.warn({
        event: 'SFTP_INTEGRATOR_GRUPO_TORA_CRON_DISABLED',
        message: '[CRON][SFTP] Grupo Tora desativado por configuracao',
      });
      return;
    }

    this.logger.log('[CRON][SFTP] Iniciando pull Grupo Tora...');
    try {
      const result =
        await this.sftpIntegratorService.pullLatestAndRunDryRun('grupo-tora');
      this.logger.log({
        event: 'SFTP_INTEGRATOR_GRUPO_TORA_DRY_RUN_FINISH',
        downloaded: result.pull.downloaded,
        remoteName: result.pull.file.remoteName,
        size: result.pull.file.size,
        sha256: result.pull.file.sha256,
        summary: result.dryRun.summary,
      });
    } catch (error) {
      this.logger.error('[CRON][SFTP] Erro no pull Grupo Tora:', error);
    }
  }

  @Cron('0 3 * * *', { timeZone: 'America/Sao_Paulo' })
  async cleanupOldGedBatchJobs() {
    this.logger.log('[CRON][GED_BATCH] Limpeza de jobs antigos iniciada...');
    try {
      await this.gedBatchService.cleanupOldJobs();
      this.logger.log('[CRON][GED_BATCH] Limpeza de jobs antigos finalizada.');
    } catch (error) {
      this.logger.error(
        '[CRON][GED_BATCH] Erro na limpeza de jobs antigos:',
        error,
      );
    }
  }
}
