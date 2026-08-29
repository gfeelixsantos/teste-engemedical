import { forwardRef, Module } from '@nestjs/common';
import { PdfmakeService } from './pdfmake.service';
import { PdfmakeController } from './pdfmake.controller';
import { BiometriaTermoService } from './biometria-termo.service';
import { FacialTermoService } from './facial-termo.service';
import { AsoWorkerService } from './aso-worker.service';
import { TermoConsentimentoService } from './termo-consentimento.service';
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
  ],
  exports: [
    PdfmakeService,
    BiometriaTermoService,
    FacialTermoService,
    AsoWorkerService,
    TermoConsentimentoService,
  ],
})
export class PdfmakeModule {}
