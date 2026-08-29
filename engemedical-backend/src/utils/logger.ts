import { Injectable, LoggerService, Scope } from '@nestjs/common';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context?: string;
  private static logLevel: LogLevel =
    (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;

  private readonly levelWeights: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  setContext(context: string) {
    this.context = context;
  }

  static setGlobalLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      this.levelWeights[level] >= this.levelWeights[StructuredLogger.logLevel]
    );
  }

  private stringify(value: any): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error) {
      return value.stack || value.message;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private format(level: LogLevel, message: any, ...optionalParams: any[]) {
    if (!this.shouldLog(level)) return;

    const entry = {
      level,
      timestamp: new Date().toISOString(),
      context: this.context,
      message,
      ...(optionalParams.length > 0 && { details: optionalParams }),
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
      return;
    }

    const color =
      level === LogLevel.ERROR
        ? '\x1b[31m'
        : level === LogLevel.WARN
          ? '\x1b[33m'
          : '\x1b[36m';
    const reset = '\x1b[0m';
    const renderedMessage = this.stringify(message);
    const renderedDetails = optionalParams.map((param) =>
      this.stringify(param),
    );

    console.log(
      `${color}[${level.toUpperCase()}]${reset} ${entry.timestamp} [${entry.context || 'App'}] ${renderedMessage}`,
      ...renderedDetails,
    );
  }

  log(message: any, ...optionalParams: any[]) {
    this.format(LogLevel.INFO, message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.format(LogLevel.ERROR, message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.format(LogLevel.WARN, message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.format(LogLevel.DEBUG, message, ...optionalParams);
  }

  sample(rate: number, message: any, ...optionalParams: any[]) {
    if (Math.random() < rate) {
      this.log(`[SAMPLE][${rate * 100}%] ${message}`, ...optionalParams);
    }
  }
}
