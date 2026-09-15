import { Module } from '@nestjs/common';
import { ClienteDashboardService } from './cliente-dashboard.service';
import { ClienteDashboardController } from './cliente-dashboard.controller';

@Module({
  controllers: [ClienteDashboardController],
  providers: [ClienteDashboardService],
})
export class ClienteDashboardModule {}
