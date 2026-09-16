import { forwardRef, Module } from '@nestjs/common';
import { PdfmakeService } from './pdfmake.service';
import { PdfmakeController } from './pdfmake.controller';
import { BiometriaTermoService } from './biometria-termo.service';
import { FacialTermoService } from './facial-termo.service';
import { AsoWorkerService } from './aso-worker.service';
import { TermoConsentimentoService } from './termo-consentimento.service';
import { PuppeteerService } from './puppeteer.service';
import { HtmlPdfService } from './html-pdf.service';
import { AzureModule } from 'src/azure/azure.module';

@Module({
  imports: [forwardRef(() => AzureModule)],
  controllers: [PdfmakeController],
  providers: [
    PdfmakeService,
    BiometriaTermoService,
    FacialTermoService,
    AsoWorkerService,
    TermoConsentimentoService,
    PuppeteerService,
    HtmlPdfService,
  ],
  exports: [
    PdfmakeService,
    BiometriaTermoService,
    FacialTermoService,
    AsoWorkerService,
    TermoConsentimentoService,
    PuppeteerService,
    HtmlPdfService,
  ],
})
export class PdfmakeModule {}
