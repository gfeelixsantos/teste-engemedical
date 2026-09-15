import { Controller, Get, Query } from '@nestjs/common';
import { PrestadoresDashboardService } from './prestadores-dashboard.service';

@Controller('prestadores-dashboard')
export class PrestadoresDashboardController {
  constructor(private readonly service: PrestadoresDashboardService) {}

  private defaultPeriod() {
    const fim = new Date();
    const inicio = new Date(fim);
    inicio.setFullYear(inicio.getFullYear() - 1);
    const f = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return { inicio: f(inicio), fim: f(fim) };
  }

  @Get('dashboard')
  getDashboard(
    @Query('dataInicio') inicio?: string,
    @Query('dataFim') fim?: string,
    @Query('refresh') refresh?: string,
  ) {
    const p = this.defaultPeriod();
    return this.service.getDashboard(inicio || p.inicio, fim || p.fim, refresh === 'true' || refresh === '1');
  }

  @Get('refresh')
  refresh() {
    this.service.clearCache();
    return { success: true };
  }
}

