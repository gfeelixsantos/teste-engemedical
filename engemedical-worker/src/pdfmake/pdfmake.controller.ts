import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PdfmakeService } from './pdfmake.service';
import { BiometriaTermoService } from './biometria-termo.service';
import { TermoBiometriaInput } from './biometria-termo.types';
import { FacialTermoService } from './facial-termo.service';
import { TermoFacialInput } from './facial-termo.types';
import { AsoWorkerService } from './aso-worker.service';
import { WorkerAsoInput } from './aso-worker.types';
import { TermoConsentimentoService } from './termo-consentimento.service';
import { TermoConsentimentoInput } from './termo-consentimento.types';

@Controller()
export class PdfmakeController {
  constructor(
    private readonly pdfmakeService: PdfmakeService,
    private readonly biometriaTermoService: BiometriaTermoService,
    private readonly facialTermoService: FacialTermoService,
    private readonly asoWorkerService: AsoWorkerService,
    private readonly termoConsentimentoService: TermoConsentimentoService,
  ) {}

  private assertInternalAuth(token?: string) {
    const expected = String(process.env.INTERNAL_WORKER_TOKEN || '').trim();
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Token interno invalido');
    }
  }

  @Post('pdfmake/biometria/termo')
  async gerarTermoBiometria(
    @Headers('x-internal-token') token: string | undefined,
    @Body() body: TermoBiometriaInput,
  ) {
    this.assertInternalAuth(token);

    const result = await this.biometriaTermoService.gerar(body);

    if ('url' in result) {
      return {
        mode: 'uploaded' as const,
        url: result.url,
        blobPath: result.blobPath,
        documentHash: result.documentHash,
        ...(result.relatorioEvidenciasUrl
          ? { relatorioEvidenciasUrl: result.relatorioEvidenciasUrl }
          : {}),
        ...(result.relatorioEvidenciasHash
          ? { relatorioEvidenciasHash: result.relatorioEvidenciasHash }
          : {}),
      };
    }

    return {
      mode: 'inline' as const,
      filename: result.filename,
      contentType: result.contentType,
      bufferBase64: result.buffer.toString('base64'),
      documentHash: result.documentHash,
    };
  }

  @Post('pdfmake/facial/termo')
  async gerarTermoFacial(
    @Headers('x-internal-token') token: string | undefined,
    @Body() body: TermoFacialInput,
  ) {
    this.assertInternalAuth(token);

    const result = await this.facialTermoService.gerar(body);

    if ('url' in result) {
      return {
        mode: 'uploaded' as const,
        url: result.url,
        blobPath: result.blobPath,
        documentHash: result.documentHash,
        ...(result.relatorioEvidenciasUrl
          ? { relatorioEvidenciasUrl: result.relatorioEvidenciasUrl }
          : {}),
        ...(result.relatorioEvidenciasHash
          ? { relatorioEvidenciasHash: result.relatorioEvidenciasHash }
          : {}),
      };
    }

    return {
      mode: 'inline' as const,
      filename: result.filename,
      contentType: result.contentType,
      bufferBase64: result.buffer.toString('base64'),
      documentHash: result.documentHash,
    };
  }

  @Post('pdfmake/termo-consentimento')
  async gerarTermoConsentimento(
    @Headers('x-internal-token') token: string | undefined,
    @Body() body: TermoConsentimentoInput,
  ) {
    this.assertInternalAuth(token);

    const result = await this.termoConsentimentoService.gerar(body);

    if ('url' in result) {
      return {
        mode: 'uploaded' as const,
        url: result.url,
        blobPath: result.blobPath,
        documentHash: result.documentHash,
        ...(result.relatorioEvidenciasUrl
          ? { relatorioEvidenciasUrl: result.relatorioEvidenciasUrl }
          : {}),
        ...(result.relatorioEvidenciasHash
          ? { relatorioEvidenciasHash: result.relatorioEvidenciasHash }
          : {}),
      };
    }

    return {
      mode: 'inline' as const,
      filename: result.filename,
      contentType: result.contentType,
      bufferBase64: result.buffer.toString('base64'),
      documentHash: result.documentHash,
    };
  }

  @Post('pdfmake/aso/autenticacao-atendimento')
  async gerarAsoDigital(
    @Headers('x-internal-token') token: string | undefined,
    @Body() body: WorkerAsoInput,
  ) {
    this.assertInternalAuth(token);

    const result = await this.asoWorkerService.gerar(body);

    return {
      status: 'success',
      url: result.url,
      blobPath: result.blobPath,
      documentHash: result.documentHash,
      filename: result.filename,
    };
  }
}
