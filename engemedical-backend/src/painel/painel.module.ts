import { Module } from '@nestjs/common';
import { PainelService } from './painel.service';
import { TicketModule } from 'src/ticket/ticket.module';

@Module({
  imports: [TicketModule],
  providers: [PainelService],
  exports: [PainelService],
})
export class PainelModule {}
