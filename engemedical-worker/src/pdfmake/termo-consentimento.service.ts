import { Injectable, Logger, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import * as pdfMake from 'pdfmake/build/pdfmake';
import axios from 'axios';
import { AzureBlobService } from '../azure/AzureBlob.service';
import {
  TermoConsentimentoInput,
  TermoConsentimentoOutput,
  TermoConsentimentoOutputWithUpload,
  buildValidationBlobPath,
} from './termo-consentimento.types';
import { gerarTermoConsentimento } from './templates/termoConsentimento';
import { gerarEvidenciaBiometria } from './templates/evidenciaBiometria';

import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

@Injectable()
export class TermoConsentimentoService {
  private readonly logger = new Logger(TermoConsentimentoService.name);

  constructor(@Optional() private readonly azureBlob?: AzureBlobService) {}

  async gerar(
    input: TermoConsentimentoInput,
  ): Promise<TermoConsentimentoOutput | TermoConsentimentoOutputWithUpload> {
    this.validarInput(input);

    const enrichedInput = await this.enrichInput(input);
    const documentHash = this.computarHash(enrichedInput);

    const predictedUrl = this.predictRelatorioEvidenciasUrl(enrichedInput);
    if (predictedUrl) {
      enrichedInput.relatorioEvidenciasUrl = predictedUrl;
    } else {
      enrichedInput.relatorioEvidenciasUrl = undefined;
      this.logger.warn(
        `relatorioEvidenciasUrl nao disponivel para requestId=${enrichedInput.requestId} - QR code nao sera renderizado`,
      );
    }

    let evidenceBuffer: Buffer | null = null;
    if (this.azureBlob && enrichedInput.tipo === 'BIOMETRIA') {
      evidenceBuffer = await gerarEvidenciaBiometria(enrichedInput, documentHash);
    }

    let relatorioEvidenciasUrl = predictedUrl || undefined;
    let relatorioEvidenciasHash: string | undefined;
    const providerRelatorioUrl = String(
      input.relatorioEvidenciasProviderUrl || '',
    ).trim();

    if (this.azureBlob && enrichedInput.tipo === 'BIOMETRIA' && evidenceBuffer) {
      try {
        const evidenceUpload = await this.uploadBiometriaEvidenceReport(
          enrichedInput,
          evidenceBuffer,
        );
        relatorioEvidenciasUrl = evidenceUpload.url;
        relatorioEvidenciasHash = evidenceUpload.hash;
      } catch (err) {
        this.logger.error(
          `Falha ao salvar relatorio de evidencias biometrico requestId=${enrichedInput.requestId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    } else if (enrichedInput.tipo === 'BIOMETRIA' && !evidenceBuffer) {
      this.logger.warn(
        `Relatorio de evidencias biometrico nao gerado requestId=${enrichedInput.requestId}`,
      );
    }

    const docDefinition = await gerarTermoConsentimento(enrichedInput, documentHash);
    const buffer = await this.generatePdfBuffer(docDefinition);
    const filename = this.gerarFilename(enrichedInput);

    if (input.forceInline) {
      this.logger.warn(
        `forceInline ativo para requestId=${enrichedInput.requestId} - retornando buffer sem upload`,
      );
      return { buffer, contentType: 'application/pdf', filename, documentHash };
    }

    if (this.azureBlob) {
      try {
        const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';
        const termoBlobPath = this.gerarTermoBlobPath(enrichedInput, filename);
        const url = await this.azureBlob.uploadPublic(publicContainer, termoBlobPath, buffer);

        if (enrichedInput.tipo === 'FACIAL' && predictedUrl && providerRelatorioUrl) {
          try {
            const evidenceUpload = await this.uploadFacialEvidenceReport(
              enrichedInput,
              providerRelatorioUrl,
            );
            relatorioEvidenciasUrl = evidenceUpload.url;
            relatorioEvidenciasHash = evidenceUpload.hash;
          } catch (err) {
            this.logger.warn(
              `Falha ao salvar relatorio de evidencias facial requestId=${enrichedInput.requestId}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        }

        this.logger.log(
          `Termo de consentimento upload concluido: tipo=${enrichedInput.tipo} requestId=${enrichedInput.requestId} url=${url}`,
        );

        const output: TermoConsentimentoOutputWithUpload = {
          url,
          blobPath: termoBlobPath,
          documentHash,
        };

        if (relatorioEvidenciasUrl) {
          output.relatorioEvidenciasUrl = relatorioEvidenciasUrl;
        }
        if (relatorioEvidenciasHash) {
          output.relatorioEvidenciasHash = relatorioEvidenciasHash;
        }

        return output;
      } catch (err) {
        this.logger.error(
          `Falha no upload do termo de consentimento para blob, retornando buffer: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return { buffer, contentType: 'application/pdf', filename, documentHash };
  }

  private async generatePdfBuffer(docDefinition: any): Promise<Buffer> {
    const pdfDoc = pdfMake.createPdf(docDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buf) => {
        if (buf) resolve(Buffer.from(buf));
        else reject(new Error('Falha ao gerar buffer do PDF'));
      });
    });
  }

  private resolveEvidenceBlobPath(input: TermoConsentimentoInput): string {
    const prontuario =
      String(
        input.atendimento.prontuarioId ||
          input.atendimento.schedulingId ||
          input.requestId,
      ).trim() || 'sem-prontuario';
    return buildValidationBlobPath(prontuario);
  }

  private async uploadBiometriaEvidenceReport(
    input: TermoConsentimentoInput,
    evidenceBuffer: Buffer,
  ): Promise<{ url: string; hash: string }> {
    const evidenceBlobPath = this.resolveEvidenceBlobPath(input);
    const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';
    const url = await this.azureBlob!.uploadPublic(
      publicContainer,
      evidenceBlobPath,
      evidenceBuffer,
    );
    const hash = crypto
      .createHash('sha256')
      .update(evidenceBuffer)
      .digest('hex');

    this.logger.log(
      `Relatorio de evidencias biometrico salvo: requestId=${input.requestId} evidenceBlobPath=${evidenceBlobPath} bytes=${evidenceBuffer.length}`,
    );

    return { url, hash };
  }

  private async uploadFacialEvidenceReport(
    input: TermoConsentimentoInput,
    providerUrl: string,
  ): Promise<{ url: string; hash: string }> {
    const evidenceBlobPath = this.resolveEvidenceBlobPath(input);
    const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';

    const response = await axios.get(providerUrl, { responseType: 'arraybuffer' });
    const downloaded = Buffer.from(response.data);
    const url = await this.azureBlob!.uploadPublic(
      publicContainer,
      evidenceBlobPath,
      downloaded,
    );
    const hash = crypto
      .createHash('sha256')
      .update(downloaded)
      .digest('hex');

    this.logger.log(
      `Relatorio de evidencias facial baixado e salvo: requestId=${input.requestId} evidenceBlobPath=${evidenceBlobPath} bytes=${downloaded.length}`,
    );

    return { url, hash };
  }

  private async enrichInput(
    input: TermoConsentimentoInput,
  ): Promise<TermoConsentimentoInput> {
    if (input.tipo !== 'BIOMETRIA') return input;

    if (
      input.biometria?.digitalDocumentalPreviewBase64 ||
      !this.azureBlob ||
      !input.biometria?.digitalDocumentalBlobPath
    ) {
      return input;
    }

    try {
      const buffer = await this.azureBlob.download(
        'documents',
        input.biometria.digitalDocumentalBlobPath,
      );

      return {
        ...input,
        biometria: {
          ...input.biometria,
          digitalDocumentalPreviewBase64: `data:image/png;base64,${buffer.toString('base64')}`,
        },
      };
    } catch (err) {
      this.logger.warn(
        `Falha ao carregar imagem documental da biometria para o termo: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return input;
    }
  }

  private predictRelatorioEvidenciasUrl(input: TermoConsentimentoInput): string | null {
    const prontuario =
      String(input.atendimento.prontuarioId || input.atendimento.schedulingId || input.requestId).trim() ||
      'sem-prontuario';
    const blobPath = buildValidationBlobPath(prontuario);
    const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';

    // Retorna a URL pública direta (sem SAS) pois o container é público
    if (this.azureBlob) {
      try {
        return this.azureBlob.getPublicUrl(publicContainer, blobPath);
      } catch { /* fall through */ }
    }

    // Fallback: monta URL direta usando a connection string
    const account = process.env.AZURE_STORAGE_ACCOUNT || 'cmsodocs';
    if (account) {
      return `https://${account}.blob.core.windows.net/${publicContainer}/${blobPath}`;
    }

    this.logger.warn(
      `Nao foi possivel construir relatorioEvidenciasUrl: requestId=${input.requestId} blobPath=${blobPath}`,
    );
    return null;
  }

  private computarHash(input: TermoConsentimentoInput): string {
    const payload = [
      input.requestId,
      input.funcionario.nome,
      input.funcionario.cpfMascarado || input.funcionario.codigo || '',
      input.empresa.nome,
      input.clinica.nome,
      input.atendimento.unidade,
      input.atendimento.dataHora,
      input.versaoTermo,
      input.validadeAte,
    ];

    if (input.tipo === 'FACIAL') {
      payload.push(
        input.facial?.provider || '',
        input.facial?.sessionId || '',
        input.facial?.transactionId || '',
        input.relatorioEvidenciasHash || '',
      );
    } else {
      payload.push(
        input.biometria?.dedo || '',
        input.lgpd.cienciaRegistradaEm,
      );
    }

    return crypto.createHash('sha256').update(payload.join('|')).digest('hex');
  }

  private gerarFilename(input: TermoConsentimentoInput): string {
    const prefix = input.tipo === 'FACIAL' ? 'TERMO_FACIAL' : 'TERMO_BIOMETRIA';
    const name = (input.funcionario.nome || 'funcionario')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toUpperCase();
    const empresa = (input.empresa.nome || 'empresa')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toUpperCase()
      .slice(0, 20);
    const data = new Date(input.lgpd.cienciaRegistradaEm)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');

    return `${prefix}_${empresa}_${name}_${data}.pdf`;
  }

  private gerarTermoBlobPath(
    input: TermoConsentimentoInput,
    _filename: string,
  ): string {
    const prontuario =
      String(input.atendimento.prontuarioId || input.atendimento.schedulingId || input.requestId).trim() ||
      'sem-prontuario';

    // Padrão unificado para FACIAL e BIOMETRIA
    return `autenticacao/${prontuario}/termo-aceite.pdf`;
  }

  validarInput(input: TermoConsentimentoInput): void {
    const erros: string[] = [];

    if (!input?.funcionario?.nome) erros.push('funcionario.nome e obrigatorio');
    if (!input?.empresa?.nome) erros.push('empresa.nome e obrigatorio');
    if (!input?.clinica?.nome) erros.push('clinica.nome e obrigatorio');
    if (!input?.atendimento?.unidade)
      erros.push('atendimento.unidade e obrigatorio');
    if (!input?.atendimento?.dataHora)
      erros.push('atendimento.dataHora e obrigatorio');
    if (!input?.versaoTermo) erros.push('versaoTermo e obrigatorio');
    if (!input?.validadeDias) erros.push('validadeDias e obrigatorio');
    if (!input?.validadeAte) erros.push('validadeAte e obrigatorio');
    if (!input?.lgpd?.cienciaRegistradaEm)
      erros.push('lgpd.cienciaRegistradaEm e obrigatorio');
    if (!input?.lgpd?.cienciaRegistradaPor)
      erros.push('lgpd.cienciaRegistradaPor e obrigatorio');
    if (!input?.lgpd?.baseLegalTexto)
      erros.push('lgpd.baseLegalTexto e obrigatorio');

    if (input.tipo === 'FACIAL') {
      if (!input?.facial?.provider)
        erros.push('facial.provider e obrigatorio');
    } else if (input.tipo === 'BIOMETRIA') {
      if (!input?.biometria?.dedo)
        erros.push('biometria.dedo e obrigatorio');
      if (!input?.biometria?.templateVersion)
        erros.push('biometria.templateVersion e obrigatorio');
      if (!input?.biometria?.templateStorage)
        erros.push('biometria.templateStorage e obrigatorio');
    } else {
      erros.push('tipo deve ser FACIAL ou BIOMETRIA');
    }

    if (erros.length > 0) {
      throw new Error(`Dados insuficientes para gerar termo: ${erros.join('; ')}`);
    }
  }
}
