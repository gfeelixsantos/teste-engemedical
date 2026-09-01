import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../soc/utils/soc-export-data-url';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly supabaseClient: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);
  private readonly socCacheTtlMs = 5 * 60 * 1000;
  private socProfessionalsCache: any[] | null = null;
  private socProfessionalsCacheAt = 0;

  constructor(private readonly configService: ConfigService) {
    const SUPABASE_URL = this.configService.get<string>('SUPABASE_URL');
    const SUPABASE_KEY = this.configService.get<string>('SUPABASE_KEY');

    this.supabaseClient = createClient(SUPABASE_URL!, SUPABASE_KEY!);
  }
  onModuleInit() {
    if (this.supabaseClient) this.logger.log('Supabase conectado!');
  }

  getClient() {
    return this.supabaseClient;
  }

  async getUserSettings(userCodigo: string): Promise<any | null> {
    try {
      const normalizedCodigo = String(userCodigo || '').trim();
      if (!normalizedCodigo) {
        return null;
      }

      const { data, error } = await this.supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_codigo', normalizedCodigo)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          this.logger.error(
            `Erro ao buscar user_settings para ${normalizedCodigo}: ${error.message}`,
          );
        }
        return null;
      }

      return data;
    } catch (err) {
      this.logger.error(
        `Excecao ao buscar user_settings: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async listProfessionalCodesWithValidPscSessions(
    limit = 100,
  ): Promise<string[]> {
    try {
      const now = new Date().toISOString();
      const maxRows = Math.min(Math.max(Number(limit || 100), 1), 500);

      const { data, error } = await this.supabaseClient
        .from('psc_sessions')
        .select('user_codigo, created_at')
        .eq('is_authorized', true)
        .gt('expires_at', now)
        .is('consumed_at', null)
        .is('invalid_reason', null)
        .order('created_at', { ascending: false })
        .limit(maxRows);

      if (error) {
        this.logger.error(
          `Erro ao listar sessoes PSC validas: ${error.message}`,
        );
        return [];
      }

      const seen = new Set<string>();
      const professionalCodes: string[] = [];

      for (const row of data || []) {
        const professionalCode = String(row?.user_codigo || '').trim();
        if (!professionalCode || seen.has(professionalCode)) {
          continue;
        }
        seen.add(professionalCode);
        professionalCodes.push(professionalCode);
      }

      return professionalCodes;
    } catch (err) {
      this.logger.error(
        `Excecao ao listar sessoes PSC validas: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  /**
   * Busca uma sessão PSC válida (não expirada ou dentro da validade) para um profissional.
   * Usa a tabela 'psc_sessions' que contém as colunas necessárias.
   */
  async getValidPscSession(userCodigo: string): Promise<any | null> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await this.supabaseClient
        .from('psc_sessions')
        .select('*')
        .eq('user_codigo', userCodigo)
        .eq('is_authorized', true)
        .gt('expires_at', now)
        .is('consumed_at', null)
        .is('invalid_reason', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          // PGRST116 = No rows found
          this.logger.error(
            `Erro ao buscar sessão PSC para ${userCodigo}: ${error.message}`,
          );
        }
        return null;
      }

      return data;
    } catch (err) {
      this.logger.error(`Exceção ao buscar sessão PSC: ${err.message}`);
      return null;
    }
  }

  /**
   * Busca metadados do profissional via cadastro SOC.
   */
  async getProfessionalMetadata(userCodigo: string): Promise<any | null> {
    try {
      const normalizedCodigo = String(userCodigo || '').trim();
      if (!normalizedCodigo) {
        return null;
      }

      const codigoCandidates = [normalizedCodigo];
      if (/^\d+$/.test(normalizedCodigo)) {
        const noLeadingZeros = normalizedCodigo.replace(/^0+/, '') || '0';
        const numericCode = Number(normalizedCodigo);

        codigoCandidates.push(noLeadingZeros);
        if (!Number.isNaN(numericCode)) {
          codigoCandidates.push(String(numericCode));
        }
      }

      const uniqueCandidates = codigoCandidates.filter(
        (value, index, self) => Boolean(value) && self.indexOf(value) === index,
      );

      for (const candidate of uniqueCandidates) {
        const candidateFilters: Array<string | number> = [candidate];
        if (/^\d+$/.test(candidate)) {
          const asNumber = Number(candidate);
          if (!Number.isNaN(asNumber)) {
            candidateFilters.push(asNumber);
          }
        }

        for (const filterValue of candidateFilters) {
          const socByCode = await this.findProfessionalInSoc({
            codigo: String(filterValue || '').trim(),
          });
          if (socByCode) {
            return socByCode;
          }
        }
      }

      if (!/^\d+$/.test(normalizedCodigo)) {
        const socByName = await this.findProfessionalInSoc({
          nome: normalizedCodigo,
        });
        if (socByName) {
          return socByName;
        }
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
      if (!normalizedName) {
        return null;
      }

      const cleanMedicalPrefix = normalizedName
        .replace(/^DRA?\.?\s+/i, '')
        .trim();

      const nameCandidates = [normalizedName, cleanMedicalPrefix].filter(
        (value, index, self) => Boolean(value) && self.indexOf(value) === index,
      );

      for (const candidate of nameCandidates) {
        const socByName = await this.findProfessionalInSoc({
          nome: candidate,
        });
        if (socByName) {
          return socByName;
        }
      }

      const socOnly = await this.findProfessionalInSoc({
        nome: cleanMedicalPrefix || normalizedName,
      });
      if (socOnly) {
        return socOnly;
      }

      return null;
    } catch (err) {
      this.logger.error(`Exceção ao buscar metadados por nome: ${err.message}`);
      return null;
    }
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

  private async fetchSocProfessionals(): Promise<any[] | null> {
    const now = Date.now();
    if (
      this.socProfessionalsCache &&
      now - this.socProfessionalsCacheAt < this.socCacheTtlMs
    ) {
      return this.socProfessionalsCache;
    }

    const credentials = getSocExportCredentials(
      'SOC_ED_CADASTRO_PESSOAS',
      this.configService,
    );
    const socUrl = buildSocExportDataUrl(
      {
        ...credentials,
        tipoSaida: 'json',
        ativo: '1',
      },
      this.configService,
    );

    try {
      const response = await fetch(socUrl, {
        signal: AbortSignal.timeout(7000),
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

    const codigoKey = this.normalizeCodeKey(params.codigo);
    if (codigoKey) {
      const byCode = people.find(
        (pessoa: any) => this.normalizeCodeKey(pessoa?.CODIGO) === codigoKey,
      );
      if (byCode) {
        return this.mapSocProfessional(byCode);
      }
    }

    const nomeKey = this.normalizeNameKey(params.nome || '');
    if (!nomeKey) return null;

    const tokens = nomeKey.split(' ').filter((token) => token.length >= 3);
    if (!tokens.length) return null;

    const ranked = people
      .map((pessoa: any) => {
        const candidateKey = this.normalizeNameKey(String(pessoa?.NOME || ''));
        const score = tokens.reduce(
          (acc, token) => acc + (candidateKey.includes(token) ? 1 : 0),
          0,
        );

        return {
          pessoa,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) return null;

    return this.mapSocProfessional(ranked[0].pessoa);
  }
}
