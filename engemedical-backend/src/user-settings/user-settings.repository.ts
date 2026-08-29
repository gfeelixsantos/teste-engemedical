import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IUserSettings } from './user-settings.interface';

@Injectable()
export class UserSettingsRepository {
  private readonly logger = new Logger(UserSettingsRepository.name);
  private readonly TABLE_NAME = 'user_settings';

  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async findByUserCodigo(userCodigo: string): Promise<IUserSettings | null> {
    const { data, error } = await this.client
      .from(this.TABLE_NAME)
      .select('*')
      .eq('user_codigo', userCodigo)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error(`Error finding user settings: ${error.message}`);
    }
    return data;
  }

  async upsert(settings: IUserSettings): Promise<IUserSettings> {
    const { data, error } = await this.client
      .from(this.TABLE_NAME)
      .upsert(
        {
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_codigo' },
      )
      .select()
      .single();

    if (error) {
      this.logger.error(`Error upserting user settings: ${error.message}`);
      throw new Error(`Failed to upsert user settings: ${error.message}`);
    }
    return data;
  }
}
