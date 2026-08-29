import { Injectable, LoggerService, Scope } from '@nestjs/common';
import pino from 'pino';
import { getLogContext } from './async-storage';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private pinoLogger: pino.Logger;
  private contextName: string = 'App';

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';

    this.pinoLogger = pino({
      level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
      base: isProd
        ? { pid: process.pid, hostname: process.env.HOSTNAME || 'worker' }
        : undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname,context',
              messageFormat: '{context} {msg}',
            },
          },
    });
  }

  setContext(context: string) {
    this.contextName = context;
  }

  private getEnrichedPayload(message: any, metadata?: Record<string, any>) {
    const logContext = getLogContext();
    const payload = {
      context: this.contextName,
      ...logContext,
      ...(typeof message === 'object' ? message : {}),
      ...metadata,
    };

    const msg =
      typeof message === 'string'
        ? message
        : message?.msg || message?.message || '';
    return { payload, msg };
  }

  log(message: any, context?: string) {
    if (context) this.setContext(context);
    const { payload, msg } = this.getEnrichedPayload(message);
    this.pinoLogger.info(payload, msg);
  }

  error(message: any, stack?: string, context?: string) {
    if (context) this.setContext(context);
    const { payload, msg } = this.getEnrichedPayload(
      message,
      stack ? { stack } : undefined,
    );
    this.pinoLogger.error(payload, msg);
  }

  warn(message: any, context?: string) {
    if (context) this.setContext(context);
    const { payload, msg } = this.getEnrichedPayload(message);
    this.pinoLogger.warn(payload, msg);
  }

  debug(message: any, context?: string) {
    if (context) this.setContext(context);
    const { payload, msg } = this.getEnrichedPayload(message);
    this.pinoLogger.debug(payload, msg);
  }

  verbose(message: any, context?: string) {
    if (context) this.setContext(context);
    const { payload, msg } = this.getEnrichedPayload(message);
    this.pinoLogger.trace(payload, msg);
  }
}
