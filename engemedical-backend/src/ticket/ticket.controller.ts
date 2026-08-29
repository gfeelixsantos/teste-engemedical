// ticket.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Header,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { Ticket, TicketEmitedDto } from './interfaces/ticket';

@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  async loadInitialEmitedTickets(@Query('unidade') unidade: string) {
    try {
      // Validação da unidade
      if (!unidade || typeof unidade !== 'string') {
        throw new HttpException(
          'Unidade é obrigatória',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Sanitização adicional se necessário
      const sanitizedUnidade = unidade.trim().toUpperCase();

      const ticketsAndPreparations =
        await this.ticketService.findByUnidade(sanitizedUnidade);

      return ticketsAndPreparations;
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao buscar tickets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createTicket(@Body() ticket: TicketEmitedDto): Promise<Ticket> {
    try {
      console.log(
        '[TicketController] Payload recebido:',
        JSON.stringify(ticket),
      );
      const emitedTicket = await this.ticketService.create(ticket);

      if (!emitedTicket) {
        throw new Error('Falha ao criar ticket');
      }

      // Notifica via WebSocket
      this.ticketService.handleTicketEmited(emitedTicket);

      return emitedTicket;
    } catch (error) {
      console.error('[TicketController] Erro detalhado ao criar ticket:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
      });
      throw new HttpException(
        `Erro ao criar ticket: ${error.message || 'Erro desconhecido'}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Get('check-scheduling')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  async checkScheduling(
    @Query('unidade') unidade: string,
    @Query('mesAnoNascimento') mesAnoNascimento: string,
  ): Promise<{
    found: boolean;
    multiple: boolean;
    results?: { nome: string; cpf: string; dataNascimento: string }[];
    nome?: string;
    cpf?: string;
    dataNascimento?: string;
  }> {
    if (!unidade || !mesAnoNascimento) {
      throw new HttpException(
        'Parâmetros unidade e mesAnoNascimento são obrigatórios',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cleanVal = mesAnoNascimento.trim();
    if (
      !/^\d{6}$/.test(cleanVal) &&
      !/^\d{2}\/\d{4}$/.test(cleanVal) &&
      !/^\d{8}$/.test(cleanVal) &&
      !/^\d{2}\/\d{2}\/\d{4}$/.test(cleanVal)
    ) {
      throw new HttpException(
        'mesAnoNascimento deve ter 6 dígitos (ex: 071999), 8 dígitos (ex: 14071997) ou formato DD/MM/AAAA / MM/AAAA',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.ticketService.checkSchedulingByBirthYear(
      unidade,
      cleanVal,
    );
  }

  @Get('all')
  async getAllTickets(@Query('unidade') unidade?: string) {
    try {
      return await this.ticketService.findAllTickets(unidade);
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao buscar todos os tickets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

