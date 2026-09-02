import { Module } from '@nestjs/common';
import { ConvocacaoController } from './convocacao.controller';
import { ConvocacaoService } from './convocacao.service';

@Module({
  controllers: [ConvocacaoController],
  providers: [ConvocacaoService],
  exports: [ConvocacaoService],
})
export class ConvocacaoModule {}
