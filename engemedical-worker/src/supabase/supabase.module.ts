import { Module } from '@nestjs/common';
import { EncryptionModule } from '../encryption/encryption.module';
import { SupabaseService } from './supabase.service';

@Module({
  imports: [EncryptionModule],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
