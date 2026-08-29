import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;

  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Garante que a chave tenha 32 bytes (256 bits)
    return crypto.scryptSync(key, 'salt', this.keyLength);
  }

  encrypt(text: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(Buffer.from('bry-cloud-pin', 'utf8'));

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combina IV + authTag + encrypted data
      const combined =
        iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;

      return Buffer.from(combined).toString('base64');
    } catch (error) {
      this.logger.error(`Error encrypting data: ${error.message}`);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedData: string): string {
    try {
      if (!this.isEncrypted(encryptedData)) {
        return encryptedData; // Fallback direto se não parecer criptografado
      }

      const key = this.getEncryptionKey();

      // Decodifica base64 e separa os componentes
      const combined = Buffer.from(encryptedData, 'base64').toString('utf8');
      const parts = combined.split(':');

      if (parts.length !== 3) {
        throw new Error(
          'Invalid encrypted data format after isEncrypted check',
        );
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAAD(Buffer.from('bry-cloud-pin', 'utf8'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Se falhou mesmo parecendo criptografado, logamos como aviso (pode ser chave expirada/trocada)
      this.logger.warn(
        `Failed to decrypt data that appeared to be encrypted: ${error.message}`,
      );
      return encryptedData; // Fallback para o valor original
    }
  }

  // Método para verificar se o PIN está criptografado
  isEncrypted(data: string): boolean {
    try {
      // Tenta decodificar como base64 e verificar o formato
      const combined = Buffer.from(data, 'base64').toString('utf8');
      const parts = combined.split(':');
      return (
        parts.length === 3 && parts[0].length === 32 && parts[1].length === 32
      );
    } catch {
      return false;
    }
  }
}
