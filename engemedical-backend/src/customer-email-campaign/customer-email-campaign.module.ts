import { Module, forwardRef } from '@nestjs/common';
import { CustomerEmailCampaignController } from './customer-email-campaign.controller';
import { CustomerEmailCampaignService } from './customer-email-campaign.service';
import { SocModule } from '../soc/soc.module';
import { AzureModule } from '../azure/azure.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [forwardRef(() => SocModule), AzureModule, SupabaseModule],
  controllers: [CustomerEmailCampaignController],
  providers: [CustomerEmailCampaignService],
  exports: [CustomerEmailCampaignService],
})
export class CustomerEmailCampaignModule {}
