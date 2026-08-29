import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { AzureService } from './azure.service';

@Controller('azure/queues')
export class AzureQueueController {
  private readonly logger = new Logger(AzureQueueController.name);

  constructor(private readonly azureService: AzureService) {}

  @Get('stats')
  async getQueueStats() {
    if (!this.azureService.isEnabled()) {
      throw new HttpException(
        { message: 'Serviço Azure não habilitado neste ambiente.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const stats = await this.azureService.getAllQueueStats();
      return {
        queues: stats,
        totalMessages: stats.reduce(
          (sum, q) => sum + q.approximateMessagesCount,
          0,
        ),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `[AZURE_QUEUE] Erro ao obter stats das filas: ${error.message}`,
      );
      throw new HttpException(
        { message: 'Erro ao obter estatísticas das filas.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':queueName/peek')
  async peekQueue(
    @Param('queueName') queueName: string,
    @Query('limit') limit?: string,
  ) {
    if (!this.azureService.isEnabled()) {
      throw new HttpException(
        { message: 'Serviço Azure não habilitado neste ambiente.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const availableQueues = this.azureService.getAvailableQueueNames();
    if (!availableQueues.includes(queueName)) {
      throw new HttpException(
        {
          message: `Fila '${queueName}' não encontrada.`,
          availableQueues,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const maxMessages = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 32);

    try {
      const messages = await this.azureService.peekQueueMessages(
        queueName,
        maxMessages,
      );

      const parsed = messages.map((msg) => {
        let parsedPayload: Record<string, unknown> | null = null;
        try {
          parsedPayload = JSON.parse(msg.messageText);
        } catch {
          try {
            const decoded = Buffer.from(msg.messageText, 'base64').toString('utf8');
            parsedPayload = JSON.parse(decoded);
          } catch {
            parsedPayload = { raw: msg.messageText };
          }
        }

        return {
          messageId: msg.messageId,
          insertedOn: msg.insertedOn,
          expiresOn: msg.expiresOn,
          dequeueCount: msg.dequeueCount,
          payload: parsedPayload,
        };
      });

      return {
        queueName,
        messages: parsed,
        count: parsed.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `[AZURE_QUEUE] Erro ao fazer peek na fila '${queueName}': ${error.message}`,
      );
      throw new HttpException(
        { message: 'Erro ao consultar mensagens da fila.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':queueName/requeue')
  async requeueMessage(
    @Param('queueName') queueName: string,
    @Body() body: { targetQueueName: string; editedPayload?: Record<string, unknown> | null },
  ) {
    if (!this.azureService.isEnabled()) {
      throw new HttpException(
        { message: 'Serviço Azure não habilitado neste ambiente.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const availableQueues = this.azureService.getAvailableQueueNames();
    if (!availableQueues.includes(queueName)) {
      throw new HttpException(
        {
          message: `Fila '${queueName}' não encontrada.`,
          availableQueues,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!body.targetQueueName || !availableQueues.includes(body.targetQueueName)) {
      throw new HttpException(
        {
          message: `Fila destino '${body.targetQueueName}' não encontrada.`,
          availableQueues,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const success = await this.azureService.requeueMessage(
        queueName,
        body.targetQueueName,
        body.editedPayload ?? null,
      );

      if (!success) {
        throw new HttpException(
          { message: 'Nenhuma mensagem encontrada na fila para reenfileirar.' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: `Mensagem reenfileirada de '${queueName}' para '${body.targetQueueName}'.`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `[AZURE_QUEUE] Erro ao reenfileirar mensagem de '${queueName}': ${error.message}`,
      );
      throw new HttpException(
        { message: 'Erro ao reenfileirar mensagem.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
