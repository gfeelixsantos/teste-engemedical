import { Module } from '@nestjs/common';
import { PrestadoresDashboardController } from './prestadores-dashboard.controller';
import { PrestadoresDashboardService } from './prestadores-dashboard.service';
@Module({ controllers: [PrestadoresDashboardController], providers: [PrestadoresDashboardService] })
export class PrestadoresDashboardModule {}
