import { Module } from '@nestjs/common';
import { TeleatendimentoController } from './teleatendimento.controller';
import { TeleatendimentoService } from './teleatendimento.service';

@Module({
  controllers: [TeleatendimentoController],
  providers: [TeleatendimentoService],
  exports: [TeleatendimentoService],
})
export class TeleatendimentoModule {}
