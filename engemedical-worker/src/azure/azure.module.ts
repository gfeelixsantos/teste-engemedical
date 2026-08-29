import { forwardRef, Module } from '@nestjs/common';

import { PdfmakeModule } from 'src/pdfmake/pdfmake.module';
import { MongoModule } from 'src/mongo/mongo.module';
import { AzurePdfWorkerService } from './workers/azure.pdf.service';
import { AzureEmailWorkerService } from './workers/azure.email.service';
import { NodmailerModule } from 'src/nodemailer/nodemailer.module';
import { AzureBlobService } from './AzureBlob.service';
import { SocModule } from 'src/soc/soc.module';
import { AzureSocgedWorkerService } from './workers/azure.socged.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { SignatureModule } from 'src/signature/signature.module';
import { AzureQueueService } from './azure-queue.service';
import { AzureAsoEnrichmentWorkerService } from './workers/azure-aso-enrichment.service';
import { AzureGedBatchWorkerService } from './workers/azure.ged-batch.service';
import { AzureExamEnrichmentWorkerService } from './workers/azure-exam-enrichment.service';
import { AzureCustomerEmailCampaignWorkerService } from './workers/azure.customer-email-campaign.service';

@Module({
  imports: [
    PdfmakeModule,
    forwardRef(() => MongoModule),
    NodmailerModule,
    SocModule,
    SupabaseModule,
    SignatureModule,
  ],
  providers: [
    AzurePdfWorkerService,
    AzureEmailWorkerService,
    AzureBlobService,
    AzureSocgedWorkerService,
    AzureQueueService,
    AzureAsoEnrichmentWorkerService,
    AzureGedBatchWorkerService,
    AzureExamEnrichmentWorkerService,
    AzureCustomerEmailCampaignWorkerService,
  ],
  exports: [AzurePdfWorkerService, AzureQueueService, AzureBlobService],
})
export class AzureModule {}
