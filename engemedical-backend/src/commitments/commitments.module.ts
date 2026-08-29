import { Module } from '@nestjs/common';
import { CommitmentsController } from './commitments.controller';
import { CommitmentsService } from './commitments.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { NodemailerModule } from '../nodemailer/nodemailer.module';

@Module({
  imports: [SupabaseModule, NodemailerModule],
  controllers: [CommitmentsController],
  providers: [CommitmentsService],
  exports: [CommitmentsService],
})
export class CommitmentsModule {}
