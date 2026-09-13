import { Controller, Get, Query } from '@nestjs/common';
import { ProfissionaisService } from './profissionais.service';

@Controller('profissionais')
export class ProfissionaisController {
  constructor(private readonly profissionaisService: ProfissionaisService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('agenda') agenda?: string,
    @Query('status') status?: string,
  ) {
    return this.profissionaisService.getDashboardData(agenda, status);
  }
}
