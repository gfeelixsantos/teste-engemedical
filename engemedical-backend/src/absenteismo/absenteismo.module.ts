import { Module } from '@nestjs/common';
import { AbsenteismoController } from './absenteismo.controller';
import { AbsenteismoService } from './absenteismo.service';

@Module({
  controllers: [AbsenteismoController],
  providers: [AbsenteismoService],
})
export class AbsenteismoModule {}