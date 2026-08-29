import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';

export interface UserSignatureSettings {
  id: string;
  user_codigo: string;
  assinatura_imagem_url: string | null;
  assina_digitalmente: boolean;
  psc_padrao: string | null;
  provider?: 'PSC' | 'BRYKMS'; // compatibilidade legada
  assinatura_provider?: 'PSC' | 'BRYKMS'; // campo atual no DB
  bry_user?: string; // compatibilidade legada
  uuid_cert?: string;
  pin?: string;
  assinatura_posicao: any | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Obtém as configurações de assinatura de um profissional pelo seu código.
   * Prioriza o banco de dados (Supabase), mas faz fallback para o arquivo estático se não encontrar.
   */
  async getSignatureSettings(
    userCodigo: string,
  ): Promise<UserSignatureSettings | null> {
    try {
      const client = this.supabaseService.getClient();

      const { data, error } = await client
        .from('user_settings')
        .select('*')
        .eq('user_codigo', userCodigo)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 é "No rows found"
        this.logger.error(
          `Erro ao buscar assinatura para user_codigo ${userCodigo}: ${error.message}`,
        );
      }

      if (data) {
        return data as UserSignatureSettings;
      }

      // Fallback para arquivo estático
      const staticUrl = ASSINATURAS_URL[userCodigo];
      if (staticUrl) {
        // Retorna um objeto "mockado" baseado no arquivo estático
        return {
          id: 'static-fallback',
          user_codigo: userCodigo,
          assinatura_imagem_url: staticUrl,
          assina_digitalmente: false,
          psc_padrao: null,
          assinatura_posicao: null,
        };
      }

      return null;
    } catch (err) {
      this.logger.error(`Exceção ao buscar assinatura: ${err}`);
      // Em caso de erro grave, tenta o fallback também
      const staticUrl = ASSINATURAS_URL[userCodigo];
      if (staticUrl) {
        return {
          id: 'static-fallback',
          user_codigo: userCodigo,
          assinatura_imagem_url: staticUrl,
          assina_digitalmente: false,
          psc_padrao: null,
          assinatura_posicao: null,
        };
      }
      return null;
    }
  }

  /**
   * Retorna apenas a URL da assinatura, já resolvendo a prioridade (DB -> Static -> null).
   */
  async getSignatureUrl(userCodigo: string): Promise<string | null> {
    const settings = await this.getSignatureSettings(userCodigo);
    return settings?.assinatura_imagem_url || null;
  }

  /**
   * Verifica se o profissional possui uma sessão PSC válida ou credenciais BRYKMS completas.
   */
  async hasValidSignatureSession(userCodigo: string): Promise<boolean> {
    const settings = await this.getSignatureSettings(userCodigo);
    if (!settings || !settings.assina_digitalmente) return false;

    const provider = settings.assinatura_provider || settings.provider;

    if (provider === 'BRYKMS') {
      const pin = String(settings.pin || '').trim();
      const uuidCert = String(settings.uuid_cert || '').trim();
      const legacyBryUser = String(settings.bry_user || '').trim();
      const hasIdentity = Boolean(uuidCert || legacyBryUser);
      return Boolean(pin && hasIdentity);
    }

    if (provider === 'PSC') {
      const session = await this.supabaseService.getValidPscSession(userCodigo);
      const signatureSession = String(session?.signature_session || '').trim();
      return Boolean(signatureSession);
    }

    return false;
  }

  /**
   * Proxy para o SupabaseService
   */
  async getPscSession(userCodigo: string): Promise<any | null> {
    return this.supabaseService.getValidPscSession(userCodigo);
  }
}
