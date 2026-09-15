import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ClienteDashboardService } from './cliente-dashboard.service';

@Controller('cliente/dashboard')
export class ClienteDashboardController {
  constructor(private readonly service: ClienteDashboardService) {}

  @Get('resumo')
  async resumo(@Query('codigos') codigos?: string) {
    if (!codigos || !String(codigos).trim()) throw new BadRequestException('codigos é obrigatório (csv de CODIGO)');
    const list = String(codigos)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (!list.length) throw new BadRequestException('nenhum código válido');
    return this.service.getResumo(list);
  }
}
