import { Module, forwardRef } from '@nestjs/common';
import { BryClientService } from './bry-client.service';
import { ItiValidationService } from '../scrapers/iti-validation.service';
import { AsoSignatureService } from './aso-signature.service';
import { AzureModule } from '../azure/azure.module';

@Module({
  imports: [forwardRef(() => AzureModule)],
  providers: [BryClientService, ItiValidationService, AsoSignatureService],
  exports: [BryClientService, AsoSignatureService],
})
export class SignatureModule {}
