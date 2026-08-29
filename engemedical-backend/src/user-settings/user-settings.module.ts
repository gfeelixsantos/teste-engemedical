import { Module } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';
import { UserSettingsRepository } from './user-settings.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { PscModule } from '../psc/psc.module';
import { SignatureModule } from '../signature/signature.module';
import { SocModule } from '../soc/soc.module';

@Module({
  imports: [SupabaseModule, PscModule, SignatureModule, SocModule],
  providers: [UserSettingsService, UserSettingsRepository],
  controllers: [UserSettingsController],
  exports: [UserSettingsService, UserSettingsRepository],
})
export class UserSettingsModule {}
