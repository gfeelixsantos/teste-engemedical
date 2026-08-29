import {
  Controller, Get, Query, Req, Res, UseGuards,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../soc/guards/jwt-auth.guard';
import { AzureService } from '../azure/azure.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { parseAuthUserHeader } from '../core/professional-identity.resolver';
import { MongoService } from '../mongo/mongo.service';

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.zip': 'application/zip',
  '.xml': 'application/xml',
};

const EXT_PATTERN = /\.\w+$/;

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aso: 'ASO',
  exames: 'Exame',
  anexos: 'Anexo',
  prontuarios: 'Prontuário',
  laudos: 'Laudo',
  autenticacao: 'Autenticação',
};

@Controller('blob/proxy')
export class BlobProxyController {
  private readonly logger = new Logger(BlobProxyController.name);

  constructor(
    private readonly azureService: AzureService,
    private readonly auditLog: AuditLogService,
    private readonly mongoService: MongoService,
  ) {}

  private extractProntuarioFromUrl(url: string): string | null {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(
      /\/(?:aso|exames|anexos|prontuarios|laudos|autenticacao)\/\d{4}\/\d{2}\/[^/]+\/([^/]+)\//i,
    );
    return match?.[1] || null;
  }

  private extractDocumentTypeFromUrl(url: string): string {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/(aso|exames|anexos|prontuarios|laudos|autenticacao)\//i);
    const key = match?.[1]?.toLowerCase() || '';
    return DOCUMENT_TYPE_LABELS[key] || 'Documento';
  }

  private extractFileNameFromUrl(url: string): string {
    const decoded = decodeURIComponent(url);
    const segments = decoded.split('/');
    const lastSegment = segments[segments.length - 1] || '';
    return lastSegment.split('?')[0] || 'documento.pdf';
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async proxy(
    @Query('url') url: string,
    @Res() res: Response,
    @Req() req: Request,
    @Query('filename') filename?: string,
  ) {
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'url query param é obrigatório' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = parseAuthUserHeader(req.headers['x-auth-user']);
    const ip = req.ip || req.socket?.remoteAddress || 'n/a';
    const userAgent = req.headers['user-agent'] || 'n/a';

    try {
      const ext = (url.match(EXT_PATTERN)?.[0] || '.pdf').toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      const filePart = url.split('/').pop()?.split('?')[0] || 'documento.pdf';
      const safeFilename = filename
        ? filename.replace(/[<>:"/\\|?*]/g, '_')
        : filePart;

      let streamResult: { stream: NodeJS.ReadableStream; contentLength: number; contentType: string } | null = null;
      try {
        streamResult = await this.azureService.downloadBlobStream(url.trim());
      } catch {
        // Fallback para buffer se stream falhar
      }

      const effectiveContentType = streamResult?.contentType || contentType;

      const detalhes: Record<string, unknown> = {
        url: url.substring(0, 200),
        fileName: this.extractFileNameFromUrl(url),
        documentoTipo: this.extractDocumentTypeFromUrl(url),
      };

      const prontuario = this.extractProntuarioFromUrl(url);
      if (prontuario) {
        try {
          const doc = await this.mongoService.schedulingsCollection.findOne(
            { CODIGOPRONTUARIO: prontuario },
            { projection: { NOME: 1, CODIGOPRONTUARIO: 1 } },
          );
          if (doc) {
            detalhes.funcionarioNome = (doc as any).NOME || null;
            detalhes.funcionarioProntuario = (doc as any).CODIGOPRONTUARIO || null;
          }
        } catch {
          // Silencioso
        }
      }

      this.auditLog.logUserAction({
        user: user ? { codigo: user.codigo, nome: user.nome, perfil: user.perfil } : undefined,
        acao: 'VISUALIZAR_DOCUMENTO_PROXY',
        recursoTipo: 'blob',
        recursoId: url,
        pacienteCodigo: prontuario || undefined,
        pacienteNome: detalhes.funcionarioNome as string | undefined,
        detalhes,
        ip,
        userAgent,
      });

      if (streamResult) {
        res.setHeader('Content-Type', effectiveContentType);
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
        if (streamResult.contentLength > 0) {
          res.setHeader('Content-Length', streamResult.contentLength);
        }
        res.setHeader('Cache-Control', 'public, max-age=300, immutable');

        streamResult.stream.pipe(res);
        return;
      }

      const buffer = await this.azureService.downloadBlob(url.trim());

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=300, immutable');

      return res.status(HttpStatus.OK).send(buffer);
    } catch (err) {
      this.logger.error(`[BLOB_PROXY] Erro ao baixar blob: ${url}`, err);

      const legacyAttachment = await this.mongoService.findAttachmentByStoragePath(
        url.trim(),
      );
      if (legacyAttachment) {
        const ext = legacyAttachment.fileName.match(EXT_PATTERN)?.[0]?.toLowerCase();
        const contentType =
          legacyAttachment.contentType ||
          (ext ? MIME_TYPES[ext] : undefined) ||
          'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${legacyAttachment.fileName}"`);
        res.setHeader('Content-Length', legacyAttachment.buffer.length);
        res.setHeader('Cache-Control', 'no-store');

        const detalhes: Record<string, unknown> = {
          url: url.substring(0, 200),
          fallback: 'mongo-attachment-content',
          fileName: legacyAttachment.fileName,
          documentoTipo: this.extractDocumentTypeFromUrl(url),
        };

        const prontuario = this.extractProntuarioFromUrl(url);
        if (prontuario) {
          try {
            const doc = await this.mongoService.schedulingsCollection.findOne(
              { CODIGOPRONTUARIO: prontuario },
              { projection: { NOME: 1, CODIGOPRONTUARIO: 1 } },
            );
            if (doc) {
              detalhes.funcionarioNome = (doc as any).NOME || null;
              detalhes.funcionarioProntuario = (doc as any).CODIGOPRONTUARIO || null;
            }
          } catch {
            // Silencioso
          }
        }

        this.auditLog.logUserAction({
          user: user ? { codigo: user.codigo, nome: user.nome, perfil: user.perfil } : undefined,
          acao: 'VISUALIZAR_DOCUMENTO_PROXY_FALLBACK',
          recursoTipo: 'blob',
          recursoId: url,
          pacienteCodigo: prontuario || undefined,
          pacienteNome: detalhes.funcionarioNome as string | undefined,
          detalhes,
          ip,
          userAgent,
        });

        return res.status(HttpStatus.OK).send(legacyAttachment.buffer);
      }

      if ((err as any)?.statusCode === 404 || (err as any)?.code === 'BlobNotFound') {
        throw new HttpException(
          { status: HttpStatus.NOT_FOUND, error: 'Documento não encontrado' },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Erro ao acessar documento' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
