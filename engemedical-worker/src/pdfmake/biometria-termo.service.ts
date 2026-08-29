import { Injectable, Logger } from '@nestjs/common';
import { TermoConsentimentoService } from './termo-consentimento.service';
import {
  TermoBiometriaInput,
  TermoBiometriaOutput,
  TermoBiometriaOutputWithUpload,
} from './biometria-termo.types';
import { TermoConsentimentoInput } from './termo-consentimento.types';

@Injectable()
export class BiometriaTermoService {
  private readonly logger = new Logger(BiometriaTermoService.name);

  constructor(
    private readonly consentimentoService: TermoConsentimentoService,
  ) {}

  async gerar(
    input: TermoBiometriaInput,
  ): Promise<TermoBiometriaOutput | TermoBiometriaOutputWithUpload> {
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

  private mapToConsentimento(input: TermoBiometriaInput): TermoConsentimentoInput {
    return {
      tipo: 'BIOMETRIA',
      requestId: input.requestId,
      versaoTermo: input.versaoTermo,
      validadeDias: input.validadeDias,
      validadeAte: input.validadeAte,
      funcionario: input.funcionario,
      empresa: input.empresa,
      clinica: input.clinica,
      atendimento: input.atendimento,
      lgpd: input.lgpd,
      operador: {
        codigo: input.operador?.codigo,
        nome: input.operador?.nome || input.operador?.codigo || 'Sistema',
      },
      relatorioEvidenciasUrl: input.biometria.relatorioEvidenciasUrl,
      biometria: {
        dedo: input.biometria.dedo,
        digitalDocumentalUrl: input.biometria.digitalDocumentalUrl,
        digitalDocumentalBlobPath: input.biometria.digitalDocumentalBlobPath,
        digitalDocumentalPreviewBase64: input.biometria.digitalDocumentalPreviewBase64,
        digitalDocumentalFinalidade: input.biometria.digitalDocumentalFinalidade,
        digitalDocumentalOrigem: input.biometria.digitalDocumentalOrigem,
        templateVersion: input.biometria.templateVersion,
        templateStorage: input.biometria.templateStorage,
      },
    };
  }
}
