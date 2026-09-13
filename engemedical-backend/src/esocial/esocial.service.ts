import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
  safeParseSocJson,
} from '../soc/utils/soc-export-data-url';
import type {
  SocEventoEsocial,
  RegistroEsocial,
  EsocialKPIs,
  StatusItem,
  LayoutItem,
  EvolucaoMensalItem,
  StatusMesItem,
  EmpresaStatusItem,
  EsocialDashboardData,
  LayoutEvento,
} from './esocial.types';

interface SocEmpresa {
  CODIGO: string;
  NOMEABREVIADO?: string;
  RAZAOSOCIAL?: string;
  CNPJ?: string;
  tipoCobranca?: string;
}

@Injectable()
export class EsocialService {
  private cache: { rows: RegistroEsocial[]; expires: number } | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(EsocialService.name);
  }

  /**
   * Normaliza tipoCobranca removendo acentos e caracteres especiais.
   */
  private normalizarTipoCobranca(tipo: string): string {
    return tipo
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toLowerCase();
  }

  /**
   * Verifica se o tipoCobranca contém "vida" (normalizado).
   */
  private isTipoVida(tipoCobranca: string): boolean {
    const normalizado = this.normalizarTipoCobranca(tipoCobranca);
    return normalizado.includes('vida');
  }

  /**
   * Busca lista de empresas ativas no SOC via Exporta Dados 218761 (Preço)
   * Filtra apenas empresas com tipoCobranca contendo "Vida"
   */
  private async fetchEmpresasClientes(): Promise<SocEmpresa[]> {
    const credentials = getSocExportCredentials('SOC_ED_PRECOS', this.configService);
    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      codigoEmpresa: '',
      codigoUnidade: '',
      codigoProduto: '',
      codigoGrupoProduto: '',
    };
    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug('Buscando empresas ativas via SOC Exporta Dados Preço 218761...');
      const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!response.ok) {
        this.logger.error(`Falha ao buscar tabela de preços: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const rows = safeParseSocJson<any>(decoded, 'exporta dados preco 218761', this.logger);

      const empresasMap = new Map<string, SocEmpresa>();
      let totalRegistros = 0;
      let registrosVida = 0;

      rows.forEach((r) => {
        const cod = r.codigoEmpresa || r.CODIGO_EMPRESA || r.CODIGO;
        const tipoCobranca = r.tipoCobranca || r.TIPOCOBRANCA || r.tipo_cobranca || '';

        if (!cod) return;

        totalRegistros++;

        // Filtra apenas empresas com tipoCobranca contendo "Vida"
        if (!this.isTipoVida(tipoCobranca)) return;

        registrosVida++;

        if (!empresasMap.has(cod)) {
          empresasMap.set(cod, {
            CODIGO: String(cod),
            NOMEABREVIADO: r.nomeEmpresa || r.NOMEEMPRESA || '',
            RAZAOSOCIAL: r.nomeEmpresa || r.RAZAOSOCIAL || '',
            tipoCobranca,
          });
        }
      });

      const empresas = Array.from(empresasMap.values());
      this.logger.debug(
        `Empresas: ${totalRegistros} registros totais, ${registrosVida} registros Vida, ${empresas.length} empresas únicas Vida`,
      );
      return empresas;
    } catch (error) {
      this.logger.error('Erro ao buscar empresas ativas via tabela de preços:', error);
      return [];
    }
  }

  /**
   * Busca Eventos eSocial via SOC Exporta Dados 186601 para uma empresa específica
   */
  private async fetchEventosEsocial(
    dataInicio: string,
    dataFim: string,
    empresa: SocEmpresa,
    status?: string,
    layout?: string,
  ): Promise<RegistroEsocial[]> {
    const credentials = getSocExportCredentials('SOC_ED_ESOCIAL_EVENTOS', this.configService);

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      dataInicio,
      dataFim,
      empresaTrabalho: empresa.CODIGO,
      status: status || '99',
      layout: layout || '0',
      unidade: '0',
      ambiente: '1',
      funcionario: '',
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) {
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const raw = safeParseSocJson<SocEventoEsocial>(decoded, `eventos esocial empresa ${empresa.CODIGO}`, this.logger);

      if (raw.length > 0) {
        this.logger.debug(`Empresa ${empresa.CODIGO}: ${raw.length} registros eSocial retornados`);
      }

      const defaultNome = empresa.NOMEABREVIADO || empresa.RAZAOSOCIAL || empresa.CODIGO;
      return raw.map((r) => this.mapRow(r, defaultNome)).filter((r) => r !== null) as RegistroEsocial[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Busca eventos eSocial para todas as empresas ativas com controle de concorrência (lotes de 3 para não exceder o limite SOC de 5)
   */
  private async fetchTodosEventosEsocial(
    dataInicio: string,
    dataFim: string,
  ): Promise<RegistroEsocial[]> {
    const empresas = await this.fetchEmpresasClientes();

    if (empresas.length === 0) {
      this.logger.error('Nenhuma empresa encontrada no cadastro de preços SOC');
      return [];
    }

    this.logger.debug(`Iniciando busca de eventos eSocial para ${empresas.length} empresas em lotes de 3...`);

    const allRows: RegistroEsocial[] = [];
    const BATCH_SIZE = 3;

    for (let i = 0; i < empresas.length; i += BATCH_SIZE) {
      const batch = empresas.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((emp) => this.fetchEventosEsocial(dataInicio, dataFim, emp)),
      );
      for (const rows of results) {
        allRows.push(...rows);
      }

      if ((i + BATCH_SIZE) % 30 === 0 || i + BATCH_SIZE >= empresas.length) {
        this.logger.debug(`Progresso eSocial: ${Math.min(i + BATCH_SIZE, empresas.length)} / ${empresas.length} empresas processadas, acumulado: ${allRows.length} eventos`);
      }

      // Pequena pausa entre lotes para respeitar o limite de conexões simultâneas do SOC
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    this.logger.debug(`Total final: ${allRows.length} registros eSocial obtidos de ${empresas.length} empresas`);
    return allRows;
  }

  private mapRow(row: SocEventoEsocial, defaultEmpresaNome?: string): RegistroEsocial | null {
    const layout = this.normalizeLayout(row['COD EVENTO'] || row.EVENTO || '');
    const status = this.normalizeStatus(row.STATUSEVENTO || row.STATUS || '');
    const empresa = row.NOMEEMPRESA || row.EMPRESA || defaultEmpresaNome || row.CODIGOEMPRESA || 'Sem empresa';
    const funcionario = row.NOMEFUNCIONARIO || row.FUNCIONARIO || '';
    const dataGeracao = this.parseDate(row.DATAGERACAO || '');

    if (layout === 'Sem evento identificado' && status === '' && !empresa && !funcionario && !dataGeracao) {
      return null;
    }

    return {
      codigoEmpresa: row.CODIGOEMPRESA || '',
      empresa,
      cnpj: row.CNPJ || '',
      subgrupo: row.SUBGRUPO || '',
      unidade: row.NOMEUNIDADE || row.UNIDADE || '',
      classificacaoEmpresa: row.ClassificacaoEmpresa || '',
      layout,
      evento: row.EVENTO || '',
      dataGeracao,
      codigoGed: row.CODIGOGED || '',
      nomeArquivo: row.NOMEARQUIVO || '',
      codigoFuncionario: row.CODFUNCIONARIO || row.FUNCIONARIO || '',
      funcionario,
      statusEvento: (status as any) || 'Sem status',
      nrRecibo: row.NRRECIBO || '',
      erro: row.ERRO || '',
      codigoErroEsocial: row.CODIGOERROESOCIAL || '',
      ambiente: row.AMBIENTEPRODUCAO || '',
      cargaInicial: row.CARGAINICIAL || '',
      solucaoEsocial: row['Solucao eSocial'] || '',
    };
  }

  private normalizeLayout(value: string): LayoutEvento {
    const upper = value.toUpperCase().trim();
    const match = upper.match(/S?-?(22(?:10|20|21|30|40))/);
    if (match) return ('S' + match[1]) as LayoutEvento;
    if (upper.includes('2221')) return 'S2221';
    return 'Sem evento identificado' as LayoutEvento;
  }

  private normalizeStatus(status: string): string {
    const upper = status.toUpperCase().trim();
    if (upper.includes('CONCLUID')) return 'Concluido';
    if (upper.includes('ERRO') || upper.includes('INCONSIST')) return 'Inconsistencias';
    if (upper.includes('PENDENTE')) return 'Pendente';
    if (upper.includes('EXCLUID')) return 'Excluido';
    if (upper.includes('ASSINADO')) return 'Assinado';
    if (upper.includes('PROCESS')) return 'Processando';
    if (upper.includes('REPROCESS')) return 'Reprocessar';
    if (upper.includes('IGNORADO')) return 'Ignorado';
    if (upper.includes('APTO')) return 'Apto para envio';
    if (upper.includes('INTEGRACAO')) return 'Integracao';
    return status;
  }

  private parseDate(raw: string): string {
    if (!raw) return '';
    // SOC pode retornar como DD/MM/YYYY ou YYYY-MM-DD ou /Date(timestamp)/
    if (raw.startsWith('/Date(')) {
      const ts = parseInt(raw.replace(/\/Date\((\d+).*\//, '$1'), 10);
      return new Date(ts).toISOString().split('T')[0];
    }
    if (raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return raw;
  }

  private monthKey(dataGeracao: string): string {
    if (!dataGeracao || dataGeracao.length < 7) return '';
    return dataGeracao.substring(0, 7); // YYYY-MM
  }

  private buildDashboard(rows: RegistroEsocial[], dataInicio: string, dataFim: string): EsocialDashboardData {
    const empresasSet = new Set<string>();
    let concluidos = 0;
    let inconsistencias = 0;
    let pendentes = 0;
    let xmlsValidos = 0;
    let xmlsInvalidos = 0;

    const layouts: Record<string, number> = {};
    const porStatus: Record<string, number> = {};
    const porLayout: Record<string, number> = {};
    const porMes: Record<string, number> = {};
    const porMesStatus: Record<string, any> = {};
    const porEmpresa: Record<string, number> = {};
    const porEmpresaStatus: Record<string, any> = {};
    const porErro: Record<string, number> = {};

    // Matriz Hierárquica: Ano -> Mês -> Evento -> Empresa
    const matrixMap: Record<string, Record<string, Record<string, Record<string, any>>>> = {};

    for (const row of rows) {
      if (row.empresa) empresasSet.add(row.empresa);

      if (row.statusEvento === 'Concluido') concluidos++;
      else if (row.statusEvento === 'Inconsistencias') inconsistencias++;
      else if (row.statusEvento === 'Pendente') pendentes++;

      if (row.statusEvento === 'Concluido' || row.statusEvento === 'Assinado') xmlsValidos++;
      else if (row.statusEvento === 'Inconsistencias') xmlsInvalidos++;

      layouts[row.layout] = (layouts[row.layout] || 0) + 1;
      porStatus[row.statusEvento] = (porStatus[row.statusEvento] || 0) + 1;
      porLayout[row.layout] = (porLayout[row.layout] || 0) + 1;

      const mes = this.monthKey(row.dataGeracao);
      const ano = row.dataGeracao ? row.dataGeracao.substring(0, 4) : 'Sem Data';

      if (mes) {
        porMes[mes] = (porMes[mes] || 0) + 1;
        if (!porMesStatus[mes]) porMesStatus[mes] = { concluido: 0, inconsistencias: 0, pendente: 0, excluido: 0, assinado: 0, outros: 0 };
        this.incrementStatus(porMesStatus[mes], row.statusEvento);
      }

      porEmpresa[row.empresa] = (porEmpresa[row.empresa] || 0) + 1;
      if (!porEmpresaStatus[row.empresa]) {
        porEmpresaStatus[row.empresa] = { empresa: row.empresa, totalRegistros: 0, concluido: 0, inconsistencias: 0, pendente: 0, excluido: 0, assinado: 0 };
      }
      porEmpresaStatus[row.empresa].totalRegistros++;
      this.incrementStatus(porEmpresaStatus[row.empresa], row.statusEvento);

      const erro = row.codigoErroEsocial || row.erro;
      if (erro) porErro[erro] = (porErro[erro] || 0) + 1;

      // Montar nó da matriz hierárquica
      if (!matrixMap[ano]) matrixMap[ano] = {};
      if (!matrixMap[ano][mes || 'Sem mês']) matrixMap[ano][mes || 'Sem mês'] = {};
      const layoutEv = row.layout || 'Sem evento';
      if (!matrixMap[ano][mes || 'Sem mês'][layoutEv]) matrixMap[ano][mes || 'Sem mês'][layoutEv] = {};
      const empNome = row.empresa || 'Sem empresa';
      if (!matrixMap[ano][mes || 'Sem mês'][layoutEv][empNome]) {
        matrixMap[ano][mes || 'Sem mês'][layoutEv][empNome] = { concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
      }
      this.incrementStatus(matrixMap[ano][mes || 'Sem mês'][layoutEv][empNome], row.statusEvento);
    }

    const total = rows.length;
    const taxaConclusao = total > 0 ? Math.round((concluidos / total) * 10000) / 100 : 0;

    const sortedMeses = Object.keys(porMes).sort();
    const sortedEmpresas = Object.entries(porEmpresa).sort((a, b) => b[1] - a[1]).slice(0, 12);

    const por_empresa_comparativo = Object.values(porEmpresaStatus).map((e: any) => ({
      empresa: e.empresa,
      totalRegistros: e.totalRegistros,
      concluidos: e.concluido,
      pctConcluido: e.totalRegistros > 0 ? Math.round((e.concluido / e.totalRegistros) * 100) : 0,
    })).sort((a, b) => b.totalRegistros - a.totalRegistros).slice(0, 12);

    // Transformar matrixMap em estrutura encadeada de MatrixStructure
    const totaisMatrix = { concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
    const anosArray = Object.keys(matrixMap).sort().map(ano => {
      const anoTotais = { concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
      const mesesArray = Object.keys(matrixMap[ano]).sort().map(mes => {
        const mesTotais = { concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
        const eventosArray = Object.keys(matrixMap[ano][mes]).sort().map(evento => {
          const eventoTotais = { concluido: 0, inconsistencias: 0, pendente: 0, assinado: 0, excluido: 0 };
          const empresasArray = Object.keys(matrixMap[ano][mes][evento]).sort().map(emp => {
            const empData = matrixMap[ano][mes][evento][emp];
            eventoTotais.concluido += empData.concluido || 0;
            eventoTotais.inconsistencias += empData.inconsistencias || 0;
            eventoTotais.pendente += empData.pendente || 0;
            eventoTotais.assinado += empData.assinado || 0;
            eventoTotais.excluido += empData.excluido || 0;
            return { nome: emp, ...empData };
          });
          mesTotais.concluido += eventoTotais.concluido;
          mesTotais.inconsistencias += eventoTotais.inconsistencias;
          mesTotais.pendente += eventoTotais.pendente;
          mesTotais.assinado += eventoTotais.assinado;
          mesTotais.excluido += eventoTotais.excluido;
          return { evento, ...eventoTotais, empresas: empresasArray };
        });
        anoTotais.concluido += mesTotais.concluido;
        anoTotais.inconsistencias += mesTotais.inconsistencias;
        anoTotais.pendente += mesTotais.pendente;
        anoTotais.assinado += mesTotais.assinado;
        anoTotais.excluido += mesTotais.excluido;
        return { mes, ...mesTotais, eventos: eventosArray };
      });
      totaisMatrix.concluido += anoTotais.concluido;
      totaisMatrix.inconsistencias += anoTotais.inconsistencias;
      totaisMatrix.pendente += anoTotais.pendente;
      totaisMatrix.assinado += anoTotais.assinado;
      totaisMatrix.excluido += anoTotais.excluido;
      return { ano, ...anoTotais, meses: mesesArray };
    });

    return {
      success: true,
      kpis: {
        totalRegistros: total,
        totalEmpresas: empresasSet.size,
        concluidos,
        inconsistencias,
        pendentes,
        xmlsValidos,
        xmlsInvalidos,
        taxaConclusao,
      },
      layouts,
      charts: {
        por_status: Object.entries(porStatus).map(([status, qtd]) => ({ status, qtd })).sort((a, b) => b.qtd - a.qtd),
        por_layout: Object.entries(porLayout).map(([layout, qtd]) => ({ layout, qtd })).sort((a, b) => b.qtd - a.qtd),
        por_mes: sortedMeses.map((mes) => ({ mes, qtd: porMes[mes] })),
        por_mes_status: sortedMeses.map((mes) => ({ mes, ...porMesStatus[mes] })),
        por_empresa: sortedEmpresas.map(([empresa, qtd]) => ({ status: empresa, qtd })),
        por_empresa_comparativo,
        por_empresa_status: Object.values(porEmpresaStatus).slice(0, 12),
        por_erro: Object.entries(porErro).map(([erro, qtd]) => ({ status: erro, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 10),
      },
      matrix: {
        totais: totaisMatrix,
        anos: anosArray,
      },
      rows: rows.slice(0, 1000),
      meta: {
        periodo: { dataInicio, dataFim },
        dataBase: new Date().toISOString(),
        fonte: 'SOC Exporta Dados 186601 - Eventos eSocial (todas as empresas clientes)',
      },
      filtros: {
        empresas: [...empresasSet].sort(),
        layouts: ['S2210', 'S2220', 'S2221', 'S2230', 'S2240', 'Sem evento identificado'],
        status: ['Concluido', 'Inconsistencias', 'Pendente', 'Excluido', 'Assinado'],
      },
    };
  }

  private incrementStatus(obj: any, status: string): void {
    switch (status) {
      case 'Concluido': obj.concluido++; break;
      case 'Inconsistencias': obj.inconsistencias++; break;
      case 'Pendente': obj.pendente++; break;
      case 'Excluido': obj.excluido++; break;
      case 'Assinado': obj.assinado++; break;
      default: obj.outros = (obj.outros || 0) + 1;
    }
  }

  async getDashboardData(
    dataInicio?: string,
    dataFim?: string,
    empresaTrabalho?: string,
    status?: string,
    layout?: string,
  ): Promise<EsocialDashboardData> {
    const now = Date.now();
    let allRows: RegistroEsocial[] = [];

    // Formata a data para envio ao SOC: YYYY-MM-DD -> DD/MM/YYYY
    const formatToSocDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    };

    if (this.cache && this.cache.expires > now) {
      allRows = this.cache.rows;
    } else {
      // Default: ano corrente e anterior (2025 e 2026)
      if (!dataInicio || !dataFim) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 1;
        dataInicio = dataInicio || `${startYear}-01-01`;
        dataFim = dataFim || `${currentYear}-12-31`;
      }

      const socInicio = formatToSocDate(dataInicio);
      const socFim = formatToSocDate(dataFim);

      // Busca para TODAS as empresas clientes em paralelo
      allRows = await this.fetchTodosEventosEsocial(socInicio, socFim);
      this.cache = { rows: allRows, expires: Date.now() + this.CACHE_TTL_MS };
    }

    // Filtrar em memória pelos parâmetros solicitados
    let filteredRows = allRows;
    if (layout) {
      filteredRows = filteredRows.filter((r) => r.layout === layout);
    }
    if (status) {
      filteredRows = filteredRows.filter((r) => r.statusEvento === status);
    }
    if (empresaTrabalho) {
      filteredRows = filteredRows.filter((r) => r.empresa.toLowerCase().includes(empresaTrabalho.toLowerCase()));
    }

    return this.buildDashboard(filteredRows, dataInicio || '', dataFim || '');
  }

  clearCache(): void {
    this.cache = null;
  }
}