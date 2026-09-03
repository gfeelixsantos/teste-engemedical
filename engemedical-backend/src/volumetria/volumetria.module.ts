import { Module } from '@nestjs/common';
import { VolumetriaController } from './volumetria.controller';
import { VolumetriaService } from './volumetria.service';

@Module({
  controllers: [VolumetriaController],
  providers: [VolumetriaService],
})
export class VolumetriaModule {}