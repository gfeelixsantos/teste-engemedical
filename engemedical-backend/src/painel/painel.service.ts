import { Injectable } from '@nestjs/common';
import { TicketStatus } from 'src/ticket/enum/ticket.enum';
import { PainelCall } from './painel.interface';
import { TicketService } from 'src/ticket/ticket.service';

@Injectable()
export class PainelService {
  constructor(private readonly ticketService: TicketService) {}

  async getAllTickets(unidadePainel: string) {
    const ticketsEmChamada =
      await this.ticketService.findByUnidade(unidadePainel);

    if (ticketsEmChamada) {
      const ticketsToCall: PainelCall[] = [];

      ticketsEmChamada.tickets.forEach((ticket) => {
        ticketsToCall.push({
          id: ticket.id,
          ticket: `${ticket.prefixo}${ticket.numero}`,
          sala: ticket.sala ?? '',
          exame: 'ATENDIMENTO',
          unidade: unidadePainel,
        });
      });

      return ticketsToCall;
    }

    return null;
  }
}
