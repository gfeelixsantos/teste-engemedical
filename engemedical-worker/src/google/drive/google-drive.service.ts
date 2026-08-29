import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly folderId: string;
  private readonly jsonPath: string;

  constructor(private readonly configService: ConfigService) {
    this.folderId =
      this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID') || '';

    // Tentativa 1: Mesma pasta do arquivo compilado (dist)
    const distPath = path.join(__dirname, 'googleDriveApi.json');
    // Tentativa 2: Caminho absoluto a partir da raiz do projeto (src)
    const srcPath = path.join(
      process.cwd(),
      'src',
      'google',
      'drive',
      'googleDriveApi.json',
    );
    // Tentativa 3: Raiz do projeto
    const rootPath = path.join(process.cwd(), 'googleDriveApi.json');

    if (fs.existsSync(distPath)) {
      this.jsonPath = distPath;
    } else if (fs.existsSync(srcPath)) {
      this.jsonPath = srcPath;
    } else if (fs.existsSync(rootPath)) {
      this.jsonPath = rootPath;
    } else {
      this.jsonPath = distPath; // Fallback para erro legível no log
    }
  }

  async uploadFile(documentName: string, filePath: string): Promise<string> {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: this.jsonPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });

      const fileData = {
        name: documentName,
        parents: [this.folderId],
      };

      const media = {
        mimeType: 'application/pdf',
        body: fs.createReadStream(filePath),
      };

      const response = await drive.files.create({
        requestBody: fileData,
        media,
        fields: 'id',
      });

      const fileId = (response.data as any).id;
      this.logger.log(`Upload Google Drive: ${documentName} (ID: ${fileId})`);

      return fileId || '';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro ao fazer upload para Google Drive: ${errorMessage}`,
      );
      throw error;
    }
  }

  async uploadFromBuffer(
    documentName: string,
    buffer: Buffer,
  ): Promise<string> {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: this.jsonPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });

      const fileData = {
        name: documentName,
        parents: [this.folderId],
      };

      const response = await drive.files.create({
        requestBody: fileData,
        media: {
          mimeType: 'application/pdf',
          body: Readable.from(buffer),
        },
        fields: 'id',
      });

      const fileId = (response.data as any).id;
      this.logger.log(
        `Upload Google Drive (buffer): ${documentName} (ID: ${fileId})`,
      );

      return fileId || '';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro ao fazer upload para Google Drive: ${errorMessage}`,
      );
      throw error;
    }
  }
}
