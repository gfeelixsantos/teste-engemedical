import { Module } from '@nestjs/common';
import { EmailService } from './nodemailer.service';

@Module({
  imports: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class NodmailerModule {}
