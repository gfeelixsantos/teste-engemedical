import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface IPscSession {
  id?: string;
  user_codigo: string;
  user_cpf?: string;
  user_nome?: string;
  user_perfil?: string;
  conselho?: string;
  ufconselho?: string;
  state: string;
  psc_name: string;
  signature_session: string;
  integra_url?: string;
  is_authorized: boolean;
  created_at?: string;
  updated_at?: string;
  expires_in: number;
  expires_at: string;
  consumed_at?: string;
  invalid_reason?: string;
}

@Injectable()
export class PscSessionRepository {
  private readonly logger = new Logger(PscSessionRepository.name);
  private readonly TABLE_NAME = 'psc_sessions';

  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async createOrReplaceSession(session: IPscSession): Promise<IPscSession> {
    // Invalidate previous active sessions for this user
    await this.client
      .from(this.TABLE_NAME)
      .update({ invalid_reason: 'Replaced by new session' })
      .eq('user_codigo', session.user_codigo)
      .is('invalid_reason', null)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString());

    const { data, error } = await this.client
      .from(this.TABLE_NAME)
      .insert(session)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating session: ${error.message}`, error);
      throw new Error(`Failed to create session: ${error.message}`);
    }
    return data;
  }

  async findByState(state: string): Promise<IPscSession | null> {
    const { data, error } = await this.client
      .from(this.TABLE_NAME)
      .select('*')
      .eq('state', state)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error(`Error finding session by state: ${error.message}`);
    }
    return data;
  }

  async findValidAuthorizedSessionByUserCodigo(
    userCodigo: string,
  ): Promise<IPscSession | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from(this.TABLE_NAME)
      .select('*')
      .eq('user_codigo', userCodigo)
      .eq('is_authorized', true)
      .gt('expires_at', now)
      .is('consumed_at', null)
      .is('invalid_reason', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error(`Error finding valid session: ${error.message}`);
    }
    return data;
  }

  async authorizeByState(state: string): Promise<void> {
    const { error } = await this.client
      .from(this.TABLE_NAME)
      .update({ is_authorized: true })
      .eq('state', state)
      .is('invalid_reason', null);

    if (error) {
      this.logger.error(`Error authorizing session: ${error.message}`);
      throw error;
    }
  }

  async invalidateByUserCodigo(
    userCodigo: string,
    reason: string,
  ): Promise<void> {
    const { error } = await this.client
      .from(this.TABLE_NAME)
      .update({ invalid_reason: reason, consumed_at: new Date().toISOString() })
      .eq('user_codigo', userCodigo)
      .is('invalid_reason', null);

    if (error) {
      this.logger.error(`Error invalidating session: ${error.message}`);
    }
  }

  async markConsumed(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.TABLE_NAME)
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      this.logger.error(`Error marking session consumed: ${error.message}`);
    }
  }
}
