import { Controller, Get, Query } from '@nestjs/common';
import { ConvocacaoService } from './convocacao.service';

@Controller('convocacao')
export class ConvocacaoController {
  constructor(private readonly convocacaoService: ConvocacaoService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.convocacaoService.getDashboardData();
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '200', 10);
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;

    return {
      kpis: data.kpis,
      porSituacao: data.porSituacao,
      porEmpresa: data.porEmpresa,
      porUnidade: data.porUnidade,
      porAno: data.porAno,
      porTipoExame: data.porTipoExame,
      filtros: data.filtros,
      totalDetalhes: data.totalDetalhes,
      detalhes: data.detalhes.slice(start, end),
      page: pageNum,
      totalPages: Math.ceil(data.totalDetalhes / limitNum),
    };
  }

  @Get('detalhes')
  async getDetalhes(
    @Query('empresa') empresa?: string,
    @Query('situacao') situacao?: string,
    @Query('exame') exame?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.convocacaoService.getDashboardData();
    let detalhes = data.detalhes;

    if (empresa) detalhes = detalhes.filter((d) => d.nomeEmpresa === empresa);
    if (situacao) detalhes = detalhes.filter((d) => d.situacaoExame === situacao);
    if (exame) detalhes = detalhes.filter((d) => d.exame === exame);

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '100', 10);
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
