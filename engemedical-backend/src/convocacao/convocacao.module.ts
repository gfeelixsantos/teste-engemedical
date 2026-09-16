import { Module } from '@nestjs/common';
import { ConvocacaoController } from './convocacao.controller';
import { ConvocacaoService } from './convocacao.service';
import { SocModule } from '../soc/soc.module';

@Module({
  imports: [SocModule],
  controllers: [ConvocacaoController],
  providers: [ConvocacaoService],
  exports: [ConvocacaoService],
})
export class ConvocacaoModule {}
