import { Controller, Get, Query } from '@nestjs/common';
import { EsocialService } from './esocial.service';

@Controller('esocial')
export class EsocialController {
  constructor(private readonly esocialService: EsocialService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('evento') evento?: string,
    @Query('status') status?: string,
  ) {
    return this.esocialService.getDashboardData(dataInicio, dataFim, evento, status);
  }

  @Get('refresh')
  async refresh(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    this.esocialService.clearCache();
    return this.esocialService.getDashboardData(dataInicio, dataFim);
  }
}