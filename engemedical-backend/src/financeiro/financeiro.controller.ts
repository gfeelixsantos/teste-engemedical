import { Controller, Get, Query } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';

@Controller('financeiro')
export class FinanceiroController {
  private defaultPeriod() {
    const fim = new Date();
    const inicio = new Date(fim);
    inicio.setFullYear(inicio.getFullYear() - 1);
    const f = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return { inicio: f(inicio), fim: f(fim) };
  }

  constructor(private readonly service: FinanceiroService) {}

  @Get('dashboard')
  getDashboard(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('refresh') refresh?: string,
  ) {
    const p = this.defaultPeriod();
    return this.service.getDashboard(dataInicio || p.inicio, dataFim || p.fim, refresh === 'true' || refresh === '1');
  }

  @Get('refresh')
  refresh() {
    this.service.clearCache();
    return { success: true };
  }
}

