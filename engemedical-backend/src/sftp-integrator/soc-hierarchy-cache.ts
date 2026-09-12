import { Logger } from '@nestjs/common';

export type SocHierarchyItem = {
  CODIGO_EMPRESA: string;
  NOME_EMPRESA: string;
  ATIVO_EMPRESA: string;
  CODIGO_UNIDADE: string;
  NOME_UNIDADE: string;
  CODIGO_UNIDADE_RH: string;
  ATIVO_UNIDADE: string;
  CODIGO_SETOR: string;
  NOME_SETOR: string;
  CODIGO_SETOR_RH: string;
  ATIVO_SETOR: string;
  CODIGO_CARGO: string;
  NOME_CARGO: string;
  CODIGO_CARGO_RH: string;
  ATIVO_CARGO: string;
  HIERARQUIA_ATIVA: string;
};

export type HierarchyLookupResult = {
  found: boolean;
  codigoRh?: string;
  nome?: string;
  ativo?: boolean;
};

/**
 * Cache de hierarquia do SOC via Exporta Dados.
 * Baixa todos os setores/cargos/unidades ativos da empresa
 * e permite lookup rápido por nome.
 */
export class SocHierarchyCache {
  private readonly logger = new Logger(SocHierarchyCache.name);
  private items: SocHierarchyItem[] = [];
  private loaded = false;

  // Maps: nome (UPPER) → código RH
  private setorByNome = new Map<string, string>();
  private cargoByNome = new Map<string, string>();
  private unidadeByNome = new Map<string, string>();

  // Maps: código RH → nome
  private setorByCodigoRh = new Map<string, string>();
  private cargoByCodigoRh = new Map<string, string>();

  get isLoaded() {
    return this.loaded;
  }

  get totalCount() {
    return this.items.length;
  }

  /**
   * Carrega a hierarquia do SOC via Exporta Dados
   */
  async load(): Promise<void> {
    const empresa = process.env.SOC_EXPORTA_DADOS_EMPRESA_GRUPO_TORA || '2182291';
    const codigo = process.env.SOC_EXPORTA_DADOS_CODIGO;
    const chave = process.env.SOC_EXPORTA_DADOS_CHAVE;

    if (!codigo || !chave) {
      this.logger.warn(
        '[HIERARCHY_CACHE] SOC_EXPORTA_DADOS_CODIGO/CHAVE não configurados. Cache de hierarquia desabilitado.',
      );
      return;
    }

    const params = JSON.stringify({
      empresa,
      codigo,
      chave,
      tipoSaida: 'json',
    });

    const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(params)}`;
    this.logger.log(`[HIERARCHY_CACHE] Consultando hierarquia do SOC (empresa ${empresa})...`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const data = JSON.parse(text);

      // Normalizar: pode vir como array ou objeto com array
      if (Array.isArray(data)) {
        this.items = data;
      } else if (data.hierarquias && Array.isArray(data.hierarquias)) {
        this.items = data.hierarquias;
      } else if (data.data && Array.isArray(data.data)) {
        this.items = data.data;
      } else {
        this.items = [data];
      }

      this.buildMaps();
      this.loaded = true;

      this.logger.log(
        `[HIERARCHY_CACHE] ✅ ${this.items.length} itens carregados | ` +
        `${this.setorByNome.size} setores | ${this.cargoByNome.size} cargos | ${this.unidadeByNome.size} unidades`,
      );
    } catch (error) {
      this.logger.error(`[HIERARCHY_CACHE] ❌ Falha ao carregar hierarquia: ${error}`);
      this.loaded = false;
    }
  }

  /**
   * Constrói os maps de lookup (apenas itens ATIVOS)
   */
  private buildMaps(): void {
    this.setorByNome.clear();
    this.cargoByNome.clear();
    this.unidadeByNome.clear();
    this.setorByCodigoRh.clear();
    this.cargoByCodigoRh.clear();

    for (const item of this.items) {
      // Apenas itens ativos
      if (item.ATIVO_SETOR === 'Sim' || item.ATIVO_SETOR === 'S') {
        const nomeUpper = (item.NOME_SETOR || '').toUpperCase().trim();
        if (nomeUpper && item.CODIGO_SETOR_RH) {
          this.setorByNome.set(nomeUpper, item.CODIGO_SETOR_RH);
          this.setorByCodigoRh.set(item.CODIGO_SETOR_RH, item.NOME_SETOR);
        }
      }

      if (item.ATIVO_CARGO === 'Sim' || item.ATIVO_CARGO === 'S') {
        const nomeUpper = (item.NOME_CARGO || '').toUpperCase().trim();
        if (nomeUpper && item.CODIGO_CARGO_RH) {
          this.cargoByNome.set(nomeUpper, item.CODIGO_CARGO_RH);
          this.cargoByCodigoRh.set(item.CODIGO_CARGO_RH, item.NOME_CARGO);
        }
      }

      if (item.ATIVO_UNIDADE === 'Sim' || item.ATIVO_UNIDADE === 'S') {
        const nomeUpper = (item.NOME_UNIDADE || '').toUpperCase().trim();
        if (nomeUpper && item.CODIGO_UNIDADE_RH) {
          this.unidadeByNome.set(nomeUpper, item.CODIGO_UNIDADE_RH);
        }
      }
    }
  }

  /**
   * Busca setor por código RH
   */
  findSetorByCodigoRh(codigoRh: string): HierarchyLookupResult {
    if (!this.loaded) return { found: false };
    const nome = this.setorByCodigoRh.get(codigoRh);
    if (nome) {
      return { found: true, codigoRh, nome, ativo: true };
    }
    return { found: false };
  }

  /**
   * Busca cargo por código RH
   */
  findCargoByCodigoRh(codigoRh: string): HierarchyLookupResult {
    if (!this.loaded) return { found: false };
    const nome = this.cargoByCodigoRh.get(codigoRh);
    if (nome) {
      return { found: true, codigoRh, nome, ativo: true };
    }
    return { found: false };
  }

  /**
   * Normaliza nome para comparação (remove hífens, espaços extras, acentos)
   */
  private normalizeNome(nome: string): string {
    return (nome || '')
      .toUpperCase()
      .trim()
      .replace(/[-–—]/g, ' ')   // hífens → espaço
      .replace(/\s+/g, ' ')     // múltiplos espaços → um
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // remove acentos
      .trim();
  }

  /**
   * Busca setor por nome e retorna código RH (com fuzzy matching)
   */
  findSetorByNome(nome: string): HierarchyLookupResult {
    if (!this.loaded) return { found: false };
    
    // 1. Busca exata
    const nomeUpper = (nome || '').toUpperCase().trim();
    const codigoRh = this.setorByNome.get(nomeUpper);
    if (codigoRh) {
      return { found: true, codigoRh, nome, ativo: true };
    }
    
    // 2. Busca normalizada (remove hífens, espaços extras)
    const nomeNormalizado = this.normalizeNome(nome);
    for (const [key, value] of this.setorByNome) {
      if (this.normalizeNome(key) === nomeNormalizado) {
        return { found: true, codigoRh: value, nome, ativo: true };
      }
    }
    
    return { found: false, nome };
  }

  /**
   * Busca cargo por nome e retorna código RH (com fuzzy matching)
   */
  findCargoByNome(nome: string): HierarchyLookupResult {
    if (!this.loaded) return { found: false };
    
    // 1. Busca exata
    const nomeUpper = (nome || '').toUpperCase().trim();
    const codigoRh = this.cargoByNome.get(nomeUpper);
    if (codigoRh) {
      return { found: true, codigoRh, nome, ativo: true };
    }
    
    // 2. Busca normalizada
    const nomeNormalizado = this.normalizeNome(nome);
    for (const [key, value] of this.cargoByNome) {
      if (this.normalizeNome(key) === nomeNormalizado) {
        return { found: true, codigoRh: value, nome, ativo: true };
      }
    }
    
    return { found: false, nome };
  }

  /**
   * Busca unidade por nome e retorna código RH
   */
  findUnidadeByNome(nome: string): HierarchyLookupResult {
    if (!this.loaded) return { found: false };
    const nomeUpper = (nome || '').toUpperCase().trim();
    const codigoRh = this.unidadeByNome.get(nomeUpper);
    if (codigoRh) {
      return { found: true, codigoRh, nome, ativo: true };
    }
    return { found: false, nome };
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): {
    totalItems: number;
    setores: number;
    cargos: number;
    unidades: number;
    loaded: boolean;
  } {
    return {
      totalItems: this.items.length,
      setores: this.setorByNome.size,
      cargos: this.cargoByNome.size,
      unidades: this.unidadeByNome.size,
      loaded: this.loaded,
    };
  }
}
