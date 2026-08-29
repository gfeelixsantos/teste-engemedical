import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PscSessionService } from './psc-session.service';
import { IUserInfo } from 'src/user/interfaces/user.interface';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PscAuthService {
  private readonly logger = new Logger(PscAuthService.name);

  private readonly authUrl: string;
  private readonly integraUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private tokenCache: { accessToken: string; expiresAt: number } | null = null;

  private isProductionRuntime(): boolean {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      return true;
    }

    const lifecycle = String(process.env.npm_lifecycle_event || '')
      .trim()
      .toLowerCase();

    return lifecycle === 'start' || Boolean(process.env.DYNO);
  }

  constructor(
    private readonly pscSessionService: PscSessionService,
    private readonly configService: ConfigService,
  ) {
    this.authUrl = this.configService.get<string>('BRY_AUTH_URL', '');
    this.integraUrl = this.configService.get<string>('BRY_INTEGRA_URL', '');
    this.clientId = this.configService.get<string>('BRY_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('BRY_CLIENT_SECRET', '');

    // Prioridade: BRY_REDIRECT_URI explicito > BACKEND_URL_PROD em producao > fallback local
    const explicitRedirect = this.configService
      .get<string>('BRY_REDIRECT_URI', '')
      .trim();
    const isProd = this.isProductionRuntime();
    const backendBaseUrl = (
      isProd
        ? this.configService.get<string>('BACKEND_URL_PROD', '')
        : this.configService.get<string>('BACKEND_URL', 'http://127.0.0.1:3333')
    ).trim();

    const resolvedBase = (backendBaseUrl || 'http://127.0.0.1:3333').replace(
      /\/$/,
      '',
    );
    this.redirectUri = explicitRedirect || `${resolvedBase}/psc/auth/callback`;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.tokenCache && this.tokenCache.expiresAt > now) {
      this.logger.debug('[getAccessToken] Reutilizando token em cache valido');
      return this.tokenCache.accessToken;
    }

    this.logger.debug(
      `[getAccessToken] Gerando novo token de acesso POST ${this.authUrl}`,
    );

    const bodyParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const responseText = await response.text();

      if (!response.ok) {
        this.logger.error(
          `[getAccessToken] Erro na autenticacao: ${responseText}`,
        );
        throw new Error(`Falha na autenticacao: ${response.status}`);
      }

      const data = JSON.parse(responseText);
      const expiresIn = data.expires_in || 3600;
      const marginSeconds = 300;

      this.tokenCache = {
        accessToken: data.access_token,
        expiresAt: now + (expiresIn - marginSeconds) * 1000,
      };

      return this.tokenCache.accessToken;
    } catch (error) {
      this.logger.error('[getAccessToken] Erro ao gerar token:', error.message);
      throw error;
    }
  }

  async startAuth(user: IUserInfo, reqProvider?: string): Promise<string> {
    this.logger.log(
      `[startAuth] Iniciando para user: ${user?.codigo}, provider requisitado: ${reqProvider}`,
    );
    try {
      this.logger.debug(
        `[startAuth] Verificando configuracao de variaveis de ambiente...`,
      );

      const missingEnvs: string[] = [];
      if (!this.authUrl) missingEnvs.push('BRY_AUTH_URL');
      if (!this.integraUrl) missingEnvs.push('BRY_INTEGRA_URL');
      if (!this.clientId) missingEnvs.push('BRY_CLIENT_ID');
      if (!this.clientSecret) missingEnvs.push('BRY_CLIENT_SECRET');
      if (!this.redirectUri) missingEnvs.push('BRY_REDIRECT_URI');

      if (missingEnvs.length > 0) {
        this.logger.error(
          `[startAuth] Application not fully configured for PSC auth. Campos obrigatorios ausentes: ${missingEnvs.join(', ')}`,
        );
        throw new Error('Application not fully configured for PSC auth.');
      }

      const state = randomUUID();
      const provider = reqProvider || '';

      const token = await this.getAccessToken();
      const linkUrl = `${this.integraUrl}/psc/link`;

      const configuredLifetime = parseInt(
        this.configService.get<string>('BRY_PSC_LIFETIME', '36000'),
        10,
      );

      const body = {
        pscName: provider,
        redirectUri: this.redirectUri,
        state,
        scope: 'signature_session',
        lifetime:
          Number.isFinite(configuredLifetime) && configuredLifetime > 0
            ? configuredLifetime
            : 36000,
      };

      this.logger.debug(
        `[startAuth] Chamando API BRy ${linkUrl} para provedor ${provider}`,
      );

      const response = await fetch(linkUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `[startAuth] Falha no psc/link HTTP ${response.status}: ${errorText}`,
        );
        throw new Error(`Falha na comunicacao com API BRy: ${response.status}`);
      }

      const responseData = await response.json();
      const authUrl = responseData.url;
      const signatureSessionToken = responseData.token;

      if (!authUrl || !signatureSessionToken) {
        throw new Error('Retorno da API BRy nao contem url ou token.');
      }

      this.logger.debug(`[startAuth] URL Final montada: ${authUrl}`);

      // Persiste com o mesmo lifetime efetivo da BRy, evitando divergencia local vs remota.
      const bryEffectiveLifetime = Number(
        responseData?.lifetime || responseData?.expires_in || body.lifetime,
      );
      const finalLifetime =
        Number.isFinite(bryEffectiveLifetime) && bryEffectiveLifetime > 0
          ? bryEffectiveLifetime
          : body.lifetime;

      await this.pscSessionService.saveSession(
        user,
        provider,
        signatureSessionToken,
        state,
        finalLifetime,
        this.integraUrl,
      );

      return authUrl;
    } catch (error) {
      this.logger.error(`Error starting PSC auth: ${error.message}`);
      throw error;
    }
  }

  async handleCallback(code: string, state: string): Promise<void> {
    try {
      if (!state) {
        throw new HttpException(
          'State unknown or missing',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`[handleCallback] Recebido callback com state: ${state}`);

      const session = await this.pscSessionService.getSessionByState(state);
      if (!session) {
        this.logger.error(
          `[handleCallback] Callback received for unknown state: ${state}`,
        );
        throw new HttpException(
          'State unknown or expired',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.pscSessionService.authorizeSessionByState(state);

      this.logger.log(
        `[handleCallback] Session authorized via callback for state ${state}`,
      );
    } catch (error) {
      this.logger.error(
        `[handleCallback] Error in handleCallback: ${error.message}`,
      );
      throw error;
    }
  }
}
