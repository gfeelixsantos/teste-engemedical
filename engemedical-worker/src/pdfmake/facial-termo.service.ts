import { Injectable, Logger } from '@nestjs/common';
import { TermoConsentimentoService } from './termo-consentimento.service';
import {
  TermoFacialInput,
  TermoFacialOutput,
  TermoFacialOutputWithUpload,
} from './facial-termo.types';
import { TermoConsentimentoInput } from './termo-consentimento.types';

@Injectable()
export class FacialTermoService {
  private readonly logger = new Logger(FacialTermoService.name);

  constructor(
    private readonly consentimentoService: TermoConsentimentoService,
  ) {}

  async gerar(
    input: TermoFacialInput,
  ): Promise<TermoFacialOutput | TermoFacialOutputWithUpload> {
    const unifiedInput = this.mapToConsentimento(input);
    const result = await this.consentimentoService.gerar(unifiedInput);

    if ('url' in result) {
      return {
        url: result.url,
        blobPath: result.blobPath,
        documentHash: result.documentHash,
        relatorioEvidenciasUrl: result.relatorioEvidenciasUrl,
        relatorioEvidenciasHash: result.relatorioEvidenciasHash,
      };
    }

    return {
      buffer: result.buffer,
      contentType: 'application/pdf',
      filename: result.filename,
      documentHash: result.documentHash,
    };
  }

  private mapToConsentimento(input: TermoFacialInput): TermoConsentimentoInput {
    return {
      tipo: 'FACIAL',
      requestId: input.requestId,
      versaoTermo: input.versaoTermo,
      validadeDias: input.validadeDias,
      validadeAte: input.validadeAte,
      funcionario: input.funcionario,
      empresa: input.empresa,
      clinica: input.clinica,
      atendimento: input.atendimento,
      lgpd: input.lgpd,
      operador: input.operador,
      relatorioEvidenciasProviderUrl: input.facial.relatorioEvidenciasUrl,
      relatorioEvidenciasHash: input.facial.relatorioEvidenciasHash,
      facial: {
        provider: input.facial.provider,
        sessionId: input.facial.sessionId,
        transactionId: input.facial.transactionId,
      },
    };
  }
}
