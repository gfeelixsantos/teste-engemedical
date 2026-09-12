import { Injectable, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

@Injectable()
export class CloudflareR2Service {
  private readonly logger = new Logger(CloudflareR2Service.name);
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });

    this.logger.log('[R2] Conexão estabelecida com Cloudflare R2');
  }

  /**
   * Faz upload de um arquivo para R2
   */
  async upload(key: string, body: Buffer | string, contentType = 'application/octet-stream'): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'documents',
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
    const url = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${key}`;
    this.logger.log(`[R2] Upload completo: ${key}`);
    return url;
  }

  /**
   * Faz download de um arquivo do R2
   */
  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'documents',
      Key: key,
    });

    const response = await this.client.send(command);
    const body = response.Body as string;
    return Buffer.from(body, 'utf-8');
  }

  /**
   * Lista objetos em um bucket com prefixo
   */
  async list(prefix = ''): Promise<Array<{ key: string; size: number }>> {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME || 'documents',
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    return response.Contents?.map((obj) => ({
      key: obj.Key || '',
      size: obj.Size || 0,
    })) || [];
  }

  /**
   * Deleta um objeto do R2
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'documents',
      Key: key,
    });

    await this.client.send(command);
    this.logger.log(`[R2] Delete completo: ${key}`);
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
    const accountId = process.env.R2_ACCOUNT_ID || '';
    const bucketName = process.env.R2_BUCKET_NAME || 'documents';
    return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
  }
}