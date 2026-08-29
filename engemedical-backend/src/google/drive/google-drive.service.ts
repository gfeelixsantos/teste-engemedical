import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly integrationEnabled: boolean;
  private readonly folderId: string;
  private readonly jsonPath: string;

  constructor(private readonly configService: ConfigService) {
    this.integrationEnabled =
      String(
        this.configService.get<string>('GOOGLE_DRIVE_ENABLED') || 'true',
      ).toLowerCase() === 'true';

    this.folderId = String(
      this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID') ||
        this.configService.get<string>('GOOGLE_DRIVER_FOLDERID') ||
        '',
    ).trim();

    const explicitPath = String(
      this.configService.get<string>('GOOGLE_DRIVE_CREDENTIALS_JSON_PATH') ||
        this.configService.get<string>('GOOGLE_DRIVE_JSON_PATH') ||
        '',
    ).trim();

    const distPath = path.join(__dirname, 'googleDriveApi.json');
    const srcPath = path.join(
      process.cwd(),
      'src',
      'google',
      'drive',
      'googleDriveApi.json',
    );
    const rootPath = path.join(process.cwd(), 'googleDriveApi.json');
    const sharedWorkerPath = path.join(
      process.cwd(),
      '..',
      'cmso360-worker',
      'src',
      'google',
      'drive',
      'googleDriveApi.json',
    );

    const candidates = [
      explicitPath,
      distPath,
      srcPath,
      rootPath,
      sharedWorkerPath,
    ].filter(Boolean);

    this.jsonPath =
      candidates.find((candidate) => fs.existsSync(candidate)) || '';

    if (!this.isEnabled()) {
      this.logger.warn(
        `[GDRIVE] Integracao desabilitada. folderId=${this.folderId ? 'configurado' : 'ausente'} credenciais=${this.jsonPath ? this.jsonPath : 'nao encontrado'}`,
      );
    } else {
      this.logger.log(
        `[GDRIVE] Integracao habilitada. folderId=${this.folderId} credenciais=${this.jsonPath}`,
      );
    }
  }

  isEnabled(): boolean {
    return Boolean(
      this.integrationEnabled &&
        this.folderId &&
        this.jsonPath &&
        fs.existsSync(this.jsonPath),
    );
  }

  async uploadFile(documentName: string, filePath: string): Promise<string> {
    if (!this.isEnabled()) {
      return '';
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: this.jsonPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.create({
      requestBody: {
        name: documentName,
        parents: [this.folderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: fs.createReadStream(filePath),
      },
      fields: 'id',
    });

    const fileId = String((response.data as any)?.id || '');
    this.logger.log(
      `[GDRIVE] Upload concluido: ${documentName} (ID: ${fileId})`,
    );
    return fileId;
  }

  async uploadFromBuffer(
    documentName: string,
    buffer: Buffer,
  ): Promise<string> {
    if (!this.isEnabled()) {
      return '';
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: this.jsonPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.create({
      requestBody: {
        name: documentName,
        parents: [this.folderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: Readable.from(buffer),
      },
      fields: 'id',
    });

    const fileId = String((response.data as any)?.id || '');
    this.logger.log(
      `[GDRIVE] Upload concluido (buffer): ${documentName} (ID: ${fileId})`,
    );
    return fileId;
  }
}
