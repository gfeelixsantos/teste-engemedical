import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SftpIntegratorService } from './sftp-integrator.service';

const GRUPO_TORA_CLIENT_KEY = 'grupo-tora';
const GRUPO_TORA_ENV_PREFIX = 'SFTP_INTEGRATOR_GRUPO_TORA';

function isEnabled(value?: string): boolean {
  return String(value || '').toLowerCase() === 'true';
}

function resolveFileId(result: unknown): string {
  const file = (result as any)?.pull?.file || (result as any)?.file;
  return String(file?._id || '');
}

function resolveFileName(result: unknown): string {
  const file = (result as any)?.pull?.file || (result as any)?.file;
  return String(file?.remoteName || 'arquivo nao identificado');
}

@Injectable()
export class SftpIntegratorScheduler {
  private readonly logger = new Logger(SftpIntegratorScheduler.name);
  private grupoToraRunning = false;

  constructor(private readonly sftpIntegratorService: SftpIntegratorService) {}

  @Cron('30 18 * * *', { timeZone: 'America/Sao_Paulo' })
  async runGrupoToraDailyIntegration() {
    if (!isEnabled(process.env[`${GRUPO_TORA_ENV_PREFIX}_CRON_ENABLED`])) {
      this.logger.debug('[SFTP] Cron Grupo Tora desabilitado.');
      return;
    }

    if (this.grupoToraRunning) {
      this.logger.warn(
        '[SFTP] Execucao anterior do Grupo Tora ainda em andamento. Ignorando novo disparo.',
      );
      return;
    }

    this.grupoToraRunning = true;
    try {
      this.logger.log('[SFTP] Iniciando rotina diaria Grupo Tora.');
      const dryRun = await this.sftpIntegratorService.pullLatestAndRunDryRun(
        GRUPO_TORA_CLIENT_KEY,
      );
      const fileId = resolveFileId(dryRun);
      const fileName = resolveFileName(dryRun);

      if (!fileId) {
        throw new Error('Dry-run SFTP concluido sem identificador de arquivo');
      }

      this.logger.log(`[SFTP] Dry-run Grupo Tora concluido: ${fileName}.`);
      if (!isEnabled(process.env[`${GRUPO_TORA_ENV_PREFIX}_SOC_ENABLED`])) {
        this.logger.log(
          '[SFTP] Processamento SOC Grupo Tora desabilitado apos dry-run.',
        );
        return;
      }

      const socResult = await this.sftpIntegratorService.processSocLimited(
        GRUPO_TORA_CLIENT_KEY,
        fileId,
      );
      const summary = (socResult as any)?.summary || {};
      this.logger.log(
        `[SFTP] Processamento SOC Grupo Tora concluido: sucesso=${summary.success || 0}, falhas=${summary.failed || 0}.`,
      );
    } catch (error) {
      this.logger.error(
        `[SFTP] Falha na rotina diaria Grupo Tora: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.grupoToraRunning = false;
    }
  }
}
