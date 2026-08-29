import { Test, TestingModule } from '@nestjs/testing';
import { BiometriaCryptoService } from './biometria-crypto.service';

describe('BiometriaCryptoService', () => {
  let service: BiometriaCryptoService;
  
  const VALID_KEY_32 = Buffer.alloc(32, 'a').toString('base64');
  
  beforeEach(async () => {
    process.env.BIOMETRIA_TEMPLATE_CRYPTO_ALGORITHM = 'aes-256-gcm';
    process.env.BIOMETRIA_TEMPLATE_CRYPTO_KEY_ID = 'test-key-id';
    process.env.BIOMETRIA_TEMPLATE_CRYPTO_KEY_BASE64 = VALID_KEY_32;

    const module: TestingModule = await Test.createTestingModule({
      providers: [BiometriaCryptoService],
    }).compile();

    service = module.get<BiometriaCryptoService>(BiometriaCryptoService);
  });

  afterEach(() => {
    delete process.env.BIOMETRIA_TEMPLATE_CRYPTO_ALGORITHM;
    delete process.env.BIOMETRIA_TEMPLATE_CRYPTO_KEY_ID;
    delete process.env.BIOMETRIA_TEMPLATE_CRYPTO_KEY_BASE64;
  });

  describe('Instanciação', () => {
    it('deve falhar se a chave não for fornecida', () => {
      delete process.env.BIOMETRIA_TEMPLATE_CRYPTO_KEY_BASE64;
      expect(() => new BiometriaCryptoService()).toThrow('CONFIG_CRIPTO_AUSENTE');
    });

    it('deve falhar se a chave não tiver 32 bytes', () => {
      process.env.BIOMETRIA_TEMPLATE_CRYPTO_KEY_BASE64 = Buffer.alloc(16, 'a').toString('base64');
      expect(() => new BiometriaCryptoService()).toThrow('CONFIG_CRIPTO_INVALIDA');
    });
    
    it('deve falhar se algoritmo não for aes-256-gcm', () => {
      process.env.BIOMETRIA_TEMPLATE_CRYPTO_ALGORITHM = 'aes-256-cbc';
      expect(() => new BiometriaCryptoService()).toThrow('CONFIG_CRIPTO_INVALIDA');
    });
  });

  describe('encrypt', () => {
    it('deve retornar objeto com metadados e authTag', () => {
      const template = Buffer.from([0x41, 0x4E, 0x53, 0x49]).toString('base64');
      const result = service.encrypt(template);

      expect(result).toBeDefined();
      expect(result.templateEncrypted).toBeDefined();
      expect(result.templateEncryption).toBeDefined();
      expect(result.templateEncryption.algorithm).toBe('aes-256-gcm');
      expect(result.templateEncryption.keyId).toBe('test-key-id');
      expect(result.templateEncryption.iv).toBeDefined();
      expect(result.templateEncryption.authTag).toBeDefined();
      expect(result.templateEncryption.version).toBe(1);
    });

    it('deve retornar valores diferentes para o mesmo input (IV aleatório)', () => {
      const template = Buffer.from([0x41, 0x4E, 0x53, 0x49]).toString('base64');
      const result1 = service.encrypt(template);
      const result2 = service.encrypt(template);

      expect(result1.templateEncryption.iv).not.toBe(result2.templateEncryption.iv);
      expect(result1.templateEncrypted).not.toBe(result2.templateEncrypted);
    });
  });

  describe('decrypt', () => {
    it('deve retornar o conteúdo original após encrypt/decrypt', () => {
      const original = Buffer.from([0x41, 0x4E, 0x53, 0x49]).toString('base64');
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted.templateEncrypted, encrypted.templateEncryption);

      expect(decrypted).toBe(original);
    });

    it('deve criptografar e descriptografar string vazia', () => {
      const original = '';
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted.templateEncrypted, encrypted.templateEncryption);

      expect(decrypted).toBe(original);
    });

    it('deve falhar se authTag for corrompida', () => {
      const original = Buffer.from([0x41, 0x4E, 0x53, 0x49]).toString('base64');
      const encrypted = service.encrypt(original);
      
      encrypted.templateEncryption.authTag = Buffer.alloc(16, 'b').toString('base64');
      
      expect(() => service.decrypt(encrypted.templateEncrypted, encrypted.templateEncryption)).toThrow();
    });
    
    it('deve falhar se keyId for diferente', () => {
      const original = Buffer.from([0x41, 0x4E, 0x53, 0x49]).toString('base64');
      const encrypted = service.encrypt(original);
      
      encrypted.templateEncryption.keyId = 'wrong-key';
      
      expect(() => service.decrypt(encrypted.templateEncrypted, encrypted.templateEncryption)).toThrow('FALHA_DESCRIPTOGRAFIA: KeyId desconhecido');
    });
  });
});
