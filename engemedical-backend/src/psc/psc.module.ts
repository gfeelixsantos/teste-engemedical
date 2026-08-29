import { Module } from '@nestjs/common';
import { PscSessionService } from './psc-session.service';
import { PscSessionRepository } from '../repositories/psc-session.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { PscAuthController } from './psc-auth.controller';
import { PscAuthService } from './psc-auth.service';
import { SignatureModule } from '../signature/signature.module';

@Module({
  imports: [SupabaseModule, SignatureModule],
  controllers: [PscAuthController],
  providers: [PscSessionService, PscSessionRepository, PscAuthService],
  exports: [PscSessionService, PscSessionRepository, PscAuthService],
})
export class PscModule {}
