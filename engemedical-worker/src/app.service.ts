import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from './mongo/mongo.service';
import { SupabaseService } from './supabase/supabase.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private consecutiveFailures = 0;
  private readonly failureThreshold = 5;

  constructor(
    private readonly mongoService: MongoService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async checkHealth(): Promise<{ status: string; details: any }> {
    const details = {
      mongo: 'unknown',
      supabase: 'unknown',
    };

    let healthy = true;

    // MongoDB Check
    try {
      if (this.mongoService.isReady && this.mongoService.db) {
        await this.mongoService.db.command({ ping: 1 });
        details.mongo = 'up';
      } else {
        healthy = false;
        details.mongo = 'down (not ready)';
      }
    } catch (err: any) {
      healthy = false;
      details.mongo = `down (${err?.message || 'unknown error'})`;
    }

    // Supabase Check
    try {
      const client = this.supabaseService.getClient();
      const { error } = await client
        .from('user_settings')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        healthy = false;
        details.supabase = `down (${error.message})`;
      } else {
        details.supabase = 'up';
      }
    } catch (err: any) {
      healthy = false;
      details.supabase = `down (${err?.message || 'unknown error'})`;
    }

    if (healthy) {
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
      this.logger.warn(
        `Health check failed. Consecutive failure count: ${this.consecutiveFailures}/${this.failureThreshold}. Details: ${JSON.stringify(details)}`,
      );

      if (this.consecutiveFailures >= this.failureThreshold) {
        this.logger.error(
          `Threshold of ${this.failureThreshold} consecutive failures reached. Exiting process to trigger auto-restart...`,
        );
        setTimeout(() => {
          process.exit(1);
        }, 1000);
      }
    }

    return {
      status: healthy ? 'up' : 'down',
      details,
    };
  }

  getHello(): string {
    return 'Servidor online!';
  }
}
