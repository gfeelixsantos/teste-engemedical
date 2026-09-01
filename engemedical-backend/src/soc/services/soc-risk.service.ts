import { Injectable, Logger } from '@nestjs/common';
import { PedidoExame } from '../types/PedidoExame';
import { RiscosAso } from 'src/mongo/types/scheduling';
import { SocEmployeeRiskService } from './soc-employee-risk.service';
import { RiscosConfigService } from '../../riscos-config/riscos-config.service';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../utils/soc-export-data-url';

@Injectable()
export class SocRiskService {
  private readonly logger = new Logger(SocRiskService.name);

  constructor(
    private readonly socEmployeeRiskService: SocEmployeeRiskService,
    private readonly riscosConfigService: RiscosConfigService,
  ) {}

  // Cache: empresaTrabalho → dados brutos do PCMSO + timestamp
  private pcmsDataCache: Map<string, { data: any[]; ts: number }> = new Map();
  private readonly PCMS_CACHE_TTL = 60 * 60 * 1000;

  // Cache: empresaTrabalho → dados brutos do Cadastro Risco Empresa + timestamp
  private cadastroRiscoCache: Map<string, { data: any[]; ts: number }> = new Map();
  private readonly CADASTRO_CACHE_TTL = 60 * 60 * 1000;

  // Cache: Supabase riscos_config → mapa código → { grupo, nome }
  private supabaseRiscoCache: { data: Map<string, { grupo: string; nome: string }>; ts: number } | null = null;
  private readonly SUPABASE_CACHE_TTL = 5 * 60 * 1000;

  // Mapeamento síncrono local dos riscos conhecidos para nomenclaturas e grupos.
  private readonly mapaConhecido: Record<string, { grupo: string; nome: string }> = {
    '1': { grupo: 'FISICOS', nome: 'Ruído.' },
    '774': { grupo: 'FISICOS', nome: 'Ruído Contínuo' },
    '1047': { grupo: 'FISICOS', nome: 'Ruído Contínuo (NHO 01 - Q3)' },
    '1176': { grupo: 'FISICOS', nome: 'Vibração de Corpo Inteiro' },
    '301': { grupo: 'QUIMICOS', nome: 'Particulado Respirável' },
    '646': { grupo: 'QUIMICOS', nome: 'Particulado Respirável / Silica' },
    '745': { grupo: 'QUIMICOS', nome: 'Contato com óleo diesel' },
    '855': { grupo: 'QUIMICOS', nome: 'Varredura de Solventes' },
    '443': { grupo: 'BIOLOGICOS', nome: 'Trabalhos em galerias, fossas e tanques de esgoto' },
    '173': { grupo: 'ERGONOMICOS', nome: 'Postura inadequada' },
    '250': { grupo: 'ERGONOMICOS', nome: 'Carga / Levantamento' },
    '410': { grupo: 'ERGONOMICOS', nome: 'Postura sentada' },
    '515': { grupo: 'ERGONOMICOS', nome: 'Deslocamento a pé' },
    '592': { grupo: 'ERGONOMICOS', nome: 'Levantamento de carga' },
    '303': { grupo: 'ACIDENTES', nome: 'Queda de objetos' },
    '309': { grupo: 'ACIDENTES', nome: 'Objetos cortantes' },
    '311': { grupo: 'FISICOS', nome: 'Superfícies e/ou materiais aquecidos expostos' },
    '744': { grupo: 'ACIDENTES', nome: 'Colisão' },
    '83': { grupo: 'INESPECIFICOS', nome: 'Não há risco ocupacional específico' },
    '39': { grupo: 'BIOLOGICOS', nome: 'Animais peçonhentos' },
    '304': { grupo: 'ACIDENTES', nome: 'Projeção de Partículas' },
    '307': { grupo: 'ACIDENTES', nome: 'Condições perigosas previstas na legislação trabalhista (Inflamáveis)' },
    '330': { grupo: 'ACIDENTES', nome: 'Partes móveis / Aprisionamento' },
    '1564': { grupo: 'BIOLOGICOS', nome: 'Resíduos Contaminados' },
    '457': { grupo: 'QUIMICOS', nome: 'Varredura de Vapores Orgânicos Selecionados' },
    '1158': { grupo: 'FISICOS', nome: 'Ruido Contínuo' },
    '188': { grupo: 'QUIMICOS', nome: 'Negro de fumo' },
  };

  // Mapa de grupo numérico do SOC para nomenclatura textual
  private readonly SOC_GRUPO_MAP: Record<string, string> = {
    '1': 'FISICOS',
    '2': 'QUIMICOS',
    '3': 'BIOLOGICOS',
    '4': 'ERGONOMICOS',
    '5': 'ACIDENTES',
    '6': 'INESPECIFICOS',
  };

  /**
   * Cache do Supabase riscos_config: todos os registros ativos.
   * Retorna mapa: código SOC → { grupo, nome }.
   */
  private async getSupabaseRiscoMap(): Promise<Map<string, { grupo: string; nome: string }>> {
    const now = Date.now();
    if (this.supabaseRiscoCache && now < this.supabaseRiscoCache.ts + this.SUPABASE_CACHE_TTL) {
      return this.supabaseRiscoCache.data;
    }

    this.logger.log('[getSupabaseRiscoMap] Cache miss, buscando riscos_config...');
    const mapa = new Map<string, { grupo: string; nome: string }>();

    try {
      const configs = await this.riscosConfigService.findAll(true);
      for (const config of configs) {
        const grupo = (config.grupo || '').trim().toUpperCase();
        const nome = (config.descricao || '').trim();
        if (!grupo || !nome) continue;
        for (const codigo of (config.codigos || [])) {
          const c = codigo.toString().trim();
          if (c && !mapa.has(c)) {
            mapa.set(c, { grupo, nome });
          }
        }
      }
    } catch (e) {
      this.logger.error('[getSupabaseRiscoMap] Erro ao buscar riscos_config:', e);
    }

    this.supabaseRiscoCache = { data: mapa, ts: now };
    this.logger.log(`[getSupabaseRiscoMap] ${mapa.size} códigos mapeados do Supabase`);
    return mapa;
  }

  /**
   * Busca os riscos do funcionário baseado no pedido de exame.
   *
   * Estratégia híbrida:
   * 0. Supabase riscos_config (curadoria manual) → grupo + nome (fonte primária)
   * 1. PCMSO da empresa (codigo 210129) com cache → NOME_RISCO + GRUPO_RISCO
   * 2. "Cadastro Risco Empresa" (codigo 198100) com cache → nome (fallback)
   * 3. "Riscos do Funcionário" (codigo 193602) → nome (fallback adicional)
   * 4. IA → grupo (fallback quando nenhuma fonte anterior tem grupo)
   */
  async riscosFuncionario(pedido: PedidoExame): Promise<RiscosAso[]> {
    const codigoEmpresa = pedido.CODIGOEMPRESA;
    const codigoFuncionario = pedido.CODIGOFUNCIONARIO;

    const riscosStr = (pedido.RISCOSFUNCIONARIO || pedido.RISCOSASO || '').toString();
    const riscosPedido = new Set(
      riscosStr
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
    );

    this.logger.log(
      `[riscosFuncionario] Ficha ${pedido.SEQUENCIAFICHA} - empresa=${codigoEmpresa}, funcionario=${codigoFuncionario}, riscosPedido: ${Array.from(riscosPedido).join(',')}`,
    );

    // Passo 0: Supabase riscos_config — fonte primária (curadoria manual do usuário)
    const supabaseRiscoMap = await this.getSupabaseRiscoMap();
    this.logger.log(`[riscosFuncionario] Supabase: ${supabaseRiscoMap.size} códigos mapeados`);

    // Passo 1: PCMSO (210129) — fonte secundária de nome e grupo
    const pcmsData = await this.getPcmsDataCached(codigoEmpresa);
    const pcmsGrupoMap: Record<string, string> = {};
    const pcmsNomeMap: Record<string, string> = {};
    for (const item of pcmsData) {
      const codigo = (item.CODIGO_RISCO || item.CODRISCO || '').toString().trim();
      const nome = (item.NOME_RISCO || item.RISCO || '').toString().trim();
      const grupoSOC = (item.GRUPO_RISCO || item.GRUPORISCO || '').toString().trim();
      const grupo = this.SOC_GRUPO_MAP[grupoSOC];
      if (codigo) {
        if (grupo) pcmsGrupoMap[codigo] = grupo;
        if (nome) pcmsNomeMap[codigo] = nome;
      }
    }

    this.logger.log(`[riscosFuncionario] PCMSO: ${Object.keys(pcmsNomeMap).length} riscos encontrados`);

    // Passo 2: Cadastro Risco Empresa (198100) — fallback de nome (todos os riscos cadastrados)
    const cadastroData = await this.getCadastroRiscoCached(codigoEmpresa);
    const cadastroNomeMap: Record<string, string> = {};
    for (const item of cadastroData) {
      const codigo = (item.COD || '').toString().trim();
      const nome = (item.NOME || '').toString().trim();
      if (codigo && nome) cadastroNomeMap[codigo] = nome;
    }

    this.logger.log(`[riscosFuncionario] Cadastro Empresa: ${Object.keys(cadastroNomeMap).length} riscos encontrados`);

    // Passo 3: Endpoint do funcionário (193602) — fallback de nome
    const employeeRisks = await this.socEmployeeRiskService.getEmployeeRisks(
      codigoEmpresa,
      codigoFuncionario,
    ) || [];
    const employeeNomeMap: Record<string, string> = {};
    for (const item of employeeRisks) {
      const codigo = (item.CODRISCO || '').toString().trim();
      const nome = (item.RISCO || '').toString().trim();
      if (codigo && nome) employeeNomeMap[codigo] = nome;
    }

    // Montar resultado para TODOS os códigos do pedido
    const riscos: RiscosAso[] = [];

    for (const codigo of riscosPedido) {
      if (riscos.some(r => r.codigo === codigo)) continue;

      // Nome: Supabase → PCMSO → cadastro empresa → funcionário → mapaConhecido → placeholder
      const sb = supabaseRiscoMap.get(codigo);
      const nome = sb?.nome || pcmsNomeMap[codigo] || cadastroNomeMap[codigo] || employeeNomeMap[codigo] || this.mapaConhecido[codigo]?.nome || `Risco Ocupacional (Código: ${codigo})`;

      // Grupo: Supabase → PCMSO → MAPA_CONHECIDO → IA → INESPECIFICOS
      let grupo = sb?.grupo || pcmsGrupoMap[codigo] || this.mapaConhecido[codigo]?.grupo || 'INESPECIFICOS';

      if (grupo === 'INESPECIFICOS' && codigo !== '83' && !nome.toUpperCase().includes('NÃO HÁ RISCO')) {
        grupo = await this.classificarGrupoRiscoComIA(nome);
      }

      riscos.push({ codigo, grupo, risco: nome });

      // Auto-popular Supabase se código não existir lá e tiver nome real
      if (!sb && codigo !== '83' && !nome.includes('Risco Ocupacional')) {
        this.riscosConfigService.autoCreate(codigo, grupo, nome);
      }
    }

    return riscos;
  }

  /**
   * Cache dos dados brutos do PCMSO da empresa.
   */
  private async getPcmsDataCached(empresaTrabalho: string): Promise<any[]> {
    const now = Date.now();
    const cached = this.pcmsDataCache.get(empresaTrabalho);

    if (cached && now < cached.ts + this.PCMS_CACHE_TTL) {
      this.logger.log(`[getPcmsDataCached] Cache hit para empresa ${empresaTrabalho}`);
      return cached.data;
    }

    this.logger.log(`[getPcmsDataCached] Cache miss para empresa ${empresaTrabalho}, buscando PCMSO...`);
    const data = await this.fetchCompanyPcmsRisks(empresaTrabalho);
    this.pcmsDataCache.set(empresaTrabalho, { data, ts: now });
    this.logger.log(`[getPcmsDataCached] Cache atualizado: ${data.length} registros`);

    return data;
  }

  /**
   * Busca riscos do PCMSO da empresa (endpoint 210129).
   */
  private async fetchCompanyPcmsRisks(empresaTrabalho: string): Promise<any[]> {
    const credentials = getSocExportCredentials('SOC_ED_PCMSO');
    const url = buildSocExportDataUrl({
      ...credentials,
      tipoSaida: 'json',
      empresaTrabalho,
      codigoRisco: '',
      codigoExame: '',
      codigoGrupoRisco: '',
    });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error('Falha no PCMSO:', await response.text());
        return [];
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      if (decoded.startsWith('De')) {
        this.logger.error('Resposta inesperada no PCMSO:', decoded);
        return [];
      }

      return JSON.parse(decoded);
    } catch (e) {
      this.logger.error('Erro no PCMSO:', e);
      return [];
    }
  }

  /**
   * Cache dos dados do Cadastro Risco Empresa (198100).
   */
  private async getCadastroRiscoCached(empresaTrabalho: string): Promise<any[]> {
    const now = Date.now();
    const cached = this.cadastroRiscoCache.get(empresaTrabalho);

    if (cached && now < cached.ts + this.CADASTRO_CACHE_TTL) {
      this.logger.log(`[getCadastroRiscoCached] Cache hit para empresa ${empresaTrabalho}`);
      return cached.data;
    }

    this.logger.log(`[getCadastroRiscoCached] Cache miss para empresa ${empresaTrabalho}, buscando...`);
    const data = await this.fetchCompanyRisksCadastro(empresaTrabalho);
    this.cadastroRiscoCache.set(empresaTrabalho, { data, ts: now });
    this.logger.log(`[getCadastroRiscoCached] Cache atualizado: ${data.length} registros`);

    return data;
  }

  /**
   * Busca riscos do Cadastro Risco Empresa (endpoint 198100).
   */
  private async fetchCompanyRisksCadastro(empresaTrabalho: string): Promise<any[]> {
    const credentials = getSocExportCredentials('SOC_ED_CADASTRO_RISCO_EMPRESA');
    const url = buildSocExportDataUrl({
      ...credentials,
      tipoSaida: 'json',
      empresaTrabalho,
    });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error('Falha no Cadastro Risco Empresa:', await response.text());
        return [];
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      if (decoded.startsWith('De')) {
        this.logger.error('Resposta inesperada no Cadastro Risco Empresa:', decoded);
        return [];
      }

      return JSON.parse(decoded);
    } catch (e) {
      this.logger.error('Erro no Cadastro Risco Empresa:', e);
      return [];
    }
  }

  /**
   * Classificação por IA com fallback retornando a nomenclatura.
   */
  private async classificarGrupoRiscoComIA(riscoNome: string): Promise<string> {
    try {
      const { OpenAI } = require('openai');

      const groqClient = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      });

      const azureEndpoint = (
        process.env.AZURE_OPENAI_ENDPOINT ||
        'https://cmsoopenai.openai.azure.com/'
      ).replace(/\/openai\/v1\/?$/i, '');

      const azureClient = new OpenAI({
        baseURL: `${azureEndpoint}/openai/v1/`,
        apiKey: process.env.AZURE_OPENAI_API_KEY!,
      });

      const messages = [
        {
          role: 'system',
          content: 'Classifique o risco ocupacional (PGR/SST) em um dos 6 grupos. FISICOS: ruído, vibração, radiação, temperatura, umidade, pressão. QUIMICOS: poeira, fumo, névoa, gás, vapor, produto químico, substância. BIOLOGICOS: vírus, bactéria, fungo, parasita, agente infeccioso. ERGONOMICOS: postura, esforço repetitivo, levantamento de peso, mobiliário. ACIDENTES: queda, corte, projeção de partículas, superfície aquecida, colisão, aprisionamento, eletricidade, máquina, espaço confinado. INESPECIFICOS: atividade administrativa, preventiva, vigilância, sem agente específico. Responda apenas o grupo em MAIÚSCULO.',
        },
        {
          role: 'user',
          content: riscoNome,
        },
      ];

      let completion;
      try {
        this.logger.debug('[AI] Classificando risco via Groq: ' + riscoNome);
        completion = await groqClient.chat.completions.create({
          model: process.env.GROQ_MODEL || 'qwen/qwen3.6-27b',
          messages,
          max_tokens: 15,
          temperature: 0,
        });
      } catch (e) {
        this.logger.warn('[AI] Falha no Groq, tentando Azure OpenAI: ' + e?.message);
        completion = await azureClient.chat.completions.create({
          model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1-mini',
          messages: messages as any,
          max_tokens: 15,
          temperature: 0,
        });
      }

      const res = (completion.choices[0]?.message?.content || '').trim().toUpperCase();
      if (['FISICOS', 'QUIMICOS', 'BIOLOGICOS', 'ERGONOMICOS', 'ACIDENTES', 'INESPECIFICOS'].includes(res)) {
        this.logger.debug(`[AI] Risco "${riscoNome}" classificado com sucesso como: ${res}`);
        return res;
      }
    } catch (err) {
      this.logger.error('Erro ao classificar risco com IA:', err);
    }
    return 'INESPECIFICOS';
  }
}
