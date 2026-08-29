import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class ItiValidationService {
  private readonly logger = new Logger(ItiValidationService.name);
  private readonly apiBase = 'https://validar.iti.gov.br';

  private readonly commonHeaders = {
    Origin: 'https://validar.iti.gov.br',
    Referer: 'https://validar.iti.gov.br/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
  };

  async validatePdf(
    pdfBuffer: Buffer,
    fileName: string = 'documento.pdf',
  ): Promise<Buffer> {
    this.logger.log(`Iniciando validação ITI para o arquivo: ${fileName}`);
    let currentStep: 'upload' | 'conformidade' | 'downloadPdf' = 'upload';

    try {
      this.logger.debug('Passo 1: Fazendo upload do PDF para o ITI...');
      const form = new FormData();
      form.append('signature_files[]', pdfBuffer, {
        filename: fileName,
        contentType: 'application/pdf',
      });

      const uploadRes = await axios.post(`${this.apiBase}/arquivo`, form, {
        headers: {
          ...form.getHeaders(),
          ...this.commonHeaders,
        },
        timeout: 60000,
      });

      const uploadPayload = uploadRes.data;
      this.logger.debug('OK: PDF enviado com sucesso.');

      currentStep = 'conformidade';
      this.logger.debug('Passo 2: Processando relatório de conformidade...');
      const conformRes = await axios.post(
        `${this.apiBase}/conformidade`,
        uploadPayload,
        {
          headers: this.commonHeaders,
          timeout: 60000,
        },
      );

      const conformityPayload = conformRes.data;
      this.logger.debug('OK: Relatório processado.');

      currentStep = 'downloadPdf';
      this.logger.debug('Passo 3: Gerando PDF final do ITI...');
      const downloadRes = await axios.post(
        `${this.apiBase}/downloadPdf`,
        {
          data: JSON.stringify(conformityPayload),
          language: 'portuga',
        },
        {
          headers: {
            ...this.commonHeaders,
            Accept: 'application/pdf, application/octet-stream, */*',
            'Content-Type': 'application/json;charset=UTF-8',
          },
          responseType: 'arraybuffer',
          timeout: 60000,
        },
      );

      this.logger.log('Validação ITI concluída com sucesso.');
      return Buffer.from(downloadRes.data);
    } catch (error: any) {
      const baseMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro na validação ITI na etapa ${currentStep}: ${baseMessage}`,
      );

      if (axios.isAxiosError(error) && error.response) {
        const errorDetail = this.formatResponseData(error.response.data);
        this.logger.error(
          `Etapa: ${currentStep} | Status: ${error.response.status} | Detalhe: ${errorDetail}`,
        );
      }

      throw new Error(
        `Falha ao validar documento no portal do ITI na etapa ${currentStep}: ${baseMessage}`,
      );
    }
  }

  private formatResponseData(data: unknown): string {
    if (Buffer.isBuffer(data)) {
      return data.toString('utf-8');
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString('utf-8');
    }

    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer).toString('utf-8');
    }

    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
}
