import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface TemplateEncryptionData {
  algorithm: string;
  keyId: string;
  iv: string;
  authTag: string;
  encryptedAt: Date;
  version: number;
}

export interface EncryptedTemplateResult {
  templateEncrypted: string;
  templateEncryption: TemplateEncryptionData;
}

/**
 * Serviço de criptografia para templates biométricos.
 * Implementação exclusiva com AES-256-GCM.
 */
@Injectable()
export class BiometriaCryptoService {
  private readonly logger = new Logger(BiometriaCryptoService.name);
  
  private readonly algorithm: string;
  private readonly keyId: string;
  private readonly keyBase64: string;
  private readonly key: Buffer;
  
  private readonly ivLength = 12; // 96 bits para GCM

  constructor() {
    this.algorithm = process.env.BIOMETRIA_TEMPLATE_CRYPTO_ALGORITHM || 'aes-256-gcm';
    this.keyId = process.env.BIOMETRIA_TEMPLATE_CRYPTO_KEY_ID || '';
    this.keyBase64 = process.env.BIOMETRIA_TEMPLATE_CRYPTO_KEY_BASE64 || '';

    if (this.algorithm !== 'aes-256-gcm') {
      throw new Error('CONFIG_CRIPTO_INVALIDA: Apenas aes-256-gcm é suportado.');
    }

    if (!this.keyId || !this.keyBase64) {
      throw new Error('CONFIG_CRIPTO_AUSENTE: Variáveis de ambiente de chave não configuradas.');
    }

    this.key = Buffer.from(this.keyBase64, 'base64');

    if (this.key.length !== 32) {
      throw new Error('CONFIG_CRIPTO_INVALIDA: A chave de criptografia não possui 32 bytes válidos.');
    }
  }

  /**
   * Criptografa template biométrico usando AES-256-GCM.
   */
  encrypt(templateBase64: string): EncryptedTemplateResult {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm as any, this.key, iv);

    let encrypted = cipher.update(templateBase64, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    return {
      templateEncrypted: encrypted,
      templateEncryption: {
        algorithm: this.algorithm,
        keyId: this.keyId,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        encryptedAt: new Date(),
        version: 1,
      }
    };
  }

  /**
   * Descriptografa template biométrico.
   */
  decrypt(templateEncrypted: string, encryptionData: TemplateEncryptionData): string {
    if (encryptionData.algorithm !== this.algorithm) {
      throw new Error('FALHA_DESCRIPTOGRAFIA: Algoritmo incompatível.');
    }

    if (encryptionData.keyId !== this.keyId) {
      throw new Error('FALHA_DESCRIPTOGRAFIA: KeyId desconhecido ou não configurado.');
    }

    const iv = Buffer.from(encryptionData.iv, 'base64');
    const authTag = Buffer.from(encryptionData.authTag, 'base64');

    const decipher = createDecipheriv(this.algorithm as any, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(templateEncrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
