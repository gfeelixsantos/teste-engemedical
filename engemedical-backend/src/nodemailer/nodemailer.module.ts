import { forwardRef, Module } from '@nestjs/common';
import { EmailService } from './nodemailer.service';
import { AzureModule } from '../azure/azure.module';

@Module({
  imports: [forwardRef(() => AzureModule)],
  providers: [EmailService],
  exports: [EmailService],
})
export class NodemailerModule {}
