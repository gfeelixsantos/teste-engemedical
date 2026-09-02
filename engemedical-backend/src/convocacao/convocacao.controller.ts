import { Controller, Get, Query } from '@nestjs/common';
import { ConvocacaoService } from './convocacao.service';

@Controller('convocacao')
export class ConvocacaoController {
  constructor(private readonly convocacaoService: ConvocacaoService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.convocacaoService.getDashboardData();
  }

  @Get('kpis')
  async getKPIs() {
    const data = await this.convocacaoService.getDashboardData();
    return data.kpis;
  }

  @Get('detalhes')
  async getDetalhes(
    @Query('empresa') empresa?: string,
    @Query('situacao') situacao?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.convocacaoService.getDashboardData();
    let detalhes = data.detalhes;

    if (empresa) detalhes = detalhes.filter((d) => d.nomeEmpresa === empresa);
    if (situacao)
      detalhes = detalhes.filter((d) => d.situacaoExame === situacao);

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    const start = (pageNum - 1) * limitNum;

    return {
      data: detalhes.slice(start, start + limitNum),
      total: detalhes.length,
      page: pageNum,
      totalPages: Math.ceil(detalhes.length / limitNum),
    };
  }

  @Get('refresh')
  async refresh() {
    this.convocacaoService.clearCache();
    const data = await this.convocacaoService.getDashboardData();
    return { success: true, ultimaAtualizacao: data.kpis.ultimaAtualizacao };
  }
}
