import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

import { AzureBlobService } from '../azure/AzureBlob.service';
import { ItiValidationService } from '../scrapers/iti-validation.service';
import { AsoMetadata } from './aso-metadata.types';
import { buildOfficialAsoStampText } from './aso-stamp-text';
import { buildBryVerificationReportPdf } from './bry-verification-report';
import { BryClientService, KmsType } from './bry-client.service';
import { hasEmbeddedPdfSignature } from './pdf-signature-markers';

@Injectable()
export class AsoSignatureService {
  private readonly logger = new Logger(AsoSignatureService.name);

  constructor(
    private readonly bryClient: BryClientService,
    private readonly itiService: ItiValidationService,
    private readonly blobService: AzureBlobService,
  ) {}

  async signAndValidate(
    pdfBuffer: Buffer,
    kmsType: KmsType,
    kmsData: any,
    schedulingId: string,
    pacienteNome: string,
    metadata: AsoMetadata,
  ): Promise<{
    signedPdf: Buffer;
    validationUrl: string;
    hasEmbeddedSignature: boolean;
    itiValidationEnabled: boolean;
  }> {
    this.logger.log(
      `[ASO-SIGN-FLOW] Iniciando fluxo de assinatura para ID: ${schedulingId}`,
    );

    const itiValidationEnabled =
      process.env.ASO_ITI_VALIDATION_ENABLED !== 'false';
    let validationUrl = '';
    const { validationBlobPath, predictedValidationUrl } =
      this.buildValidationReportLocation(metadata);

    this.logger.debug(
      '[ASO-SIGN-FLOW] Fase 1: Aplicando carimbo oficial antes da assinatura digital',
    );
    const stampedPdfBuffer = await this.applyOfficialOverlay(
      pdfBuffer,
      itiValidationEnabled ? predictedValidationUrl : '',
      metadata,
      schedulingId,
    );

    this.logger.debug(
      '[ASO-SIGN-FLOW] Fase 2: Assinatura BRy sem representacao visual',
    );
    const signedBuffer = await this.bryClient.signPdfWithKms({
      pdfBuffer: stampedPdfBuffer,
      kmsType,
      kmsData,
      includeVisualRepresentation: false,
    });
    const hasEmbeddedSignature = hasEmbeddedPdfSignature(signedBuffer);

    if (!hasEmbeddedSignature) {
      throw new Error(
        'Documento retornado pela assinatura nao contem marcadores PAdES validos.',
      );
    }

    if (itiValidationEnabled) {
      try {
        const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';

        if (kmsType === 'BRYKMS') {
          this.logger.debug(
            '[ASO-SIGN-FLOW] Fase 3: Obtendo verificacao BRy para o documento assinado',
          );
          const verification = await this.bryClient.verifyPdfSignature(
            signedBuffer,
            `${pacienteNome}_ASO_Assinado.pdf`,
          );

          if (
            verification.generalStatus !== 'VALID' &&
            verification.generalStatus !== 'VALID_WITH_ALERT'
          ) {
            throw new Error(
              `Verificacao BRy invalida para ${schedulingId}: ${verification.generalStatus}`,
            );
          }

          const reportPdf = await buildBryVerificationReportPdf({
            schedulingId,
            pacienteNome,
            prontuario: metadata.prontuario,
            verification,
          });

          validationUrl = await this.blobService.uploadPublic(
            publicContainer,
            validationBlobPath,
            Buffer.from(reportPdf),
          );
          this.logger.log(
            `[ASO-SIGN-FLOW] Relatorio BRy disponivel em: ${validationUrl}`,
          );
        } else {
          this.logger.debug(
            '[ASO-SIGN-FLOW] Fase 3: Obtendo relatorio de conformidade ITI',
          );
          const validationReport = await this.itiService.validatePdf(
            signedBuffer,
            `${pacienteNome}_ASO_Assinado.pdf`,
          );

          validationUrl = await this.blobService.uploadPublic(
            publicContainer,
            validationBlobPath,
            validationReport,
          );
          this.logger.log(
            `[ASO-SIGN-FLOW] Relatorio ITI disponivel em: ${validationUrl}`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const providerLabel = kmsType === 'BRYKMS' ? 'BRy' : 'ITI';
        throw new Error(
          `Validacao ${providerLabel} indisponivel para ${schedulingId}: ${message}`,
        );
      }
    } else {
      this.logger.warn(
        `[ASO-SIGN-FLOW] Validacao ITI desabilitada por configuracao para ${schedulingId}.`,
      );
    }

    return {
      signedPdf: signedBuffer,
      validationUrl,
      hasEmbeddedSignature,
      itiValidationEnabled,
    };
  }

  private buildValidationReportLocation(metadata: AsoMetadata): {
    validationBlobPath: string;
    predictedValidationUrl: string;
  } {
    const validationBlobPath = `autenticacao/${metadata.prontuario}/relatorio-evidencias.pdf`;
    const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';

    return {
      validationBlobPath,
      predictedValidationUrl: this.blobService.getPublicUrl(
        publicContainer,
        validationBlobPath,
      ),
    };
  }

  private async applyOfficialOverlay(
    pdfBuffer: Buffer,
    validationUrl: string,
    metadata: AsoMetadata,
    schedulingId: string,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const firstPage = pdfDoc.getPages()[0];
      const { width } = firstPage.getSize();

      const qrCodeUrl = this.getValidationTargetUrl(validationUrl);
      let qrImage: any = null;

      try {
        const qrCodeBuffer = await this.getQrCodeBuffer(qrCodeUrl);
        qrImage = await pdfDoc.embedPng(qrCodeBuffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `QR Code indisponivel para ${schedulingId}. O carimbo oficial sera mantido sem QR. Motivo: ${message}`,
        );
      }

      const marginX = 40;
      const qrSize = 46;
      const qrY = 29;
      const textX = marginX + qrSize + 15;
      const textWidth = width - marginX * 2 - qrSize - 15;
      const baselineY = qrY + qrSize;
      const stampText = buildOfficialAsoStampText(metadata, schedulingId);

      if (qrImage) {
        firstPage.drawImage(qrImage, {
          x: marginX,
          y: qrY,
          width: qrSize,
          height: qrSize,
        });
      }

      firstPage.drawText(stampText.title, {
        x: textX,
        y: baselineY - 2,
        size: 7.4,
        font: fontBold,
        color: rgb(0.06, 0.06, 0.06),
      });

      firstPage.drawText(stampText.disclaimer, {
        x: textX,
        y: baselineY - 12,
        size: 5.5,
        font: fontRegular,
        maxWidth: textWidth,
        lineHeight: 7,
        color: rgb(0.4, 0.4, 0.4),
      });

      firstPage.drawText(stampText.professionalInfo, {
        x: textX,
        y: baselineY - 26,
        size: 6.6,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      firstPage.drawText(stampText.credentialsInfo, {
        x: textX,
        y: baselineY - 36,
        size: 6,
        font: fontBold,
        color: rgb(0.28, 0.28, 0.28),
      });

      firstPage.drawText(stampText.referenceInfo, {
        x: textX,
        y: baselineY - 47,
        size: 5,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      });

      const savedPdf = await pdfDoc.save();
      return Buffer.from(savedPdf);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha ao aplicar carimbo oficial do ASO: ${message}`);
      return pdfBuffer;
    }
  }

  private getValidationTargetUrl(validationUrl: string): string {
    return String(validationUrl || '').trim();
  }

  private async getQrCodeBuffer(text: string): Promise<Buffer> {
    const targetUrl = this.getValidationTargetUrl(text);

    if (!targetUrl) {
      throw new Error('URL de validacao ausente para gerar QR Code.');
    }

    try {
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        targetUrl,
      )}`;
      const response = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Falha ao obter QR Code oficial do ASO. Motivo: ${message}`,
      );
      throw error;
    }
  }
}
