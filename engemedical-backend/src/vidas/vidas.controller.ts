import { Controller, Get, Query } from '@nestjs/common';
import { VidasService } from './vidas.service';

@Controller('vidas')
export class VidasController {
  constructor(private readonly vidasService: VidasService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.vidasService.getDashboardData(dataInicio, dataFim);
  }

  @Get('refresh')
  async refresh() {
    this.vidasService.clearCache();
    return { success: true, message: 'Cache limpo com sucesso' };
  }
}
