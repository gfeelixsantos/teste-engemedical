import { Controller, Get, Query } from '@nestjs/common';
import { VolumetriaService } from './volumetria.service';

@Controller('volumetria')
export class VolumetriaController {
  constructor(private readonly volumetriaService: VolumetriaService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('dataInicial') dataInicial?: string,
    @Query('dataFinal') dataFinal?: string,
    @Query('codigosAgenda') codigosAgenda?: string,
  ) {
    const agendas = codigosAgenda ? codigosAgenda.split(',').map((a) => a.trim()) : undefined;
    return this.volumetriaService.getDashboardData(dataInicial, dataFinal, agendas);
  }

  @Get('agendas')
  async getAgendas() {
    const data = await this.volumetriaService.getDashboardData();
    return {
      agendas: data.filtros.agendas,
      empresas: data.empresas,
      tiposCompromisso: data.tiposCompromisso,
    };
  }

  @Get('refresh')
  async refresh() {
    this.volumetriaService.clearCache();
    const data = await this.volumetriaService.getDashboardData();
    return {
      success: true,
      ultimaAtualizacao: data.kpis.ultimaAtualizacao,
    };
  }
}