import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { AzureService } from './azure.service';
import { UploadGoogleDrive } from './types/azure.types';
import { MongoService } from 'src/mongo/mongo.service';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { GoogleDriveService } from 'src/google/drive/google-drive.service';
import { FuncionarioEntity } from 'src/mongo/model/FuncionarioEntity';
import { formatDocumentFileName, standardizeFileName } from 'src/utils/util';

@Injectable()
export class GoogleDriveUploadService {
  private readonly logger = new Logger(GoogleDriveUploadService.name);

  constructor(
    @Inject(forwardRef(() => MongoService))
    private readonly mongoService: MongoService,
    private readonly azureService: AzureService,
    private readonly googleDriveService: GoogleDriveService,
  ) { }

  private isLikelyAsoUrl(url?: string | null): boolean {
    const normalized = String(url || '')
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    return (
      normalized.includes('/aso/') ||
      normalized.includes('%2faso%2f') ||
      normalized.includes('aso_signed_') ||
      normalized.includes('/funcionarios/') ||
      normalized.includes('%2ffuncionarios%2f')
    );
  }

  private resolvePreferredAsoUrl(params: {
    payloadUrl?: string | null;
    storedAsoUrl?: string | null;
    schedulingId?: string;
  }): string | null {
    const { payloadUrl, storedAsoUrl, schedulingId } = params;
    const payloadUrlNormalized = String(payloadUrl || '').trim();
    const storedUrlNormalized = String(storedAsoUrl || '').trim();

    if (!payloadUrlNormalized && !storedUrlNormalized) {
      return null;
    }

    if (
      payloadUrlNormalized &&
      storedUrlNormalized &&
      payloadUrlNormalized !== storedUrlNormalized
    ) {
      this.logger.warn(
        `[GDRIVE][QUEUE] Divergencia de URL para schedulingId=${schedulingId || 'n/a'}: payloadUrl=${payloadUrlNormalized} | storedAsoUrl=${storedUrlNormalized}. Priorizando ASOINFO.url.`,
      );
    }

    if (storedUrlNormalized && this.isLikelyAsoUrl(storedUrlNormalized)) {
      return storedUrlNormalized;
    }

    if (payloadUrlNormalized && this.isLikelyAsoUrl(payloadUrlNormalized)) {
      return payloadUrlNormalized;
    }

    return storedUrlNormalized || payloadUrlNormalized;
  }

  private buildAsoFileName(scheduling: SchedulingDocument): string {
    const baseName = formatDocumentFileName({
      prefix: 'ASO',
      nome: scheduling.NOME,
      empresa: scheduling.NOMEEMPRESA,
      tipo: scheduling.TIPOEXAMENOME || 'ASO',
      data: scheduling.DATAAGENDAMENTO,
    });
    const normalizedBase = standardizeFileName(String(baseName || 'ASO'))
      .replace(/[.]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .replace(/\.PDF$/i, '');
    return `${normalizedBase}.pdf`;
  }

  private async findScheduling(
    schedulingId: string,
  ): Promise<SchedulingDocument | null> {
    try {
      return await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
        { _id: new ObjectId(schedulingId) },
      );
    } catch {
      return await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
        { _id: schedulingId as any },
      );
    }
  }

  private async acquireAsoLock(
    scheduling: SchedulingDocument,
  ): Promise<boolean> {
    const stalePendingAt = new Date(Date.now() - 15 * 60 * 1000);
    const result = await this.mongoService.schedulingsCollection.updateOne(
      {
        _id: scheduling._id as any,
        'ASOINFO.googleDrive.fileId': { $exists: false },
        $or: [
          { 'ASOINFO.googleDrive.pending': { $exists: false } },
          { 'ASOINFO.googleDrive.pending': false },
          { 'ASOINFO.googleDrive.pendingAt': { $lte: stalePendingAt } },
        ],
      } as any,
      {
        $set: {
          'ASOINFO.googleDrive.pending': true,
          'ASOINFO.googleDrive.pendingAt': new Date(),
          'ASOINFO.googleDrive.lastAttemptAt': new Date(),
        },
      } as any,
    );

    return result.modifiedCount > 0;
  }

  private async markSkipped(
    scheduling: SchedulingDocument,
    reason: string,
  ): Promise<void> {
    await this.mongoService.schedulingsCollection.updateOne(
      { _id: scheduling._id as any } as any,
      {
        $set: {
          'ASOINFO.googleDrive.pending': false,
          'ASOINFO.googleDrive.lastError': reason,
          'ASOINFO.googleDrive.lastAttemptAt': new Date(),
        },
        $unset: {
          'ASOINFO.googleDrive.pendingAt': '',
        },
      } as any,
    );
  }

  async processAsoUpload(payload: UploadGoogleDrive): Promise<void> {
    const scheduling = await this.findScheduling(payload.schedulingId);
    if (!scheduling) {
      this.logger.warn(
        `[GDRIVE][QUEUE] Agendamento nao encontrado para schedulingId=${payload.schedulingId}.`,
      );
      return;
    }

    const entity = new FuncionarioEntity(scheduling);
    if (entity.isCredenciada()) {
      this.logger.log(
        `[GDRIVE][QUEUE] Skip upload: Atendimento KIT CREDENCIADA para schedulingId=${payload.schedulingId}.`,
      );
      return;
    }

    if (!this.googleDriveService.isEnabled()) {
      this.logger.warn(
        `[GDRIVE][QUEUE] Integracao desabilitada. Pulando upload para schedulingId=${payload.schedulingId}.`,
      );
      return;
    }

    if (scheduling.ASOINFO?.googleDrive?.fileId) {
      this.logger.log(
        `[GDRIVE][QUEUE] Upload ja realizado para schedulingId=${payload.schedulingId} | fileId=${scheduling.ASOINFO.googleDrive.fileId}`,
      );
      return;
    }

    const acquired = await this.acquireAsoLock(scheduling);
    if (!acquired) {
      this.logger.log(
        `[GDRIVE][QUEUE] Upload ja em processamento ou concluido para schedulingId=${payload.schedulingId}.`,
      );
      return;
    }

    const asoUrl = this.resolvePreferredAsoUrl({
      payloadUrl: payload.url,
      storedAsoUrl: scheduling.ASOINFO?.url,
      schedulingId: payload.schedulingId,
    });

    if (!asoUrl) {
      await this.markSkipped(
        scheduling,
        'URL do ASO indisponivel para upload no Google Drive.',
      );
      return;
    }

    const fileName =
      String(payload.nomeArquivo || '').trim() ||
      this.buildAsoFileName(scheduling);

    try {
      const buffer = await this.azureService.downloadBlob(asoUrl);
      if (!buffer?.length) {
        throw new Error('buffer vazio');
      }

      const fileId = await this.googleDriveService.uploadFromBuffer(
        fileName,
        buffer,
      );
      if (!fileId) {
        throw new Error('Google Drive retornou fileId vazio');
      }

      await this.mongoService.schedulingsCollection.updateOne(
        { _id: scheduling._id as any } as any,
        {
          $set: {
            'ASOINFO.googleDrive.fileId': fileId,
            'ASOINFO.googleDrive.fileName': fileName,
            'ASOINFO.googleDrive.uploadedAt': new Date(),
            'ASOINFO.googleDrive.pending': false,
            'ASOINFO.googleDrive.source': 'GOOGLE_DRIVE_QUEUE',
            'ASOINFO.googleDrive.lastAttemptAt': new Date(),
          },
          $unset: {
            'ASOINFO.googleDrive.pendingAt': '',
            'ASOINFO.googleDrive.lastError': '',
          },
        } as any,
      );

      this.logger.log(
        `[GDRIVE][QUEUE] Upload concluido para schedulingId=${payload.schedulingId} | fileName=${fileName} | fileId=${fileId}`,
      );
    } catch (error) {
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: scheduling._id as any } as any,
        {
          $set: {
            'ASOINFO.googleDrive.pending': false,
            'ASOINFO.googleDrive.lastError':
              error instanceof Error ? error.message : String(error),
            'ASOINFO.googleDrive.lastAttemptAt': new Date(),
          },
          $unset: {
            'ASOINFO.googleDrive.pendingAt': '',
          },
        } as any,
      );

      throw error;
    }
  }
}
