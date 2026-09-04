import { Controller, Get, Query } from '@nestjs/common';
import { AbsenteismoService } from './absenteismo.service';

@Controller('absenteismo')
export class AbsenteismoController {
  constructor(private readonly absenteismoService: AbsenteismoService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.absenteismoService.getDashboardData(dataInicio, dataFim);
  }

  @Get('refresh')
  async refresh(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    this.absenteismoService.clearCache();
    return this.absenteismoService.getDashboardData(dataInicio, dataFim);
  }
}