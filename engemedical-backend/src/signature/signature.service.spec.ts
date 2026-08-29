import { Test, TestingModule } from '@nestjs/testing';
import { SignatureService, UserSignatureSettings } from './signature.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';

describe('SignatureService', () => {
  let service: SignatureService;
  let supabaseServiceMock: jest.Mocked<SupabaseService>;

  const mockClient = {
    from: jest.fn(),
  };

  const createMockQuery = (result: { data: any; error: any }) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(result),
      }),
    }),
  });

  beforeEach(async () => {
    supabaseServiceMock = {
      getClient: jest.fn().mockReturnValue(mockClient),
      getValidPscSession: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignatureService,
        {
          provide: SupabaseService,
          useValue: supabaseServiceMock,
        },
      ],
    }).compile();

    service = module.get<SignatureService>(SignatureService);
    jest.clearAllMocks();
  });

  describe('getSignatureSettings', () => {
    it('deve retornar dados do banco quando existir', async () => {
      const dbData: UserSignatureSettings = {
        id: 'db-123',
        user_codigo: '100',
        assinatura_imagem_url: 'https://example.com/signature.png',
        assina_digitalmente: true,
        psc_padrao: 'PSC-001',
        assinatura_posicao: { x: 100, y: 200 },
      };

      mockClient.from.mockReturnValue(
        createMockQuery({ data: dbData, error: null }),
      );

      const result = await service.getSignatureSettings('100');

      expect(result).toEqual(dbData);
      expect(supabaseServiceMock.getClient).toHaveBeenCalled();
    });

    it('deve usar fallback quando não existir no banco', async () => {
      mockClient.from.mockReturnValue(
        createMockQuery({ data: null, error: { code: 'PGRST116' } }),
      );

      const result = await service.getSignatureSettings('450');

      expect(result).toEqual({
        id: 'static-fallback',
        user_codigo: '450',
        assinatura_imagem_url: ASSINATURAS_URL['450'],
        assina_digitalmente: false,
        psc_padrao: null,
        assinatura_posicao: null,
      });
    });

    it('deve usar posição padrão quando assinatura_posicao for null', async () => {
      const dbData: UserSignatureSettings = {
        id: 'db-456',
        user_codigo: '200',
        assinatura_imagem_url: 'https://example.com/signature2.png',
        assina_digitalmente: false,
        psc_padrao: null,
        assinatura_posicao: null,
      };

      mockClient.from.mockReturnValue(
        createMockQuery({ data: dbData, error: null }),
      );

      const result = await service.getSignatureSettings('200');

      expect(result).toEqual({
        ...dbData,
        assinatura_posicao: null,
      });
      expect(result?.assinatura_posicao).toBeNull();
    });

    it('deve retornar null quando não existir nem no banco nem no hardcode', async () => {
      mockClient.from.mockReturnValue(
        createMockQuery({ data: null, error: { code: 'PGRST116' } }),
      );

      const result = await service.getSignatureSettings('99999');

      expect(result).toBeNull();
    });

    it('deve tentar fallback em caso de erro no banco', async () => {
      mockClient.from.mockReturnValue(
        createMockQuery({ data: null, error: { code: 'PGRST116' } }),
      );

      const result = await service.getSignatureSettings('450');

      expect(result).not.toBeNull();
      expect(result?.user_codigo).toBe('450');
    });
  });

  describe('getSignatureUrl', () => {
    it('deve retornar URL quando existir no banco', async () => {
      const dbData: UserSignatureSettings = {
        id: 'db-123',
        user_codigo: '100',
        assinatura_imagem_url: 'https://example.com/signature.png',
        assina_digitalmente: true,
        psc_padrao: null,
        assinatura_posicao: null,
      };

      mockClient.from.mockReturnValue(
        createMockQuery({ data: dbData, error: null }),
      );

      const result = await service.getSignatureUrl('100');

      expect(result).toBe('https://example.com/signature.png');
    });

    it('deve retornar null quando não encontrar em nenhum lugar', async () => {
      mockClient.from.mockReturnValue(
        createMockQuery({ data: null, error: { code: 'PGRST116' } }),
      );

      const result = await service.getSignatureUrl('99999');

      expect(result).toBeNull();
    });
  });

  describe('hasValidSignatureSession', () => {
    it('deve validar BRYKMS apenas com pin e identidade', async () => {
      const dbData: UserSignatureSettings = {
        id: 'bry-1',
        user_codigo: '1006',
        assinatura_imagem_url: null,
        assina_digitalmente: true,
        psc_padrao: null,
        assinatura_provider: 'BRYKMS',
        uuid_cert: 'uuid-123',
        pin: 'YWJjMTIz',
        assinatura_posicao: null,
      };

      mockClient.from.mockReturnValue(
        createMockQuery({ data: dbData, error: null }),
      );

      const result = await service.hasValidSignatureSession('1006');
      expect(result).toBe(true);
      expect(supabaseServiceMock.getValidPscSession).not.toHaveBeenCalled();
    });

    it('deve invalidar BRYKMS sem uuid_cert e sem bry_user', async () => {
      const dbData: UserSignatureSettings = {
        id: 'bry-2',
        user_codigo: '1006',
        assinatura_imagem_url: null,
        assina_digitalmente: true,
        psc_padrao: null,
        assinatura_provider: 'BRYKMS',
        pin: 'YWJjMTIz',
        assinatura_posicao: null,
      };

      mockClient.from.mockReturnValue(
        createMockQuery({ data: dbData, error: null }),
      );

      const result = await service.hasValidSignatureSession('1006');
      expect(result).toBe(false);
    });

    it('deve validar PSC apenas com signature_session disponível', async () => {
      const dbData: UserSignatureSettings = {
        id: 'psc-1',
        user_codigo: '1698',
        assinatura_imagem_url: null,
        assina_digitalmente: true,
        psc_padrao: null,
        assinatura_provider: 'PSC',
        assinatura_posicao: null,
      };

      mockClient.from.mockReturnValue(
        createMockQuery({ data: dbData, error: null }),
      );
      supabaseServiceMock.getValidPscSession.mockResolvedValue({
        signature_session: 'token-valido',
      } as any);

      const result = await service.hasValidSignatureSession('1698');
      expect(result).toBe(true);
    });

    it('deve invalidar PSC quando sessão não possuir token', async () => {
      const dbData: UserSignatureSettings = {
        id: 'psc-2',
        user_codigo: '1698',
        assinatura_imagem_url: null,
        assina_digitalmente: true,
        psc_padrao: null,
        assinatura_provider: 'PSC',
        assinatura_posicao: null,
      };

      mockClient.from.mockReturnValue(
        createMockQuery({ data: dbData, error: null }),
      );
      supabaseServiceMock.getValidPscSession.mockResolvedValue({} as any);

      const result = await service.hasValidSignatureSession('1698');
      expect(result).toBe(false);
    });
  });
});
