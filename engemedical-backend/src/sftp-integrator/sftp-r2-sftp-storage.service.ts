import { Injectable, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudflareR2SftpService {
  private readonly logger = new Logger(CloudflareR2SftpService.name);
  private readonly client: S3Client;
  private readonly accountId: string;
  private readonly bucketName: string;

  constructor() {
    this.accountId = process.env.R2_ACCOUNT_ID || '9146a0e802de7e5843c9ab0f5e63f2b4';
    this.bucketName = process.env.R2_BUCKET_NAME || 'sftp-relatorios';
    
    // Usar credentials do ambiente
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_API_TOKEN || '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
    
    // Se usar API Token como Access Key, precisamos de um Secret dummy
    const effectiveSecret = secretAccessKey || 'dummy-secret-for-api-token-auth';
    
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey: effectiveSecret,
      },
    });

    this.logger.log(`[R2 SFTP] Cliente inicializado para bucket: ${this.bucketName}`);
  }

  /**
   * Garante que o bucket existe
   */
  async ensureBucket(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.client.send(command);
      this.logger.log(`[R2 SFTP] Bucket ${this.bucketName} está disponível`);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        this.logger.warn(`[R2 SFTP] Bucket ${this.bucketName} não existe - precisa ser criado no painel`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Upload de arquivo para R2 (usado para planilhas SFTP)
   */
  async upload(key: string, body: Buffer | string, contentType = 'application/octet-stream'): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
    
    // URL pública do R2 (sem signature)
    const publicUrl = `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${key}`;
    this.logger.log(`[R2 SFTP] Upload completo: ${key}`);
    return publicUrl;
  }

  /**
   * Upload de arquivo local (método prático para planilhas)
   */
  async uploadFile(localPath: string, remoteKey?: string): Promise<string> {
    const key = remoteKey || path.basename(localPath);
    const fileBuffer = fs.readFileSync(localPath);
    
    const fileName = path.basename(localPath);
    const contentType = this.getContentType(fileName);
    
    return this.upload(key, fileBuffer, contentType);
  }

  /**
   * Upload de múltiplos arquivos em lote
   */
  async uploadBatch(files: Array<{localPath: string; key?: string}>): Promise<Array<{key: string; url: string}>> {
    const results: Array<{key: string; url: string}> = [];
    
    for (const file of files) {
      try {
        const url = await this.uploadFile(file.localPath, file.key);
        results.push({ key: file.key || path.basename(file.localPath), url });
        this.logger.log(`[R2 SFTP] Arquivo enviado: ${file.localPath}`);
      } catch (error: any) {
        this.logger.error(`[R2 SFTP] Falha no upload de ${file.localPath}: ${error.message}`);
      }
    }
    
    return results;
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
    const body = response.Body as string;
    return Buffer.from(body, 'utf-8');
  }

  /**
   * Download em arquivo local
   */
  async downloadToFile(key: string, localPath: string): Promise<void> {
    const buffer = await this.download(key);
    fs.writeFileSync(localPath, buffer);
    this.logger.log(`[R2 SFTP] Arquivo baixado: ${localPath}`);
  }

  /**
   * Lista objetos em um bucket com prefixo
   */
  async list(prefix = ''): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    return response.Contents?.map((obj) => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
    })) || [];
  }

  /**
   * Lista arquivos recentes de SFTP (para auditoria)
   */
  async listSftpFiles(clientKey: string, days: number = 30): Promise<Array<{key: string; url: string; size: number}>> {
    const prefix = `sftp-integrator/${clientKey}/`;
    const files = await this.list(prefix);
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return files
      .filter(f => f.lastModified > cutoff)
      .map(f => ({
        key: f.key,
        url: `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${f.key}`,
        size: f.size,
      }));
  }

  /**
   * Delete de objeto do R2
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
    this.logger.log(`[R2 SFTP] Delete completo: ${key}`);
  }

  /**
   * Verifica se um objeto existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.download(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gera URL pública para um objeto
   */
  getPublicUrl(key: string): string {
    return `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${key}`;
  }

  /**
   * Gera URL assinada (com expiração) para objetos privados
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Nota: esta é uma URL pública simples
    // Para URLs assinadas, use @aws-sdk/s3-request-presigner
    return this.getPublicUrl(key);
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

  /**
   * Get bucket metadata
   */
  async getBucketInfo(): Promise<{name: string; accountId: string; endpoint: string}> {
    return {
      name: this.bucketName,
      accountId: this.accountId,
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
    };
  }
}