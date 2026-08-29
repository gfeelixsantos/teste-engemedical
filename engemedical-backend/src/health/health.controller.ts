import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MongoService } from 'src/mongo/mongo.service';
import { WebsocketGateway } from 'src/websocket/websocket-connection';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly mongoService: MongoService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  @Get()
  async healthCheck() {
    const checks: Record<string, string | number> = {
      http: 'ok',
      mongodb: 'checking',
      changeStream: 'checking',
      websocket: 'checking',
      timestamp: new Date().toISOString(),
    };

    try {
      await this.mongoService.schedulingsCollection.findOne(
        { _id: { $exists: true } },
        { projection: { _id: 1 } },
      );
      checks.mongodb = 'ok';
    } catch (error) {
      checks.mongodb = 'error';
      throw new HttpException(
        { ...checks, error: 'MongoDB connection failed' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const csHealth = this.mongoService.getChangeStreamHealth();
    checks.changeStreamLastEventAgeSec = csHealth.lastEventAgeSec;
    checks.changeStreamReconnectAttempts = csHealth.reconnectAttempts;

    if (csHealth.unhealthy) {
      checks.changeStream = csHealth.active ? 'degraded' : 'inactive';
      this.logger.warn(
        `[HEALTH] ChangeStream unhealthy: active=${csHealth.active} lastEventAgeSec=${csHealth.lastEventAgeSec} reconnectAttempts=${csHealth.reconnectAttempts}`,
      );

      try {
        await this.mongoService.restartChangeStream();
        const afterRestart = this.mongoService.getChangeStreamHealth();
        checks.changeStream = afterRestart.unhealthy ? 'error' : 'restarted';
        checks.changeStreamLastEventAgeSec = afterRestart.lastEventAgeSec;
        checks.changeStreamReconnectAttempts = afterRestart.reconnectAttempts;

        if (afterRestart.unhealthy) {
          throw new Error('ChangeStream still unhealthy after restart');
        }
      } catch (error) {
        checks.changeStream = 'error';
        throw new HttpException(
          {
            ...checks,
            error: 'ChangeStream restart failed',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    } else {
      checks.changeStream = 'ok';
    }

    const sockets = this.websocketGateway.server.sockets.sockets;
    const connected = [...sockets.values()].filter((s) => s.connected).length;
    checks.websocket = connected.toString();

    return checks;
  }
}
