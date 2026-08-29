import { Injectable, Logger } from '@nestjs/common';
import { UserSettingsRepository } from './user-settings.repository';
import {
  IUserSettings,
  IUserSettingsResponse,
  IUserSettingsFullResponse,
  IUserSettingsRequest,
  IPscAuthStatus,
} from './user-settings.interface';
import { PscSessionRepository } from '../repositories/psc-session.repository';
import { SupabaseService } from '../supabase/supabase.service';
import { SocExportService } from '../soc/services/soc-export.service';


@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  private readonly settingsCache = new Map<string, { data: IUserSettingsFullResponse; expiry: number }>();
  private readonly SETTINGS_CACHE_TTL = 60_000; // 60s

  constructor(
    private readonly userSettingsRepository: UserSettingsRepository,
    private readonly pscSessionRepository: PscSessionRepository,
    private readonly supabaseService: SupabaseService,
    private readonly socExportService: SocExportService,
  ) {}

  private buildPscAuthStatus(pscSession: any): IPscAuthStatus {
    if (!pscSession) {
      return {
        status: 'NOT_AUTHENTICATED',
        isActive: false,
        expiresAt: null,
        pscName: null,
      };
    }

    const now = new Date();
    const expiresAt = new Date(pscSession.expires_at);

    if (expiresAt < now) {
      return {
        status: 'EXPIRED',
        isActive: false,
        expiresAt: pscSession.expires_at,
        pscName: pscSession.psc_name || null,
      };
    }

    return {
      status: 'ACTIVE',
      isActive: true,
      expiresAt: pscSession.expires_at,
      pscName: pscSession.psc_name || null,
    };
  }

  async getUserSettings(
    userCodigo: string,
  ): Promise<IUserSettingsFullResponse> {
    const cached = this.settingsCache.get(userCodigo);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const settings =
      await this.userSettingsRepository.findByUserCodigo(userCodigo);

    const pscSession =
      await this.pscSessionRepository.findValidAuthorizedSessionByUserCodigo(
        userCodigo,
      );

    const pscAuthStatus = this.buildPscAuthStatus(pscSession);

    let userInfo: IUserSettingsFullResponse['user'] | null = null;

    try {
      const client = this.supabaseService.getClient();
      const { data: supabaseUser } = await client
        .from('users')
        .select('*')
        .eq('codigo', userCodigo)
        .single();

      if (supabaseUser) {
        try {
          const pessoas = await this.socExportService.EdCadastroPessoas();
          if (pessoas) {
            const pessoa = pessoas.find((p: any) => p.CODIGO === userCodigo);
            if (pessoa) {
              userInfo = {
                codigo: pessoa.CODIGO,
                nome: pessoa.NOME,
                cpf: pessoa.CPF,
                conselho: supabaseUser.conselho || pessoa.CONSELHO_CLASSE,
                ufconselho: supabaseUser.ufconselho || pessoa.UF_CONSELHO,
                perfil: supabaseUser.perfil || pessoa.REGISTRO_FUNCIONAL,
              };
            }
          }
        } catch (socError) {
          this.logger.warn(
            'SOC Service unavailable or timed out, skipping SOC enrichment',
            socError,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error fetching user info:', error);
    }

    if (!userInfo) {
      userInfo = {
        codigo: userCodigo,
        nome: 'Usuário',
        cpf: '',
        perfil: '',
      };
    }

    let settingsResponse: IUserSettingsResponse | null = null;

    if (settings) {
      settingsResponse = {
        userCodigo: settings.user_codigo,
        assinaturaImagemUrl: settings.assinatura_imagem_url || null,
        assinaDigitalmente: settings.assina_digitalmente,
        pscPadrao: settings.psc_padrao || null,
        assinaturaProvider: settings.assinatura_provider || null,
        uuidCert: settings.uuid_cert || null,
      };
    }

    const result: IUserSettingsFullResponse = {
      user: userInfo,
      settings: settingsResponse,
      pscAuthStatus,
    };

    this.settingsCache.set(userCodigo, {
      data: result,
      expiry: Date.now() + this.SETTINGS_CACHE_TTL,
    });

    return result;
  }

  async saveUserSettings(
    settings: IUserSettingsRequest,
  ): Promise<IUserSettingsResponse> {
    console.log(
      '[DEBUG SERVICE] Recebido do controller:',
      JSON.stringify(settings),
    );
    // Validações obrigatórias
    if (settings.assinaDigitalmente) {
      if (!settings.assinaturaProvider) {
        throw new Error(
          'Quando a assinatura digital está ativa, um provedor de assinatura é obrigatório.',
        );
      }

      if (settings.assinaturaProvider === 'BRYKMS') {
        if (!settings.uuidCert || settings.uuidCert.trim() === '') {
          throw new Error(
            'Para o provedor BRy Cloud, o ID Cert (UUID) é obrigatório.',
          );
        }
        if (!settings.pin || settings.pin.trim() === '') {
          throw new Error(
            'Para o provedor BRy Cloud, o PIN do certificado é obrigatório.',
          );
        }
      }
    }

    // Agora aceitamos psc_padrao nulo mesmo com assina_digitalmente=true,
    // pois a constraint no banco foi ajustada/removida para permitir escolha dinâmica no login.
    const assinaDigitalmente = settings.assinaDigitalmente;
    const pscPadrao = settings.pscPadrao || null;

    const userSettings: IUserSettings = {
      user_codigo: settings.userCodigo,
      assinatura_imagem_url: settings.assinaturaImagemUrl || null,
      assina_digitalmente: assinaDigitalmente,
      psc_padrao: pscPadrao,
      assinatura_provider: settings.assinaturaProvider || null,
      uuid_cert: settings.uuidCert || null,
      pin: settings.pin || null, // PIN recebido do frontend (já em base64)
    };

    console.log(
      '[DEBUG SERVICE] Mapeado para IUserSettings:',
      JSON.stringify(userSettings),
    );

    const result = await this.userSettingsRepository.upsert(userSettings);

    this.settingsCache.delete(settings.userCodigo);

    console.log(
      '[DEBUG SERVICE] Resultado do repository:',
      JSON.stringify(result),
    );

    // Se configurou credenciais BRYKMS, disparar reprocessamento de ASOs pendentes
    if (
      assinaDigitalmente &&
      settings.assinaturaProvider === 'BRYKMS' &&
      settings.uuidCert &&
      settings.pin
    ) {
      this.logger.log(
        `[UserSettingsService] Credenciais BRYKMS configuradas para ${settings.userCodigo}. O cmso360-worker absorverá as pendências na próxima rotina.`,
      );
    }

    return {
      userCodigo: settings.userCodigo,
      assinaturaImagemUrl: settings.assinaturaImagemUrl || null,
      assinaDigitalmente: assinaDigitalmente,
      pscPadrao: pscPadrao,
      assinaturaProvider: settings.assinaturaProvider || null,
      uuidCert: settings.uuidCert || null,
    };
  }
}
