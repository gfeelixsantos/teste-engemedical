import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ObjectId } from 'mongodb';
import * as crypto from 'crypto';
import { Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import { AzureService } from 'src/azure/azure.service';
import { parseAuthUserHeader } from 'src/core/professional-identity.resolver';
import { AtendimentoAuthService } from 'src/atendimento-auth/atendimento-auth.service';
import { MongoService } from 'src/mongo/mongo.service';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { FacialService } from './facial.service';
import { resolveWorkerBaseUrl } from 'src/utils/worker-base-url.util';

type SessionRequestBody = {
  schedulingId: string;
  funcionarioId: string;
  signerName?: string;
  signerEmail?: string;
  cpf?: string;
};

type FinalizeRequestBody = {
  schedulingId: string;
  requestId: string;
  documentNonce: string;
};

type WorkerTermoResponse =
  | {
      mode: 'uploaded';
      url: string;
      blobPath: string;
      documentHash: string;
    }
  | {
      mode: 'inline';
      filename: string;
      contentType: string;
      bufferBase64: string;
      documentHash: string;
    };

@Controller('facial')
export class FacialController {
  private readonly logger = new Logger(FacialController.name);

  constructor(
    private readonly facialService: FacialService,
    private readonly mongoService: MongoService,
    private readonly atendimentoAuthService: AtendimentoAuthService,
    private readonly azureService: AzureService,
  ) {}

  @Post('session')
  async createSession(
    @Body() body: SessionRequestBody,
    @Headers('x-auth-user') authUserHeader?: string,
    @Headers('x-app-origin') appOriginHeader?: string,
  ) {
    if (!body?.schedulingId) {
      throw new BadRequestException('schedulingId e obrigatorio.');
    }

    const scheduling = await this.getSchedulingOrThrow(body.schedulingId);
    const authUser = parseAuthUserHeader(authUserHeader);
    const cpf = String(body.cpf || scheduling.CPFFUNCIONARIO || '').replace(
      /\D/g,
      '',
    );

    if (cpf.length !== 11) {
      throw new BadRequestException(
        'CPF invalido ou ausente para autenticacao facial.',
      );
    }

    const termo = await this.generateFacialTermoDocument({
      scheduling,
      operadorCodigo: authUser?.codigo,
      operadorNome: authUser?.nome,
      signerEmail:
        body.signerEmail || 'esocial@cmsocupacional.com.br',
      appOrigin: appOriginHeader,
    });

    let session;

    try {
      session = await this.facialService.createSignatureSession({
        documentBase64: termo.buffer.toString('base64'),
        documentName: termo.filename,
        signerName: body.signerName || scheduling.NOME,
        signerEmail:
          body.signerEmail || 'esocial@cmsocupacional.com.br',
        personalIdentifier: cpf,
        personalIdentifierType: 'CPF',
        signaturePage: termo.pageCount,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Falha ao criar sessao facial no BRy.';

      throw new BadGatewayException({
        message: 'Falha ao criar sessao facial no BRy.',
        detail: message,
      });
    }

    await this.atendimentoAuthService.registerAuthValidation(body.schedulingId, {
      schedulingId: body.schedulingId,
      metodo: 'FACIAL',
      status: 'PENDENTE',
      requestId: session.requestId,
      validadoPor: authUser?.codigo || authUser?.nome || null,
      facial: {
        provider: 'BRY_SIGN',
        sessionId: session.requestId,
        transactionId: session.documentNonce,
      },
    });

    return {
      requestId: session.requestId,
      documentNonce: session.documentNonce,
      signatureLink: session.signatureLink,
      positioningMode: session.positioningModeUsed,
    };
  }

  @Get('status/:requestId')
  async getStatus(@Param('requestId') requestId: string) {
    if (!requestId) {
      throw new BadRequestException('requestId e obrigatorio.');
    }

    return this.facialService.getSignatureStatus(requestId);
  }

  @Get('evidencias/:requestId')
  async getEvidenceReportRedirect(
    @Param('requestId') requestId: string,
    @Res() response: Response,
  ) {
    if (!requestId) {
      throw new BadRequestException('requestId e obrigatorio.');
    }

    const scheduling = await this.mongoService.schedulingsCollection.findOne(
      {
        'AUTENTICACAOATENDIMENTO.requestId': requestId,
      } as any,
      {
        projection: {
          CODIGOPRONTUARIO: 1,
          AUTENTICACAOATENDIMENTO: 1,
        },
      } as any,
    );

    if (!scheduling) {
      throw new NotFoundException(
        `Evidencia facial nao encontrada para requestId=${requestId}`,
      );
    }

    const auth = (scheduling as any)?.AUTENTICACAOATENDIMENTO;
    const prontuario =
      String((scheduling as any)?.CODIGOPRONTUARIO || '').trim() ||
      requestId;

    if (auth?.status !== 'VALIDADO') {
      response.status(202).type('html').send(`
        <html>
          <head><title>Relatorio de evidencias</title></head>
          <body style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937;">
            <h2 style="color: #114E34;">Relatorio de evidencias em processamento</h2>
            <p>O relatorio desta autenticacao ainda nao foi disponibilizado.</p>
            <p>Tente novamente em alguns instantes.</p>
          </body>
        </html>
      `);
      return;
    }

    // Obter o blob path padronizado
    const metodo = auth?.metodo || 'FACIAL';
    const blobPath = metodo === 'BIOMETRIA'
      ? `autenticacao/${prontuario}/relatorio-evidencias.pdf`
      : this.buildFacialEvidencePath(prontuario);

    // Redirecionar diretamente para a URL pública (sem SAS)
    const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';
    const publicUrl = this.azureService.getPublicUrl(publicContainer, blobPath);

    response.redirect(publicUrl);
  }

  @Post('finalize')
  async finalizeSession(
    @Body() body: FinalizeRequestBody,
    @Headers('x-auth-user') authUserHeader?: string,
    @Headers('x-app-origin') appOriginHeader?: string,
  ) {
    if (!body?.schedulingId || !body?.requestId || !body?.documentNonce) {
      throw new BadRequestException(
        'schedulingId, requestId e documentNonce sao obrigatorios.',
      );
    }

    const authUser = parseAuthUserHeader(authUserHeader);
    const scheduling = await this.getSchedulingOrThrow(body.schedulingId);
    const status = await this.facialService.getSignatureStatus(body.requestId);

    if (!status.isComplete) {
      throw new ConflictException(
        'A assinatura facial ainda nao foi concluida.',
      );
    }

    const [signedDocument, evidenceReport] = await Promise.all([
      this.facialService.getSignedDocument(body.requestId, body.documentNonce),
      this.facialService.getEvidenceReport(body.requestId, body.documentNonce),
    ]);

    const signedUpload = await this.uploadFacialPdf(
      scheduling,
      signedDocument,
      'TERMO_FACIAL_ASSINADO',
    );
    const reportUpload = await this.uploadFacialPdf(
      scheduling,
      evidenceReport,
      'RELATORIO_FACIAL_EVIDENCIAS',
    );

    await this.atendimentoAuthService.registerAuthValidation(body.schedulingId, {
      schedulingId: body.schedulingId,
      metodo: 'FACIAL',
      status: 'VALIDADO',
      requestId: body.requestId,
      validadoEm: new Date().toISOString(),
      validadoPor: authUser?.codigo || authUser?.nome || 'SISTEMA',
      facial: {
        provider: 'BRY_SIGN',
        sessionId: body.requestId,
        transactionId: body.documentNonce,
        imagemRepresentativaUrl: null,
        imagemRepresentativaHash: null,
        confidence: null,
      },
      evidencias: {
        termoCienciaUrl: signedUpload.url,
        termoCienciaHash: signedUpload.hash,
        relatorioEvidenciasUrl: reportUpload.url,
        relatorioEvidenciasHash: reportUpload.hash,
      },
    });

    return {
      success: true,
      requestId: body.requestId,
      documentNonce: body.documentNonce,
      termoCienciaUrl: signedUpload.url,
      relatorioEvidenciasUrl: reportUpload.url,
    };
  }

  private async getSchedulingOrThrow(
    schedulingId: string,
  ): Promise<SchedulingDocument> {
    if (!ObjectId.isValid(schedulingId)) {
      throw new BadRequestException('schedulingId invalido.');
    }

    const scheduling = await this.mongoService.schedulingsCollection.findOne(
      { _id: new ObjectId(schedulingId) } as any,
      {
        projection: {
          NOME: 1,
          CPFFUNCIONARIO: 1,
          CODIGOPRONTUARIO: 1,
          CODIGOEMPRESA: 1,
          NOMEEMPRESA: 1,
          UNIDADEATENDIMENTO: 1,
          CODIGO: 1,
        },
      } as any,
    );

    if (!scheduling) {
      throw new NotFoundException(
        `Scheduling nao encontrado: ${schedulingId}`,
      );
    }

    return scheduling as unknown as SchedulingDocument;
  }

  private async generateFacialTermoDocument(params: {
    scheduling: SchedulingDocument;
    operadorCodigo?: string;
    operadorNome?: string;
    signerEmail: string;
    appOrigin?: string;
  }): Promise<{
    buffer: Buffer;
    filename: string;
    documentHash: string;
    pageCount: number;
  }> {
    const workerBaseUrl = this.resolveWorkerBaseUrl();
    const workerToken = String(process.env.INTERNAL_WORKER_TOKEN || '').trim();

    if (!workerBaseUrl || !workerToken) {
      throw new BadRequestException(
        'Worker interno nao configurado para gerar termo facial.',
      );
    }

    const requestId = `facial_termo_${new ObjectId().toString()}`;
    const payload = {
      requestId,
      versaoTermo: 'v1.1',
      validadeDias: 365,
      validadeAte: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      funcionario: {
        nome: params.scheduling.NOME || 'FUNCIONARIO NAO IDENTIFICADO',
        cpfMascarado: this.maskCpf(params.scheduling.CPFFUNCIONARIO),
        codigo: params.scheduling.CODIGO,
        email: params.signerEmail,
      },
      empresa: {
        nome: params.scheduling.NOMEEMPRESA || 'EMPRESA NAO IDENTIFICADA',
      },
      clinica: {
        nome:
          String(process.env.BIOMETRIA_TERMO_CLINICA_NOME || '').trim() ||
          'CENTRO MEDICO DE SAUDE OCUPACIONAL S/S LTDA',
        cnpj:
          String(process.env.BIOMETRIA_TERMO_CLINICA_CNPJ || '').trim() ||
          '06.900.766/0001-09',
        enderecoCompleto:
          String(process.env.BIOMETRIA_TERMO_CLINICA_ENDERECO || '').trim() ||
          'Rua 2, 635 - Saude - Rio Claro/SP - CEP 13500-312',
        contatoDpo:
          String(process.env.BIOMETRIA_TERMO_CONTATO_DPO || '').trim() ||
          'tecnologia@cmsocupacional.com.br',
        cnae:
          String(process.env.BIOMETRIA_TERMO_CLINICA_CNAE || '').trim() ||
          undefined,
        site:
          String(process.env.BIOMETRIA_TERMO_CLINICA_SITE || '').trim() ||
          undefined,
        telefone:
          String(process.env.BIOMETRIA_TERMO_CLINICA_TELEFONE || '').trim() ||
          '19 3525-6269',
      },
      atendimento: {
        schedulingId: String(params.scheduling._id),
        prontuarioId: params.scheduling.CODIGOPRONTUARIO,
        unidade:
          params.scheduling.UNIDADEATENDIMENTO || 'UNIDADE NAO IDENTIFICADA',
        dataHora: new Date().toISOString(),
      },
      facial: {
        provider: 'BRY_SIGN',
      },
      lgpd: {
        baseLegalCode: 'PROTECAO_DA_SAUDE',
        baseLegalTexto:
          'Protecao da saude (art. 11, II, "c", LGPD) e obrigacao legal/regulatoria (art. 11, II, "a", LGPD) - atendimento ocupacional.',
        finalidade: 'VALIDACAO_IDENTIDADE_ATENDIMENTO_OCUPACIONAL',
        cienciaRegistradaEm: new Date().toISOString(),
        cienciaRegistradaPor:
          params.operadorCodigo || params.operadorNome || 'SISTEMA',
        alternativaDisponivel: true,
        dpoIdentificacao:
          String(process.env.BIOMETRIA_TERMO_DPO_IDENTIFICACAO || '').trim() ||
          undefined,
        armazenamentoRegiao:
          String(process.env.BIOMETRIA_TERMO_ARMAZENAMENTO_REGIAO || '').trim() ||
          undefined,
        armazenamentoNuvem:
          String(process.env.BIOMETRIA_TERMO_ARMAZENAMENTO_NUVEM || '').trim() ||
          undefined,
        retencaoDocumentalAnos:
          Number(process.env.BIOMETRIA_TERMO_RETENCAO_DOCUMENTAL_ANOS) ||
          undefined,
        retencaoLogsAnos:
          Number(process.env.BIOMETRIA_TERMO_RETENCAO_LOGS_ANOS) || undefined,
      },
      operador: {
        codigo: params.operadorCodigo,
        nome: params.operadorNome,
      },
    };

    const requestWorkerTermo = async (forceInline = false) => {
      let fetchResponse: any;

      try {
        fetchResponse = await fetch(`${workerBaseUrl}/pdfmake/facial/termo`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-internal-token': workerToken,
          },
          body: JSON.stringify({
            ...payload,
            ...(forceInline ? { forceInline: true } : {}),
          }),
        });
      } catch {
        throw new BadGatewayException(
          'O serviço de geração de documentos (Worker) está offline ou indisponível no momento.',
        );
      }

      if (!fetchResponse.ok) {
        throw new BadRequestException(
          `Falha ao gerar termo facial no worker: HTTP_${fetchResponse.status}`,
        );
      }

      return (await fetchResponse.json()) as WorkerTermoResponse;
    };

    const buildInlineResult = async (result: Extract<WorkerTermoResponse, { mode: 'inline' }>) => {
      const buffer = Buffer.from(result.bufferBase64, 'base64');
      const pdfDoc = await PDFDocument.load(buffer);
      return {
        buffer,
        filename: result.filename,
        documentHash: result.documentHash,
        pageCount: pdfDoc.getPageCount(),
      };
    };

    const isMissingBlobError = (error: unknown) => {
      const err = error as { statusCode?: number; code?: string; message?: string };
      return (
        err?.statusCode === 404 ||
        err?.code === 'BlobNotFound' ||
        String(err?.message || '').includes('The specified blob does not exist')
      );
    };

    const result = await requestWorkerTermo(false);

    if (result.mode === 'inline') {
      return buildInlineResult(result);
    }

    try {
      const downloadedBuffer = await this.azureService.downloadBlob(result.url);
      const pdfDoc = await PDFDocument.load(downloadedBuffer);
      return {
        buffer: downloadedBuffer,
        filename: `TERMO_FACIAL_${params.scheduling.CODIGOPRONTUARIO || requestId}.pdf`,
        documentHash: result.documentHash,
        pageCount: pdfDoc.getPageCount(),
      };
    } catch (error) {
      if (!isMissingBlobError(error)) {
        throw error;
      }

      this.logger.warn(
        `[FACIAL] Blob do termo nao encontrado para requestId=${requestId}. Regerando em modo inline.`,
      );

      const fallbackResult = await requestWorkerTermo(true);
      if (fallbackResult.mode !== 'inline') {
        throw new BadGatewayException('Falha ao regenerar termo facial em modo inline.');
      }

      return buildInlineResult(fallbackResult);
    }
  }

  private resolveWorkerBaseUrl(): string | null {
    return resolveWorkerBaseUrl();
  }

  private buildEvidencePlaceholderUrl(
    requestId: string,
    appOrigin?: string,
  ): string {
    const headerOrigin = String(appOrigin || '').trim().replace(/\/+$/, '');
    const appUrl = (
      headerOrigin ||
      String(
        process.env.NEXT_PUBLIC_APP_URL ||
          process.env.APP_BASE_URL ||
          'https://cmsocupacional.com.br',
      )
        .trim()
        .replace(/\/+$/, '')
    );

    return `${appUrl}/facial/evidencias/${requestId}`;
  }

  private buildEvidenceAccessUrl(requestId: string, appOrigin?: string): string {
    return this.buildEvidencePlaceholderUrl(requestId, appOrigin);
  }

  private maskCpf(cpf?: string): string | undefined {
    const digits = String(cpf || '').replace(/\D/g, '');
    if (digits.length !== 11) return undefined;
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
  }

  private buildTermPath(scheduling: SchedulingDocument): string {
    const prontuario = scheduling.CODIGOPRONTUARIO || String(scheduling._id);
    return `autenticacao/${prontuario}/termo-aceite.pdf`;
  }

  private buildFacialEvidencePath(prontuario: string): string {
    return `autenticacao/${prontuario}/relatorio-evidencias.pdf`;
  }

  private async uploadFacialPdf(
    scheduling: SchedulingDocument,
    buffer: Buffer,
    prefix: string,
  ): Promise<{ url: string; hash: string; blobPath: string }> {
    const prontuario = scheduling.CODIGOPRONTUARIO || String(scheduling._id);
    const blobPath =
      prefix === 'RELATORIO_FACIAL_EVIDENCIAS'
        ? this.buildFacialEvidencePath(prontuario)
        : this.buildTermPath(scheduling);

    const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';
    const blobUrl = await this.azureService.uploadPublic(
      publicContainer,
      blobPath,
      buffer,
      'application/pdf',
    );

    return {
      url: blobUrl,
      blobPath,
      hash: crypto.createHash('sha256').update(buffer).digest('hex'),
    };
  }
}

