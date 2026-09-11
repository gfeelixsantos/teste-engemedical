import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../utils/logger';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
  safeParseSocJson,
} from '../soc/utils/soc-export-data-url';
import type {
  SocControleVencimento,
  RegistroDocumento,
  DocumentosKPIs,
  VigenciaPorTipoItem,
  VigenciaPorUnidadeItem,
  StatusDocumentoItem,
  DocumentosDashboardData,
  TipoDocumento,
  StatusVigencia,
} from './documentos.types';

@Injectable()
export class DocumentosService {
  private cache: { data: DocumentosDashboardData; expires: number } | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(DocumentosService.name);
  }

  private async fetchDocumentos(
    dataInicio?: string,
    dataFim?: string,
  ): Promise<SocControleVencimento[]> {
    const credentials = getSocExportCredentials('SOC_ED_CONTROLE_VENCIMENTOS', this.configService);

    const params: Record<string, string> = {
      ...credentials,
      tipoSaida: 'json',
      codigoEmpresa: '',
      codigoUnidade: '',
      dataInicio: dataInicio || '',
      dataFim: dataFim || '',
      codigoGrupoProduto: '',
      estadoUnidade: '',
      codigoSubGrupo: '',
      diasAVencer: '60',
      codigoProduto: '',
      statusEmpresa: '',
      statusUnidade: '',
    };

    const url = buildSocExportDataUrl(params, this.configService);

    try {
      this.logger.debug('Buscando controle vencimentos SOC 217483');
      const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) {
        this.logger.error(`Falha ao buscar documentos: ${response.status}`);
        return [];
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const raw = safeParseSocJson<SocControleVencimento>(decoded, 'vencimentos', this.logger);
      this.logger.debug(`Retornados ${raw.length} registros de documentos`);
      return raw;
    } catch (error) {
      this.logger.error('Erro ao buscar documentos:', error);
      return [];
    }
  }

  private classifyDocumento(produto: string): TipoDocumento {
    const upper = (produto || '').toUpperCase();
    if (upper.includes('PGR')) return 'PGR';
    if (upper.includes('PCMSO')) return 'PCMSO';
    return 'Outro';
  }

  private classifyVigencia(
    dataVencimento: string,
    situacao: string,
    legenda: string,
  ): StatusVigencia {
    const sit = (situacao || '').toLowerCase();
    const leg = (legenda || '').toLowerCase();

    if (sit.includes('vencido') || leg.includes('vencido')) return 'Vencido';
    if (sit.includes('a vencer') || leg.includes('a vencer') || sit.includes('avencer')) return 'AVencer';
    if (sit.includes('vigente') || leg.includes('vigente') || sit.includes('contrato vigente')) return 'Vigente';

    // Fallback: check date
    if (dataVencimento) {
      const parts = dataVencimento.split('/');
      if (parts.length === 3) {
        const venc = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const now = new Date();
        if (venc < now) return 'Vencido';
        const diffDays = (venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 60) return 'AVencer';
      }
    }

    return 'Vigente';
  }

  private mapDocumentos(rows: SocControleVencimento[]): RegistroDocumento[] {
    return rows
      .filter((r) => r.codigoEmpresa && r.nomeEmpresa)
      .map((r) => ({
        codigoEmpresa: r.codigoEmpresa,
        empresa: r.nomeEmpresa,
        codigoUnidade: r.codigoUnidade,
        unidade: r.nomeUnidade,
        cnpj: r.cnpjUnidade,
        produto: r.nomeProduto,
        tipoDocumento: this.classifyDocumento(r.nomeProduto),
        dataVencimento: r.dataVencimento,
        situacao: r.situacao,
        vigenciaContrato: this.classifyVigencia(r.dataVencimento, r.situacao, r.legenda),
        ultimaEntrega: r.dataRealizacaoUltimoServicoRealizado,
        previsao: r.dataPrevisaoUltimoServicoRealizado,
        observacao: r.observacaoUltimoServicoRealizado,
        grauRisco: r.grauRisco,
        cidade: r.cidade,
        estado: r.estado,
      }));
  }

  private buildDashboard(registros: RegistroDocumento[]): DocumentosDashboardData {
    // KPIs
    const totalPGR = registros.filter((r) => r.tipoDocumento === 'PGR').length;
    const totalPCMSO = registros.filter((r) => r.tipoDocumento === 'PCMSO').length;
    const vigentes = registros.filter((r) => r.vigenciaContrato === 'Vigente').length;
    const aVencer = registros.filter((r) => r.vigenciaContrato === 'AVencer').length;
    const vencidos = registros.filter((r) => r.vigenciaContrato === 'Vencido').length;

    const kpis: DocumentosKPIs = {
      totalDocumentos: registros.length,
      totalPGR,
      totalPCMSO,
      vigentes,
      aVencer,
      vencidos,
      percentualVigentes: registros.length > 0 ? Math.round((vigentes / registros.length) * 100) : 0,
    };

    // Vigência geral (donut)
    const vigenciaGeral = [
      { label: 'Contrato Vigente', value: vigentes, color: '#22c55e' },
      { label: 'Contrato Vencido', value: vencidos, color: '#ef4444' },
    ];

    // Documentos por tipo (bar)
    const tipoMap = new Map<string, number>();
    for (const r of registros) {
      tipoMap.set(r.tipoDocumento, (tipoMap.get(r.tipoDocumento) || 0) + 1);
    }
    const documentosPorTipo = [...tipoMap.entries()]
      .map(([tipo, qtd]) => ({ tipo, qtd }))
      .sort((a, b) => b.qtd - a.qtd);

    // Vigência por tipo
    const vigTipoMap = new Map<string, { vigentes: number; aVencer: number; vencidos: number }>();
    for (const r of registros) {
      const existing = vigTipoMap.get(r.tipoDocumento) || { vigentes: 0, aVencer: 0, vencidos: 0 };
      if (r.vigenciaContrato === 'Vigente') existing.vigentes++;
      else if (r.vigenciaContrato === 'AVencer') existing.aVencer++;
      else existing.vencidos++;
      vigTipoMap.set(r.tipoDocumento, existing);
    }
    const vigenciaPorTipo: VigenciaPorTipoItem[] = [...vigTipoMap.entries()]
      .map(([tipo, v]) => ({ tipo, ...v }));

    // Vigência por unidade (top 15)
    const vigUnidadeMap = new Map<string, { vigentes: number; aVencer: number; vencidos: number }>();
    for (const r of registros) {
      const key = r.unidade || r.codigoUnidade;
      const existing = vigUnidadeMap.get(key) || { vigentes: 0, aVencer: 0, vencidos: 0 };
      if (r.vigenciaContrato === 'Vigente') existing.vigentes++;
      else if (r.vigenciaContrato === 'AVencer') existing.aVencer++;
      else existing.vencidos++;
      vigUnidadeMap.set(key, existing);
    }
    const vigenciaPorUnidade: VigenciaPorUnidadeItem[] = [...vigUnidadeMap.entries()]
      .map(([unidade, v]) => ({ unidade, ...v }))
      .sort((a, b) => (b.vigentes + b.aVencer + b.vencidos) - (a.vigentes + a.aVencer + a.vencidos))
      .slice(0, 15);

    // Vigência por unidade - PGR only
    const vigUnidadePGRMap = new Map<string, { vigentes: number; aVencer: number; vencidos: number }>();
    for (const r of registros.filter((r) => r.tipoDocumento === 'PGR')) {
      const key = r.unidade || r.codigoUnidade;
      const existing = vigUnidadePGRMap.get(key) || { vigentes: 0, aVencer: 0, vencidos: 0 };
      if (r.vigenciaContrato === 'Vigente') existing.vigentes++;
      else if (r.vigenciaContrato === 'AVencer') existing.aVencer++;
      else existing.vencidos++;
      vigUnidadePGRMap.set(key, existing);
    }
    const vigenciaPorUnidadePGR: VigenciaPorUnidadeItem[] = [...vigUnidadePGRMap.entries()]
      .map(([unidade, v]) => ({ unidade, ...v }))
      .sort((a, b) => (b.vigentes + b.aVencer + b.vencidos) - (a.vigentes + a.aVencer + a.vencidos))
      .slice(0, 15);

    // Vigência por unidade - PCMSO only
    const vigUnidadePCMSOMap = new Map<string, { vigentes: number; aVencer: number; vencidos: number }>();
    for (const r of registros.filter((r) => r.tipoDocumento === 'PCMSO')) {
      const key = r.unidade || r.codigoUnidade;
      const existing = vigUnidadePCMSOMap.get(key) || { vigentes: 0, aVencer: 0, vencidos: 0 };
      if (r.vigenciaContrato === 'Vigente') existing.vigentes++;
      else if (r.vigenciaContrato === 'AVencer') existing.aVencer++;
      else existing.vencidos++;
      vigUnidadePCMSOMap.set(key, existing);
    }
    const vigenciaPorUnidadePCMSO: VigenciaPorUnidadeItem[] = [...vigUnidadePCMSOMap.entries()]
      .map(([unidade, v]) => ({ unidade, ...v }))
      .sort((a, b) => (b.vigentes + b.aVencer + b.vencidos) - (a.vigentes + a.aVencer + a.vencidos))
      .slice(0, 15);

    // Status dos documentos
    const statusMap = new Map<string, number>();
    for (const r of registros) {
      const status = r.situacao || 'Ativo';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }
    const statusDocumentos: StatusDocumentoItem[] = [...statusMap.entries()]
      .map(([status, quantidade]) => ({ status, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    // Filtros
    const empresas = [...new Set(registros.map((r) => r.empresa))].sort();
    const unidades = [...new Set(registros.map((r) => r.unidade))].sort();
    const tipos = [...new Set(registros.map((r) => r.tipoDocumento))].sort();

    return {
      success: true,
      kpis,
      vigenciaGeral,
      documentosPorTipo,
      vigenciaPorTipo,
      vigenciaPorUnidade,
      vigenciaPorUnidadePGR,
      vigenciaPorUnidadePCMSO,
      statusDocumentos,
      registros: registros.slice(0, 1000),
      meta: {
        dataBase: new Date().toISOString(),
        fonte: 'SOC Exporta Dados 217483 (Controle Vencimentos Documentos)',
      },
      filtros: { empresas, unidades, tipos },
    };
  }

  async getDashboardData(
    dataInicio?: string,
    dataFim?: string,
  ): Promise<DocumentosDashboardData> {
    const now = Date.now();
    if (this.cache && this.cache.expires > now && !dataInicio && !dataFim) {
      return this.cache.data;
    }

    const raw = await this.fetchDocumentos(dataInicio, dataFim);
    const registros = this.mapDocumentos(raw);
    const dashboard = this.buildDashboard(registros);

    this.cache = { data: dashboard, expires: Date.now() + this.CACHE_TTL_MS };
    return dashboard;
  }

  clearCache(): void {
    this.cache = null;
  }
}
