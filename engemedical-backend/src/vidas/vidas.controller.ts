import { Controller, Get, Query } from '@nestjs/common';
import { VidasService } from './vidas.service';

@Controller('vidas')
export class VidasController {
  constructor(private readonly vidasService: VidasService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('empresa') empresa?: string,
    @Query('consistencia') consistencia?: string,
    @Query('motivo') motivo?: string,
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.vidasService.getDashboardData(empresa, consistencia, motivo, forceRefresh);
  }

  @Get('tabela-geral')
  async getTabelaGeral(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('empresa') empresa?: string,
    @Query('situacao') situacao?: string,
    @Query('busca') busca?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    return this.vidasService.getTabelaGeral(pageNum, limitNum, empresa, situacao, busca);
  }

  @Get('refresh')
  async refreshCache() {
    this.vidasService.clearCache();
    await this.vidasService.getDashboardData(undefined, undefined, undefined, true);
    return { success: true, timestamp: new Date().toISOString() };
  }
}
