import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { StructuredLogger } from 'src/utils/logger';
import { ConfigService } from '@nestjs/config';
import { CadastroEmpresa } from '../types/CadastroEmpresa';
import type { MongoService } from 'src/mongo/mongo.service';
import { EmpresaDocument } from 'src/mongo/types/empresa';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../utils/soc-export-data-url';

const getMongoService = () =>
  require('../../mongo/mongo.service').MongoService;

@Injectable()
export class SocCompanyService implements OnModuleInit {
  private socCompaniesCache: Record<string, CadastroEmpresa> = {};
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(getMongoService))
    private readonly mongoService: MongoService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(SocCompanyService.name);
  }

  onModuleInit(): void {
    this.logger.log('Inicializando cache de empresas a partir do SOC...');
    // Não bloqueia o bootstrap do Nest. O refresh inicial acontece em background.
    void this.bootstrapCompaniesCache();
  }

  private async bootstrapCompaniesCache(): Promise<void> {
    try {
      // Tenta carregar do SOC primeiro; se falhar, tenta carregar do MongoDB como fallback
      await this.refreshCompanies();
    } catch (err) {
      this.logger.error(`Sincronização inicial do SOC falhou: ${err.message}. Tentando fallback do banco local...`);
      await this.loadCompaniesFromDb().catch((dbErr) => {
        this.logger.error(`Fallback do banco local também falhou: ${dbErr.message}`);
      });
    } finally {
      this.startBackgroundRefresh();
    }
  }

  private startBackgroundRefresh() {
    const FIVE_MINUTES = 300000;
    this.refreshTimer = setInterval(() => {
      this.refreshCompanies().catch((err) => {
        this.logger.error(`Sincronização automática do SOC falhou: ${err.message}`);
      });
    }, FIVE_MINUTES);
  }

  async refreshCompanies(): Promise<void> {
    this.logger.log('Iniciando sincronização periódica de empresas com o SOC...');
    try {
      const companies = await this.fetchRawSocCompanies();
      if (companies && companies.length > 0) {
        // Popula o cache em memória diretamente a partir do SOC (modelo original/estável)
        this.socCompaniesCache = {};
        companies.forEach((company) => {
          this.socCompaniesCache[company.CODIGO] = company;
        });
        this.logger.log(`Cache SOC atualizado: ${companies.length} empresas carregadas.`);
      } else {
        this.logger.warn('Nenhuma empresa retornada pelo SOC, mantendo cache existente.');
      }
    } catch (error) {
      this.logger.error(`Falha ao sincronizar com SOC: ${error instanceof Error ? error.message : String(error)}. Tentando carregar do banco local...`);
      // Se SOC falhar, tenta carregar do DB como fallback
      try {
        await this.loadCompaniesFromDb();
      } catch (dbError) {
        this.logger.error(`Falha ao carregar do banco local: ${dbError instanceof Error ? dbError.message : String(dbError)}. Mantendo cache existente.`);
      }
    }
  }

  /**
   * Retorna todas as empresas do cache SOC em memória, ordenadas por razão social.
   * O cache é populado diretamente do SOC (modelo estável) com refresh automático a cada 5 minutos.
   * Se o cache estiver vazio, tenta carregar do banco local.
   */
  async getCompaniesRegister(): Promise<CadastroEmpresa[]> {
    let companies = Object.values(this.socCompaniesCache);
    
    // Se o cache estiver vazio, tenta carregar do DB
    if (companies.length === 0) {
      this.logger.warn('Cache SOC de empresas vazio, tentando carregar do banco local...');
      try {
        await this.loadCompaniesFromDb();
        companies = Object.values(this.socCompaniesCache);
      } catch (error) {
        this.logger.error(`Falha ao carregar empresas do banco: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const companiesOrdened = companies.sort((a, b) =>
      (a.RAZAOSOCIAL || '').localeCompare(b.RAZAOSOCIAL || '', 'pt-BR', {
        sensitivity: 'base',
      }),
    );
    return companiesOrdened;
  }

  /**
   * Carrega as empresas do banco MongoDB local para o cache em memória.
   * Usado apenas como fallback quando o SOC não está disponível.
   */
  async loadCompaniesFromDb(): Promise<void> {
    try {
      const allDbCompanies = await this.mongoService.findAllEmpresas();
      if (allDbCompanies.length > 0) {
        this.socCompaniesCache = {};
        allDbCompanies.forEach((company) => {
          this.socCompaniesCache[company.CODIGO] = company as unknown as CadastroEmpresa;
        });
        this.logger.debug(
          `✅ SOC (fallback DB): ${Object.values(this.socCompaniesCache).length} empresas carregadas no cache do banco local`,
        );
      }
    } catch (error) {
      this.logger.error(
        `⚠️ SOC: Falha ao carregar cache de empresas do banco: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Busca as empresas diretamente da URL de exportação do SOC.
   * Não salva no banco de dados automaticamente.
   */
  async fetchRawSocCompanies(): Promise<CadastroEmpresa[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_CADASTRO_EMPRESAS',
      this.configService,
    );
    const url = buildSocExportDataUrl(
      {
        ...credentials,
        tipoSaida: 'json',
      },
      this.configService,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const arrayBuffer: ArrayBuffer = await response.arrayBuffer();
        if (arrayBuffer) {
          const arrayBufferDecoded = new TextDecoder('iso-8859-1').decode(arrayBuffer);
          const json = JSON.parse(arrayBufferDecoded) as CadastroEmpresa[];
          return json.filter((comp) => comp.ATIVO === '1');
        }
      }
      return [];
    } catch (error) {
      this.logger.error(
        `⚠️ SOC: Falha ao buscar lista bruta de empresas: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Obtém uma empresa específica do cache pelo código.
   */
  getCompanyByCode(codigo: string): CadastroEmpresa | undefined {
    return this.socCompaniesCache[codigo];
  }

  /**
   * Obtém todas as empresas do cache.
   */
  getAllCompanies(): Record<string, CadastroEmpresa> {
    return this.socCompaniesCache;
  }
}
