import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from 'src/mongo/mongo.service';
import {
  SftpExecutionsResponse,
  SftpFilesResponse,
  SftpReportDto,
  SftpHorariosResponse,
  SftpExecutionsQuery,
  SftpFilesQuery,
  SftpStatus,
  SftpRunStatus,
  SftpHorariosDto,
} from './sftp-reports.types';

@Injectable()
export class SftpReportsService {
  private readonly logger = new Logger(SftpReportsService.name);

  constructor(private readonly mongoService: MongoService) {}

  /**
   * GET /sftp-executions
   * Retorna a lista de execuções (runs) de processamento SFTP
   */
  async getExecutions(query: SftpExecutionsQuery): Promise<SftpExecutionsResponse> {
    const {
      clientKey,
      status,
      limit = 50,
      skip = 0,
    } = query;

    // Construir filtro
    const filter: any = {};
    if (clientKey) filter.clientKey = clientKey;
    if (status) filter.status = status;

    // Buscar execuções
    const runsCollection = this.mongoService.db.collection('sftp_integrator_runs');
    const executions = await runsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Contar total
    const total = await runsCollection.countDocuments(filter);

    // Mapear para DTOs
    const mappedExecutions = executions.map((run) => ({
      id: run._id.toHexString(),
      clientKey: run.clientKey,
      fileId: run.fileId.toHexString(),
      status: run.status,
      summary: run.summary,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    }));

    return {
      executions: mappedExecutions,
      total,
    };
  }

  /**
   * GET /sftp-files
   * Retorna a lista de arquivos baixados via SFTP
   */
  async getFiles(query: SftpFilesQuery): Promise<SftpFilesResponse> {
    const {
      clientKey,
      status,
      limit = 50,
      skip = 0,
    } = query;

    // Construir filtro
    const filter: any = {};
    if (clientKey) filter.clientKey = clientKey;
    if (status) filter.status = status;

    // Buscar arquivos
    const filesCollection = this.mongoService.db.collection('sftp_integrator_files');
    const files = await filesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Contar total
    const total = await filesCollection.countDocuments(filter);

    // Mapear para DTOs
    const mappedFiles = files.map((file) => ({
      id: file._id.toHexString(),
      clientKey: file.clientKey,
      remoteName: file.remoteName,
      remotePath: file.remotePath,
      size: file.size,
      sha256: file.sha256,
      remoteMtime: file.remoteMtime,
      status: file.status,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }));

    return {
      files: mappedFiles,
      total,
    };
  }

  /**
   * GET /sftp-report/:id
   * Retorna um relatório detalhado de uma execução específica
   */
  async getReportById(id: string): Promise<SftpReportDto> {
    const filesCollection = this.mongoService.db.collection('sftp_integrator_files');
    const runsCollection = this.mongoService.db.collection('sftp_integrator_runs');

    // Validar ObjectId
    if (!this.isValidObjectId(id)) {
      return { execution: null };
    }

    const ObjectId = require('mongodb').ObjectId;
    const objectId = new ObjectId(id);

    // Buscar execução
    const execution = await runsCollection.findOne({ _id: objectId });

    if (!execution) {
      return { execution: null };
    }

    // Buscar arquivo relacionado
    let file = null;
    if (execution.fileId) {
      file = await filesCollection.findOne({
        _id: execution.fileId instanceof ObjectId
          ? execution.fileId
          : new ObjectId(execution.fileId),
      });
    }

    return {
      execution: {
        id: execution._id.toHexString(),
        clientKey: execution.clientKey,
        fileId: execution.fileId.toHexString(),
        status: execution.status,
        summary: execution.summary,
        createdAt: execution.createdAt,
        updatedAt: execution.updatedAt,
      },
      file: file ? {
        id: file._id.toHexString(),
        clientKey: file.clientKey,
        remoteName: file.remoteName,
        remotePath: file.remotePath,
        size: file.size,
        sha256: file.sha256,
        remoteMtime: file.remoteMtime,
        status: file.status,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      } : undefined,
    };
  }

  /**
   * GET /sftp-horarios
   * Retorna informações de agendamento (cron) para cada cliente SFTP
   */
  async getHorarios(): Promise<SftpHorariosResponse> {
    const horarios = this.buildHorariosFromConfig();

    return { horarios };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  private buildHorariosFromConfig(): SftpHorariosDto[] {
    const horarios: SftpHorariosDto[] = [];
    const timezone = 'America/Sao_Paulo';

    // Buscar clientes configurados no ambiente
    // Formato: SFTP_INTEGRATOR_{CLIENT_KEY}_CRON_ENABLED, SFTP_INTEGRATOR_{CLIENT_KEY}_CRON_EXPRESSION
    const clientKeys = this.extractClientKeys();

    for (const clientKey of clientKeys) {
      const cronEnabled = this.getEnvBoolean(
        `SFTP_INTEGRATOR_${clientKey}_CRON_ENABLED`
      );
      const cronExpression = this.getEnvString(
        `SFTP_INTEGRATOR_${clientKey}_CRON_EXPRESSION`,
        '0 2 * * *' // Default: 2AM daily
      );

      const nextExecution = cronEnabled
        ? this.parseNextExecution(cronExpression)
        : null;
      const lastExecution = cronEnabled ? this.getLastExecution(clientKey) : null;

      horarios.push({
        clientKey,
        cronExpression,
        cronEnabled,
        nextExecution,
        lastExecution,
        timezone,
      });
    }

    return horarios;
  }

  private extractClientKeys(): string[] {
    const keys = new Set<string>();

    // Procurar por variáveis de ambiente que indicam clientes SFTP
    for (const key of Object.keys(process.env)) {
      // Formato: SFTP_INTEGRATOR_{CLIENT_KEY}_...
      const match = key.match(/^SFTP_INTEGRATOR_([A-Z0-9_-]+)_.*/);
      if (match) {
        const clientKey = match[1].toLowerCase().replace(/_/g, '-');
        keys.add(clientKey);
      }
    }

    // Padrão conhecido: grupo-tora
    if (process.env.SFTP_INTEGRATOR_GRUPO_TORA_HOST) {
      keys.add('grupo-tora');
    }

    return Array.from(keys);
  }

  private getEnvBoolean(key: string): boolean {
    const value = process.env[key];
    return value?.toLowerCase() === 'true';
  }

  private getEnvString(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  private parseNextExecution(cronExpression: string): Date | null {
    try {
      // Usar abordagem simples baseada em Date para expressões cron comuns
      // Para horários complexos, usar biblioteca cron-parser quando disponível
      // Implementação simplificada: calcular próxima execução com base na expressão
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0); // Default 2AM next day

      // Parse básico de expressão cron (formato: min hour dom month dow)
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length >= 5) {
        // Para expressões simples, calcular próxima execução
        // Esta é uma implementação simplificada - em produção usar cron-parser
        return this.calculateNextCronRun(cronExpression, now);
      }

      return tomorrow;
    } catch (error) {
      this.logger.warn(`Erro ao parsear cron: ${cronExpression}`, error);
      return null;
    }
  }

  private calculateNextCronRun(expression: string, from: Date): Date {
    // Implementação simplificada para expressões cron comuns
    // Exemplo: "0 2 * * 1-5" = 2AM segunda a sexta
    const parts = expression.trim().split(/\s+/);

    const result = new Date(from);

    if (parts[0] === '0' && parts[1] === '2' && parts[2] === '*' && parts[3] === '*') {
      // 2AM daily ou 2AM weekdays
      result.setHours(2, 0, 0, 0);

      if (parts[4] !== '*' && parts[4].includes('-')) {
        // Intervalo de dias da semana
        const days = parts[4].split('-').map(Number);
        const currentDay = from.getDay(); // 0 = Sunday

        // Encontrar próximo dia da semana válido
        for (let i = 1; i <= 7; i++) {
          const nextDay = (currentDay + i) % 7;
          if (days.includes(nextDay)) {
            result.setDate(from.getDate() + i - (currentDay >= days[0] ? 0 : 1));
            break;
          }
        }
      } else if (parts[4] !== '*' && !parts[4].includes('-')) {
        // Dia específico da semana
        const day = parseInt(parts[4], 10);
        const currentDay = from.getDay();

        if (currentDay !== day) {
          const daysUntil = (day - currentDay + 7) % 7 || 7;
          result.setDate(from.getDate() + daysUntil);
        }
      } else {
        // Daily - próximo dia
        if (result <= from) {
          result.setDate(result.getDate() + 1);
        }
      }
    }

    return result;
  }

  private async getLastExecution(clientKey: string): Promise<Date | null> {
    const runsCollection = this.mongoService.db.collection('sftp_integrator_runs');
    const lastRun = await runsCollection.findOne(
      { clientKey },
      { sort: { createdAt: -1 } }
    );
    return lastRun?.createdAt || null;
  }
}