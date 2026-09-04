import { Module } from '@nestjs/common';
import { VidasService } from './vidas.service';
import { VidasController } from './vidas.controller';

@Module({
  providers: [VidasService],
  controllers: [VidasController],
  exports: [VidasService],
})
export class VidasModule {}
