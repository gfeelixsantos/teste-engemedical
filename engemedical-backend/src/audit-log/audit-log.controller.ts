import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/soc/guards/jwt-auth.guard';
import { MasterGuard } from './master.guard';
import { AuditLogQueryDto, AuditResponseDto, FrontendAuditEventDto } from './audit-log.dto';
import { AuditLogQueryService } from './audit-log-query.service';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
export class AuditLogController {
  constructor(
    private readonly queryService: AuditLogQueryService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, MasterGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getAuditLogs(@Query() query: AuditLogQueryDto): Promise<AuditResponseDto> {
    return this.queryService.findAll(query);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createAuditLog(@Body() event: FrontendAuditEventDto): Promise<{ success: boolean }> {
    this.auditLogService.logUserAction({
      user: {
        codigo: event.userCodigo,
        nome: event.userNome,
        perfil: event.userPerfil,
      },
      acao: event.acao,
      recursoTipo: 'frontend',
      pacienteCodigo: event.pacienteCodigo,
      pacienteNome: event.pacienteNome,
      unidade: event.unidade,
      ip: event.ip,
      userAgent: event.userAgent,
      requestId: event.requestId ?? `engemedical-connect_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    });

    return { success: true };
  }
}
