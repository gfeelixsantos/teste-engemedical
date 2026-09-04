import { Controller, Get, Query } from '@nestjs/common';
import { DocumentosService } from './documentos.service';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.documentosService.getDashboardData(dataInicio, dataFim);
  }

  @Get('refresh')
  async refresh() {
    this.documentosService.clearCache();
    return { success: true, message: 'Cache limpo com sucesso' };
  }
}
