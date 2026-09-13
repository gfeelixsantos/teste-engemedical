import { Controller, Get, Query } from '@nestjs/common';
import { VolumetriaService } from './volumetria.service';

@Controller('volumetria')
export class VolumetriaController {
  constructor(private readonly volumetriaService: VolumetriaService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('agenda') agenda?: string,
    @Query('status') status?: string,
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.volumetriaService.getDashboardData(agenda, status, forceRefresh);
  }

  @Get('dados-gerais')
  async getDadosGerais(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('agenda') agenda?: string,
    @Query('status') status?: string,
    @Query('empresa') empresa?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    return this.volumetriaService.getRegistros(pageNum, limitNum, agenda, status, empresa);
  }

  @Get('refresh')
  async refreshCache() {
    this.volumetriaService.clearCache();
    await this.volumetriaService.getDashboardData(undefined, undefined, true);
    return { success: true, timestamp: new Date().toISOString() };
  }
}