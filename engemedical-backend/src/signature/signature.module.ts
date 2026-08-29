import { forwardRef, Module } from '@nestjs/common';
import { SignatureService } from './signature.service';
import { NotificationService } from './notification.service';
import { MongoModule } from 'src/mongo/mongo.module';
import { AzureModule } from 'src/azure/azure.module';
import { NodemailerModule } from 'src/nodemailer/nodemailer.module';
import { SocModule } from 'src/soc/soc.module';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { AsoSignatureRetryCronService } from './aso-signature-retry.cron';

@Module({
  imports: [
    forwardRef(() => MongoModule),
    forwardRef(() => AzureModule),
    forwardRef(() => SocModule),
    NodemailerModule,
    SupabaseModule,
  ],
  providers: [
    SignatureService,
    NotificationService,
    AsoSignatureRetryCronService,
  ],
  exports: [
    SignatureService,
    NotificationService,
    AsoSignatureRetryCronService,
  ],
})
export class SignatureModule {}
