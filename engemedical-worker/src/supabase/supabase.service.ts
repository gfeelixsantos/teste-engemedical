import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EncryptionService } from '../encryption/encryption.service';
import { IUserSettings } from '../interfaces/settings';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private readonly encryptionService: EncryptionService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error(
        'Supabase URL or Key is missing in environment variables',
      );
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  private buildCadastroPessoasUrl(): string | null {
    const baseUrl =
      process.env.SOC_EXPORT_DATA_BASE_URL ||
      'https://ws1.soc.com.br/WebSoc/exportadados';
    const empresa = process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL;
    const codigo = process.env.SOC_ED_CADASTRO_PESSOAS_CODIGO;
    const chave = process.env.SOC_ED_CADASTRO_PESSOAS_CHAVE;

    if (!empresa || !codigo || !chave) {
      return null;
    }

    const parametro = encodeURIComponent(
      JSON.stringify({
        empresa,
        codigo,
        chave,
        tipoSaida: 'json',
        ativo: '1',
      }),
    );

    return `${baseUrl}?parametro=${parametro}`;
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client is not initialized');
    }

    return this.supabase;
  }

  async getUserSettings(userCodigo: string): Promise<IUserSettings | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_codigo', userCodigo)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error(`Error fetching user settings: ${error.message}`);
    }

    if (data) {
      // Remove PIN fields from response for security.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bry_cloud_pin, pin, ...settingsWithoutPin } = data;
      return settingsWithoutPin as IUserSettings;
    }

    return data;
  }

  async getValidPscSession(userCodigo: string) {
    if (!this.supabase) return null;

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('psc_sessions')
      .select('*')
      .eq('user_codigo', userCodigo)
      .eq('is_authorized', true)
      .gt('expires_at', now)
      .is('invalid_reason', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error(`Error fetching psc session: ${error.message}`);
    }

    return data;
  }

  async invalidatePscSession(
    userCodigo: string,
    signatureSession: string,
    reason: string,
  ) {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from('psc_sessions')
      .update({
        has_error: true,
        invalid_reason: reason,
        consumed_at: new Date().toISOString(),
      })
      .eq('user_codigo', userCodigo)
      .eq('signature_session', signatureSession);

    if (error) {
      this.logger.error(
        `Error invalidating psc session for ${userCodigo}: ${error.message}`,
      );
    } else {
      this.logger.log(
        `Invalidated PSC session for ${userCodigo} due to: ${reason}`,
      );
    }
  }

  async markPscSessionConsumed(userCodigo: string, signatureSession: string) {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from('psc_sessions')
      .update({
        consumed_at: new Date().toISOString(),
      })
      .eq('user_codigo', userCodigo)
      .eq('signature_session', signatureSession);

    if (error) {
      this.logger.error(
        `Error marking psc session as consumed for ${userCodigo}: ${error.message}`,
      );
    } else {
      this.logger.log(
        `Successfully marked PSC session as consumed for ${userCodigo}`,
      );
    }
  }

  async updateUserSettings(
    userCodigo: string,
    settings: Partial<IUserSettings>,
  ): Promise<IUserSettings | null> {
    if (!this.supabase) return null;

    try {
      const updateData: Partial<IUserSettings> & { updated_at: string } = {
        ...settings,
        user_codigo: userCodigo,
        updated_at: new Date().toISOString(),
      };

      // Encrypt legacy BRYKMS PIN field before persisting it.
      if (settings.bry_cloud_pin) {
        updateData.bry_cloud_pin = this.encryptionService.encrypt(
          settings.bry_cloud_pin,
        );
      }

      const { data, error } = await this.supabase
        .from('user_settings')
        .upsert(updateData, {
          onConflict: 'user_codigo',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(
          `Error updating user settings for ${userCodigo}: ${error.message}`,
        );
        return null;
      }

      // Remove PIN fields from response.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bry_cloud_pin, pin, ...settingsWithoutPin } = data;
      return settingsWithoutPin as IUserSettings;
    } catch (error) {
      this.logger.error(
        `Error in updateUserSettings for ${userCodigo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async getUserSettingsWithPin(
    userCodigo: string,
  ): Promise<IUserSettings | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_codigo', userCodigo)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error(
        `Error fetching user settings with pin: ${error.message}`,
      );
    }

    if (data) {
      data.bry_cloud_pin = this.decryptPinWithFallback(
        data.bry_cloud_pin,
        userCodigo,
        'bry_cloud_pin',
      );
      data.pin = this.decryptPinWithFallback(data.pin, userCodigo, 'pin');
    }

    return data;
  }

  private decryptPinWithFallback(
    value: string | null | undefined,
    userCodigo: string,
    fieldName: string,
  ): string | null {
    if (!value) return null;

    try {
      return this.encryptionService.decrypt(value);
    } catch {
      this.logger.warn(
        `PIN field ${fieldName} for ${userCodigo} is not encrypted or failed to decrypt; using raw value.`,
      );
      return value;
    }
  }

  // --- PROFESSIONAL METADATA RESOLUTION (SOC) ---
  private readonly socCacheTtlMs = 15 * 60 * 1000;
  private socProfessionalsCache: any[] | null = null;
  private socProfessionalsCacheAt = 0;

  async getProfessionalMetadata(userCodigo: string): Promise<any | null> {
    try {
      const normalizedCodigo = String(userCodigo || '').trim();
      if (!normalizedCodigo) return null;

      const candidates = [normalizedCodigo];
      if (/^\d+$/.test(normalizedCodigo)) {
        candidates.push(normalizedCodigo.replace(/^0+/, '') || '0');
        candidates.push(String(Number(normalizedCodigo)));
      }

      const uniqueCandidates = [...new Set(candidates)];

      for (const candidate of uniqueCandidates) {
        const socByCode = await this.findProfessionalInSoc({
          codigo: candidate,
        });
        if (socByCode) return socByCode;
      }

      return null;
    } catch (err) {
      this.logger.error(
        `Exceção ao buscar metadados do profissional: ${err.message}`,
      );
      return null;
    }
  }

  async getProfessionalMetadataByName(name: string): Promise<any | null> {
    try {
      const normalizedName = String(name || '').trim();
      if (!normalizedName) return null;

      const socByName = await this.findProfessionalInSoc({
        nome: normalizedName,
      });
      return socByName;
    } catch (err) {
      this.logger.error(`Exceção ao buscar metadados por nome: ${err.message}`);
      return null;
    }
  }

  private async fetchSocProfessionals(): Promise<any[] | null> {
    const now = Date.now();
    if (
      this.socProfessionalsCache &&
      now - this.socProfessionalsCacheAt < this.socCacheTtlMs
    ) {
      return this.socProfessionalsCache;
    }

    const socUrl = this.buildCadastroPessoasUrl();
    if (!socUrl) {
      this.logger.warn('SOC_ED_CADASTRO_PESSOAS não configurado.');
      return null;
    }

    try {
      const response = await fetch(socUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Falha ao consultar SOC_ED_CADASTRO_PESSOAS. status=${response.status}`,
        );
        return null;
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : null;
      this.socProfessionalsCache = list;
      this.socProfessionalsCacheAt = Date.now();
      return list;
    } catch (error) {
      this.logger.warn(
        `Não foi possível consultar cadastro SOC para enriquecimento: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async findProfessionalInSoc(params: {
    codigo?: string;
    nome?: string;
  }): Promise<any | null> {
    const people = await this.fetchSocProfessionals();
    if (!people?.length) return null;

    if (params.codigo) {
      const codigoKey = this.normalizeCodeKey(params.codigo);
      const byCode = people.find(
        (p: any) => this.normalizeCodeKey(p?.CODIGO) === codigoKey,
      );
      if (byCode) return this.mapSocProfessional(byCode);
    }

    if (params.nome) {
      const nomeKey = this.normalizeNameKey(params.nome);
      const tokens = nomeKey.split(' ').filter((t) => t.length >= 3);
      if (!tokens.length) return null;

      const ranked = people
        .map((pessoa: any) => {
          const candidateKey = this.normalizeNameKey(
            String(pessoa?.NOME || ''),
          );
          const score = tokens.reduce(
            (acc, token) => acc + (candidateKey.includes(token) ? 1 : 0),
            0,
          );
          return { pessoa, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      if (ranked.length) return this.mapSocProfessional(ranked[0].pessoa);
    }

    return null;
  }

  private normalizeNameKey(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^DRA?\.?\s+/i, '')
      .replace(/[^A-Za-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private normalizeCodeKey(value: any): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (!/^\d+$/.test(raw)) return raw;
    return String(Number(raw));
  }

  private mapSocProfessional(pessoa: any): any {
    if (!pessoa) return null;
    return {
      codigo: String(pessoa?.CODIGO || '').trim(),
      nome: String(pessoa?.NOME || '').trim(),
      cpf: String(pessoa?.CPF || '').trim(),
      conselho: String(
        pessoa?.CONSELHO || pessoa?.CONSELHO_CLASSE || '',
      ).trim(),
      ufconselho: String(
        pessoa?.UFCONSELHO || pessoa?.UF_CONSELHO || '',
      ).trim(),
    };
  }
}
