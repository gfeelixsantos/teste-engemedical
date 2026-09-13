import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { generateSocReportExcel } from './sftp-report-excel.generator';

@Injectable()
export class R2SftpReportService {
  private readonly logger = new Logger(R2SftpReportService.name);
  private readonly client: S3Client;
  private readonly accountId: string;
  private readonly bucketName: string;

  constructor() {
    this.accountId = process.env.R2_ACCOUNT_ID || '9146a0e802de7e5843c9ab0f5e63f2b4';
    this.bucketName = process.env.R2_BUCKET_NAME || 'sftp-relatorios';
    
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_API_TOKEN || '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
    
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey: secretAccessKey || 'dummy',
      },
    });

    this.logger.log(`[R2 Report] Serviço inicializado - Bucket: ${this.bucketName}`);
  }

  /**
   * Upload de relatório SOC para R2
   * Usado após processamento de funcionários via SOAP
   */
  async uploadSocReport(
    clientKey: string,
    fileName: string,
    excelBuffer: Buffer
  ): Promise<string> {
    const date = new Date().toISOString().slice(0, 10);
    const key = `relatorios-soc/${clientKey}/${fileName}`;
    
    const url = await this.upload(key, excelBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    this.logger.log(`[R2 Report] Relatório SOC salvo: ${key}`);
    return url;
  }

  /**
   * Upload de planilha baixada do SFTP
   */
  async uploadSftpFile(
    clientKey: string,
    localPath: string
  ): Promise<{key: string; url: string; size: number}> {
    const fileName = path.basename(localPath);
    const key = `sftp-integrator/${clientKey}/${fileName}`;
    
    const fileBuffer = fs.readFileSync(localPath);
    const url = await this.upload(key, fileBuffer, this.getContentType(fileName));
    
    this.logger.log(`[R2 Report] Arquivo SFTP salvo: ${key}`);
    
    return {
      key,
      url,
      size: fileBuffer.length
    };
  }

  /**
   * Upload genérico
   */
  async upload(
    key: string,
    body: Buffer | string,
    contentType = 'application/octet-stream'
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
    
    const publicUrl = `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${key}`;
    return publicUrl;
  }

  /**
   * Download de arquivo do R2
   */
  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) throw new Error(`Objeto R2 não encontrado: ${key}`);
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer | Uint8Array | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Exclui arquivo do R2
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
    this.logger.log(`[R2 Report] Arquivo excluído: ${key}`);
  }

  /**
   * Verifica se arquivo existe no R2
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lista arquivos de um cliente
   */
  async listClientFiles(clientKey: string, prefix = ''): Promise<Array<{key: string; url: string; size: number; lastModified: Date}>> {
    const listPrefix = `${prefix || 'sftp-integrator'}/${clientKey}/`;
    
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: listPrefix,
    });

    const response = await this.client.send(command);
    
    return response.Contents?.map(obj => ({
      key: obj.Key || '',
      url: `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${obj.Key}`,
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
    })) || [];
  }

  /**
   * Lista todos os arquivos recentes (para auditoria)
   */
  async listRecentFiles(days: number = 30): Promise<Array<{key: string; url: string; size: number; clientKey: string}>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Listar sftp-integrator
    const sftpFiles = await this.listAllFilesByPrefix('sftp-integrator', cutoff);
    // Listar relatorios-soc
    const socFiles = await this.listAllFilesByPrefix('relatorios-soc', cutoff);

    return [...sftpFiles, ...socFiles];
  }

  private async listAllFilesByPrefix(prefix: string, cutoff: Date): Promise<Array<{key: string; url: string; size: number; clientKey: string}>> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.client.send(command);
      
      return (response.Contents || [])
        .filter(obj => obj.LastModified && obj.LastModified > cutoff)
        .map(obj => {
          const parts = (obj.Key || '').split('/');
          const clientKey = parts[1] || 'unknown';
          return {
            key: obj.Key || '',
            url: `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${obj.Key}`,
            size: obj.Size || 0,
            clientKey
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Gera URL pública para um objeto
   */
  getPublicUrl(key: string): string {
    return `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${key}`;
  }

  /**
   * Get bucket info
   */
  getBucketInfo(): { name: string; accountId: string; endpoint: string } {
    return {
      name: this.bucketName,
      accountId: this.accountId,
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`
    };
  }

  /**
   * Determina content-type baseado na extensão
   */
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
      '.xlsb': 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
      '.csv': 'text/csv',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }
}
