import { Injectable, Logger } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket-connection';
import {
  getNextScraperRunAt,
  SCRAPER_ALLOWED_TIMES_LABEL,
  SCRAPER_INTERVAL_MINUTES,
} from './utils/scraper-schedule.util';

export type ScraperStatus =
  | 'Aguardando'
  | 'Processando'
  | 'Finalizado'
  | 'Erro';

export interface ProviderMetrics {
  provider: string;
  status: ScraperStatus;
  lastProcessed?: string;
  lastStartedAt?: string;
  lastFinishedAt?: string;
  nextRunAt?: string;
  scheduleLabel?: string;
  countToday: number;
  analyzedToday: number;
  receivedToday: number;
  intervalMinutes: number;
}

@Injectable()
export class ScraperMetricsService {
  private readonly logger = new Logger(ScraperMetricsService.name);
  private metrics: Record<string, ProviderMetrics> = {
    Worklab: {
      provider: 'Worklab',
      status: 'Aguardando',
      countToday: 0,
      analyzedToday: 0,
      receivedToday: 0,
      intervalMinutes: SCRAPER_INTERVAL_MINUTES,
      scheduleLabel: SCRAPER_ALLOWED_TIMES_LABEL,
    },
    Cedill: {
      provider: 'Cedill',
      status: 'Aguardando',
      countToday: 0,
      analyzedToday: 0,
      receivedToday: 0,
      intervalMinutes: SCRAPER_INTERVAL_MINUTES,
      scheduleLabel: SCRAPER_ALLOWED_TIMES_LABEL,
    },
    Medical: {
      provider: 'Medical',
      status: 'Aguardando',
      countToday: 0,
      analyzedToday: 0,
      receivedToday: 0,
      intervalMinutes: SCRAPER_INTERVAL_MINUTES,
      scheduleLabel: SCRAPER_ALLOWED_TIMES_LABEL,
    },
    Veitieka: {
      provider: 'Veitieka',
      status: 'Aguardando',
      countToday: 0,
      analyzedToday: 0,
      receivedToday: 0,
      intervalMinutes: SCRAPER_INTERVAL_MINUTES,
      scheduleLabel: SCRAPER_ALLOWED_TIMES_LABEL,
    },
    Abel: {
      provider: 'Abel',
      status: 'Aguardando',
      countToday: 0,
      analyzedToday: 0,
      receivedToday: 0,
      intervalMinutes: SCRAPER_INTERVAL_MINUTES,
      scheduleLabel: SCRAPER_ALLOWED_TIMES_LABEL,
    },
  };

  constructor(private readonly wsGateway: WebsocketGateway) {}

  markStarted(provider: string) {
    if (this.metrics[provider]) {
      this.metrics[provider].status = 'Processando';
      this.metrics[provider].lastStartedAt = new Date().toISOString();
      this.broadcast();
    }
  }

  markFinished(provider: string) {
    if (this.metrics[provider]) {
      this.metrics[provider].status = 'Aguardando';
      this.metrics[provider].lastFinishedAt = new Date().toISOString();
      this.broadcast();
    }
  }

  updateStatus(provider: string, status: ScraperStatus) {
    if (this.metrics[provider]) {
      if (this.metrics[provider].status === status) return;
      this.metrics[provider].status = status;
      this.broadcast();
    }
  }

  incrementAnalyzed(provider: string) {
    if (this.metrics[provider]) {
      this.metrics[provider].analyzedToday++;
      this.broadcast();
    }
  }

  incrementReceived(provider: string) {
    if (this.metrics[provider]) {
      this.metrics[provider].receivedToday++;
      this.metrics[provider].countToday++;
      this.broadcast();
    }
  }

  clearTodayMetrics() {
    this.logger.debug('Limpando métricas diárias dos scrapers...');
    for (const provider of Object.keys(this.metrics)) {
      this.metrics[provider].countToday = 0;
      this.metrics[provider].analyzedToday = 0;
      this.metrics[provider].receivedToday = 0;
    }
    this.broadcast();
  }

  getMetrics() {
    const nextRunAt = getNextScraperRunAt().toISOString();

    return Object.values(this.metrics).map((metric) => ({
      ...metric,
      lastProcessed: metric.lastFinishedAt || metric.lastStartedAt,
      nextRunAt,
      scheduleLabel: metric.scheduleLabel || SCRAPER_ALLOWED_TIMES_LABEL,
      intervalMinutes: metric.intervalMinutes || SCRAPER_INTERVAL_MINUTES,
    }));
  }

  private broadcast() {
    if (this.wsGateway.server) {
      this.wsGateway.server
        .to('SCRAPER')
        .emit('SCRAPER_STATUS_UPDATE', this.getMetrics());
    }
  }
}
