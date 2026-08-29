import { ObjectId } from 'mongodb';

// ============================================================
// MOCKS
// ============================================================

function criarMockCollection() {
  return {
    insertOne: jest.fn().mockResolvedValue({ acknowledged: true, insertedId: new ObjectId() }),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    deleteOne: jest.fn().mockResolvedValue({ acknowledged: true }),
  };
}

function criarMockDb() {
  const collection = criarMockCollection();
  return {
    collection: jest.fn().mockReturnValue(collection),
    collections: jest.fn().mockResolvedValue([]),
  };
}

function criarMockConfigService() {
  return {
    get: jest.fn().mockReturnValue('mongodb://localhost:27017/cms0360'),
  };
}

// ============================================================
// SETUP
// ============================================================

describe('MongoService — Biometria', () => {
  let mongoService: any;
  let mockDb: ReturnType<typeof criarMockDb>;
  let mockConfig: ReturnType<typeof criarMockConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb = criarMockDb();
    mockConfig = criarMockConfigService();

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    };

    const { MongoService } = await import('src/mongo/mongo.service');

    mongoService = new MongoService(
      mockConfig as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { findByIdSafe: jest.fn() } as any,
      mockLogger as any,
    );
    (mongoService as any).db = mockDb;
  });

  // ============================================================
  // 2.1 salvarCadastroBiometrico
  // ============================================================

  describe('salvarCadastroBiometrico', () => {
    it('deve salvar cpfHash', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          cpfHash: 'cpf-hash-123',
        }),
      );
    });

    it('deve salvar dataNascimentoHash', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          dataNascimentoHash: 'dn-hash-456',
        }),
      );
    });

    it('deve salvar dedo', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          dedo: 'INDICADOR_DIREITO',
        }),
      );
    });

    it('deve salvar templateHash', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: 'dGVtcGxhdGU=',
        templateHash: 'template-hash-789',
        templateVersion: 'futronic-ansi-v1',
        templateStorage: 'INLINE_BASE64_TEMP',
        status: 'ATIVO',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          templateHash: 'template-hash-789',
        }),
      );
    });

    it('deve salvar templateEncrypted e templateEncryption', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: 'template-hash-789',
        templateEncrypted: 'encrypted-base64',
        templateEncryption: { algorithm: 'aes-256-gcm', keyId: 'key-1' },
        templateVersion: 'futronic-ansi-v1',
        templateStorage: 'ENCRYPTED_AES_256_GCM',
        status: 'ATIVO',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          templateEncrypted: 'encrypted-base64',
          templateEncryption: { algorithm: 'aes-256-gcm', keyId: 'key-1' },
        }),
      );
    });

    it('deve salvar documento criptografado completo com todos os campos', async () => {
      const templateHash = require('crypto').createHash('sha256').update('dGVtcGxhdGUtYmFzZTY0').digest('hex');

      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: templateHash,
        templateEncrypted: 'ciphertext-base64-data',
        templateEncryption: {
          algorithm: 'aes-256-gcm',
          keyId: 'biometria-local-v1',
          iv: 'aXYxMjM0NTY3ODkwMTI=',
          authTag: 'YXV0aFRhZzEyMzQ1Ng==',
          encryptedAt: new Date('2026-05-25T12:00:00Z'),
          version: 1,
        },
        templateVersion: 'futronic-ansi-v1',
        templateStorage: 'ENCRYPTED_AES_256_GCM',
        status: 'ATIVO',
      });

      const collection = mockDb.collection();
      const savedPayload = (collection.insertOne as jest.Mock).mock.calls[0][0];
      expect(savedPayload).toMatchObject({
        template: null,
        templateEncrypted: 'ciphertext-base64-data',
        templateEncryption: {
          algorithm: 'aes-256-gcm',
          keyId: 'biometria-local-v1',
          iv: 'aXYxMjM0NTY3ODkwMTI=',
          authTag: 'YXV0aFRhZzEyMzQ1Ng==',
          version: 1,
        },
        templateHash: templateHash,
        templateVersion: 'futronic-ansi-v1',
        templateStorage: 'ENCRYPTED_AES_256_GCM',
        status: 'ATIVO',
      });
    });

    it('deve salvar status', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: 'dGVtcGxhdGU=',
        templateHash: 'template-hash-789',
        templateVersion: 'futronic-ansi-v1',
        templateStorage: 'INLINE_BASE64_TEMP',
        status: 'ATIVO',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ATIVO',
        }),
      );
    });

    it('deve salvar templateVersion', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: 'dGVtcGxhdGU=',
        templateHash: 'template-hash-789',
        templateVersion: 'futronic-ansi-v1',
        templateStorage: 'INLINE_BASE64_TEMP',
        status: 'ATIVO',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          templateVersion: 'futronic-ansi-v1',
        }),
      );
    });

    it('deve salvar templateStorage', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: 'dGVtcGxhdGU=',
        templateHash: 'template-hash-789',
        templateVersion: 'futronic-ansi-v1',
        templateStorage: 'INLINE_BASE64_TEMP',
        status: 'ATIVO',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          templateStorage: 'INLINE_BASE64_TEMP',
        }),
      );
    });

    it('deve salvar digitalDocumentalBlobPath', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
        digitalDocumentalBlobPath: 'biometria/PRONT001/INDICADOR_DIREITO.png',
        digitalDocumentalHash: 'doc-hash-123',
        digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
        digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          digitalDocumentalBlobPath: 'biometria/PRONT001/INDICADOR_DIREITO.png',
        }),
      );
    });

    it('deve salvar digitalDocumentalHash', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
        digitalDocumentalBlobPath: 'biometria/PRONT001/INDICADOR_DIREITO.png',
        digitalDocumentalHash: 'doc-hash-123',
        digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
        digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          digitalDocumentalHash: 'doc-hash-123',
        }),
      );
    });

    it('deve salvar digitalDocumentalFinalidade', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
        digitalDocumentalBlobPath: 'biometria/PRONT001/INDICADOR_DIREITO.png',
        digitalDocumentalHash: 'doc-hash-123',
        digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
        digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
        }),
      );
    });

    it('deve salvar digitalDocumentalOrigem', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
        digitalDocumentalBlobPath: 'biometria/PRONT001/INDICADOR_DIREITO.png',
        digitalDocumentalHash: 'doc-hash-123',
        digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
        digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
        }),
      );
    });

    it('deve salvar funcionarioRefs', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
        funcionarioRefs: [{
          funcionarioId: 'func-001',
          prontuarioId: 'PRONT001',
          schedulingId: null,
          origem: 'RECEPCAO',
          vinculadoEm: new Date(),
        }],
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          funcionarioRefs: expect.any(Array),
        }),
      );
    });

    it('deve salvar agentMachineName', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
        agentMachineName: 'AGENT-PC-01',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          agentMachineName: 'AGENT-PC-01',
        }),
      );
    });

    it('NÃO deve salvar imagemDerivadaBase64', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
      } as any);

      const collection = mockDb.collection();
      const savedPayload = (collection.insertOne as jest.Mock).mock.calls[0][0];
      expect(savedPayload).not.toHaveProperty('imagemDerivadaBase64');
    });

    it('NÃO deve salvar BlobUrl pública', async () => {
      await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
        digitalDocumentalBlobPath: 'biometria/PRONT001/INDICADOR_DIREITO.png',
      });

      const collection = mockDb.collection();
      const savedPayload = (collection.insertOne as jest.Mock).mock.calls[0][0];
      expect(savedPayload).not.toHaveProperty('digitalDocumentalUrl');
      expect(savedPayload).not.toHaveProperty('blobUrl');
    });

    it('deve atualizar cadastro existente quando houver duplicata (E11000)', async () => {
      const collection = mockDb.collection();
      const duplicateError = new Error('E11000 duplicate key');
      (duplicateError as any).code = 11000;
      (collection.insertOne as jest.Mock).mockRejectedValueOnce(duplicateError);

      const expectedId = new ObjectId();
      (collection.findOne as jest.Mock).mockResolvedValueOnce({ _id: expectedId });

      const result = await mongoService.salvarCadastroBiometrico({
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        template: null,
        templateHash: '',
        templateStorage: 'PENDING_ENGINE',
        status: 'ATIVO',
        unidade: 'RIO CLARO',
      });

      expect(collection.updateOne).toHaveBeenCalledWith(
        {
          cpfHash: 'cpf-hash-123',
          dataNascimentoHash: 'dn-hash-456',
          dedo: 'INDICADOR_DIREITO',
          status: 'ATIVO',
        },
        expect.objectContaining({ $set: expect.any(Object) }),
      );
      const updateCall = (collection.updateOne as jest.Mock).mock.calls[0][1];
      expect(updateCall.$set).not.toHaveProperty('_id');
      expect(collection.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ cpfHash: 'cpf-hash-123' }),
      );
      expect(result).toHaveProperty('insertedId', expectedId);
    });
  });

  // ============================================================
  // 2.2 registrarAuditoriaBiometria
  // ============================================================

  describe('registrarAuditoriaBiometria', () => {
    it('deve registrar BIOMETRIA_CADASTRO', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
        operador: 'op-001',
        agentMachineName: 'AGENT-PC-01',
        templateHash: 'template-hash-789',
        digitalDocumentalHash: 'doc-hash-123',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'BIOMETRIA_CADASTRO',
        }),
      );
    });

    it('deve registrar BIOMETRIA_VALIDACAO', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_VALIDACAO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-val-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
        operador: 'op-001',
        agentMachineName: 'AGENT-PC-01',
        templateHash: 'template-hash-789',
        score: 85.5,
        threshold: 70.0,
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'BIOMETRIA_VALIDACAO',
          score: 85.5,
          threshold: 70.0,
        }),
      );
    });

    it('deve registrar CANCELADO', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'CANCELADO',
        unidade: 'RIO CLARO',
        agentMachineName: 'AGENT-PC-01',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          resultado: 'CANCELADO',
        }),
      );
    });

    it('deve incluir cpfHash', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          cpfHash: 'cpf-hash-123',
        }),
      );
    });

    it('deve incluir dataNascimentoHash', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          dataNascimentoHash: 'dn-hash-456',
        }),
      );
    });

    it('deve incluir templateHash quando disponível', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
        templateHash: 'template-hash-789',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          templateHash: 'template-hash-789',
        }),
      );
    });

    it('deve incluir digitalDocumentalHash quando disponível', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
        digitalDocumentalHash: 'doc-hash-123',
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          digitalDocumentalHash: 'doc-hash-123',
        }),
      );
    });

    it('deve incluir score e threshold quando validação', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_VALIDACAO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-val-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
        score: 85.5,
        threshold: 70.0,
      });

      const collection = mockDb.collection();
      expect(collection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 85.5,
          threshold: 70.0,
        }),
      );
    });

    it('NÃO deve incluir template', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
      } as any);

      const collection = mockDb.collection();
      const savedPayload = (collection.insertOne as jest.Mock).mock.calls[0][0];
      expect(savedPayload).not.toHaveProperty('template');
    });

    it('NÃO deve incluir base64', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
      } as any);

      const collection = mockDb.collection();
      const savedPayload = (collection.insertOne as jest.Mock).mock.calls[0][0];
      expect(savedPayload).not.toHaveProperty('imagemDerivadaBase64');
      expect(savedPayload).not.toHaveProperty('base64');
    });

    it('NÃO deve incluir templateEncrypted', async () => {
      await mongoService.registrarAuditoriaBiometria({
        tipo: 'BIOMETRIA_CADASTRO',
        funcionarioId: 'func-001',
        cpfHash: 'cpf-hash-123',
        dedo: 'INDICADOR_DIREITO',
        requestId: 'req-001',
        resultado: 'SUCESSO',
        unidade: 'RIO CLARO',
        templateHash: 'hash-123',
      } as any);

      const collection = mockDb.collection();
      const savedPayload = (collection.insertOne as jest.Mock).mock.calls[0][0];
      expect(savedPayload).not.toHaveProperty('templateEncrypted');
      expect(savedPayload).not.toHaveProperty('templateEncryption');
    });
  });

  // ============================================================
  // 2.3 getCadastroBiometricoAtivoByIdentity
  // ============================================================

  describe('getCadastroBiometricoAtivoByIdentity', () => {
    it('deve buscar por cpfHash + dataNascimentoHash + dedo + status ATIVO', async () => {
      await mongoService.getCadastroBiometricoAtivoByIdentity(
        'cpf-hash-123',
        'dn-hash-456',
        'INDICADOR_DIREITO',
      );

      const collection = mockDb.collection();
      expect(collection.findOne).toHaveBeenCalledWith({
        cpfHash: 'cpf-hash-123',
        dataNascimentoHash: 'dn-hash-456',
        dedo: 'INDICADOR_DIREITO',
        status: 'ATIVO',
      });
    });

    it('NÃO deve retornar PENDENTE_TEMPLATE_ENGINE', async () => {
      (mockDb.collection() as any).findOne.mockResolvedValue(null);

      const result = await mongoService.getCadastroBiometricoAtivoByIdentity(
        'cpf-hash-123',
        'dn-hash-456',
        'INDICADOR_DIREITO',
      );

      expect(result).toBeNull();
    });

    it('NÃO deve retornar INATIVO', async () => {
      (mockDb.collection() as any).findOne.mockResolvedValue(null);

      const result = await mongoService.getCadastroBiometricoAtivoByIdentity(
        'cpf-hash-123',
        'dn-hash-456',
        'INDICADOR_DIREITO',
      );

      expect(result).toBeNull();
    });
  });
});
