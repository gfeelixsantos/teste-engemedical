import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class SocExportaDadosService {
  private readonly logger = new Logger(SocExportaDadosService.name);
  private readonly baseUrl = 'https://ws1.soc.com.br/WebSoc/exportadados';
  private cache = new Map<string, SocHierarchyItem[]>();

  /**
   * Consulta hierarquia da empresa via Exporta Dados
   */
  async getHierarchyByCompany(
    empresa: string,
    codigo: string,
    chave: string,
    empresaTrabalho?: string,
  ): Promise<SocHierarchyItem[]> {
    const cacheKey = `${empresa}_${codigo}_${chave}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const params: Record<string, string> = {
      empresa,
      codigo,
      chave,
      tipoSaida: 'json',
    };
    if (empresaTrabalho) {
      params.empresaTrabalho = empresaTrabalho;
    }

    const url = new URL('https://ws1.soc.com.br/WebSoc/exportadados');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    this.logger.log(`[EXPORTA_DADOS] Consultando hierarquia do SOC para empresa ${empresa}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      this.logger.debug(`[EXPORTA_DADOS] Resposta recebida (${text.length} chars)`);

      const data = this.parseJsonResponse(text);
      this.cache.set(cacheKey, data);

      this.logger.log(`[EXPORTA_DADOS] ${data.length} itens de hierarquia carregados`);
      return data;
    } catch (error) {
      this.logger.error(`[EXPORTA_DADOS] Falha: ${error}`);
      throw error;
    }
  }

  /**
   * Busca hierarquia do Grupo Tora usando variáveis de ambiente
   */
  async getGrupoToraHierarchyFromEnv(): Promise<SocHierarchyItem[]> {
    const codigo = process.env.SOC_EXPORTA_DADOS_CODIGO;
    const chave = process.env.SOC_EXPORTA_DADOS_CHAVE;
    const empresaTrabalho = process.env.SOC_EXPORTA_DADOS_EMPRESA_GRUPO_TORA;

    if (!codigo || !chave) {
      throw new Error('Variáveis SOC_EXPORTA_DADOS_CODIGO e SOC_EXPORTA_DADOS_CHAVE são obrigatórias');
    }

    return this.getHierarchyByCompany('2182291', codigo, chave, empresaTrabalho);
  }

  /**
   * Parse do JSON (pode vir como array ou objeto com array)
   */
  private parseJsonResponse(text: string): SocHierarchyItem[] {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed.hierarquias && Array.isArray(parsed.hierarquias)) {
        return parsed.hierarquias;
      }
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      }
      return [parsed];
    } catch (error) {
      // Se JSON parse falhar, pode ser texto formatado
      this.logger.warn(`[EXPORTA_DADOS] JSON parse falhou, tentando parse manual`);
      return this.parseFormattedResponse(text);
    }
  }

  /**
   * Parse para respostas formatadas (HTML, CSV, etc)
   */
  private parseFormattedResponse(text: string): SocHierarchyItem[] {
    const items: SocHierarchyItem[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('CODIGO_EMPRESA')) {
        const match = line.match(/(\d+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)/);
        if (match) {
          items.push({
            CODIGO_EMPRESA: match[1],
            NOME_EMPRESA: match[2],
            ATIVO_EMPRESA: match[3],
            CODIGO_UNIDADE: match[4],
            NOME_UNIDADE: match[5],
            CODIGO_UNIDADE_RH: match[6],
            ATIVO_UNIDADE: match[7],
            CODIGO_SETOR: match[8],
            NOME_SETOR: match[9],
            CODIGO_SETOR_RH: match[10],
            ATIVO_SETOR: match[11],
            CODIGO_CARGO: match[12],
            NOME_CARGO: match[13],
            CODIGO_CARGO_RH: match[14],
            ATIVO_CARGO: match[15],
            HIERARQUIA_ATIVA: match[16],
          });
        }
      }
    }
    return items;
  }

  /**
   * Limpa cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
