import {
  BadGatewayException,
  BadRequestException,
  Controller,
  GatewayTimeoutException,
  Get,
  HttpException,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../soc/guards/jwt-auth.guard';
import { ClienteFuncionariosService } from './cliente-funcionarios.service';
import {
  ClienteFuncionariosQuery,
  FuncionarioStatus,
} from './cliente-funcionarios.types';

const VALID_STATUSES = new Set<FuncionarioStatus>([
  'ATENDIMENTO',
  'AGUARDANDO_RESULTADOS',
  'AVALIACAO_MEDICA',
  'AGENDADO',
  'PENDENTE',
  'EXPIRADO',
  'EXPIRANDO',
  'VALIDO',
]);

type ClienteFuncionariosRequest = Request & {
  user?: {
    sub?: unknown;
    userId?: unknown;
    codigo?: unknown;
  };
};

@Controller('cliente/funcionarios')
export class ClienteFuncionariosController {
  constructor(private readonly service: ClienteFuncionariosService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() request: ClienteFuncionariosRequest): Promise<unknown> {
    const query = request.query ?? {};
    const normalizedQuery = this.normalizeQuery(query);
    const userId = this.readUserId(request);

    try {
      return await this.service.list(normalizedQuery, userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (this.isTimeoutError(error)) {
        throw new GatewayTimeoutException(
          'A consulta de funcionários excedeu o tempo limite.',
        );
      }

      throw new BadGatewayException(
        'Não foi possível estabelecer comunicação com a fonte de funcionários.',
      );
    }
  }

  private normalizeQuery(query: Record<string, unknown>): ClienteFuncionariosQuery {
    const companyCode = this.normalizeCompanyCode(query.empresa);
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const status = this.normalizeStatus(query.status);
    const q = this.normalizeSearch(query.q);

    return { companyCode, page, limit, q, status };
  }

  private normalizeCompanyCode(value: unknown): string {
    const companyCode = this.requiredText(value, 'empresa');
    if (!/^\d+$/.test(companyCode)) {
      throw new BadRequestException('empresa deve ser um código numérico.');
    }

    return companyCode;
  }

  private normalizePage(value: unknown): number {
    if (value === undefined) return 1;

    const page = this.parseInteger(value, 'page');
    if (page < 1) {
      throw new BadRequestException('page deve ser um inteiro positivo.');
    }

    return page;
  }

  private normalizeLimit(value: unknown): number {
    if (value === undefined) return 20;

    const limit = this.parseInteger(value, 'limit');
    return Math.min(100, Math.max(10, limit));
  }

  private normalizeStatus(value: unknown): FuncionarioStatus | undefined {
    if (value === undefined) return undefined;

    const status = this.requiredText(value, 'status').toUpperCase();
    if (!VALID_STATUSES.has(status as FuncionarioStatus)) {
      throw new BadRequestException('status de funcionário inválido.');
    }

    return status as FuncionarioStatus;
  }

  private normalizeSearch(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException('q deve ser um texto.');
    }

    const search = value.trim();
    return search || undefined;
  }

  private parseInteger(value: unknown, field: string): number {
    const text = this.requiredText(value, field);
    if (!/^-?\d+$/.test(text)) {
      throw new BadRequestException(`${field} deve ser um número inteiro.`);
    }

    const parsed = Number(text);
    if (!Number.isSafeInteger(parsed)) {
      throw new BadRequestException(`${field} deve ser um número inteiro válido.`);
    }

    return parsed;
  }

  private requiredText(value: unknown, field: string): string {
    if (
      (typeof value !== 'string' && typeof value !== 'number') ||
      !String(value).trim()
    ) {
      throw new BadRequestException(`${field} é obrigatório.`);
    }

    return String(value).trim();
  }

  private readUserId(request: ClienteFuncionariosRequest): string {
    const candidate = request.user?.sub ?? request.user?.userId ?? request.user?.codigo;
    if (
      (typeof candidate !== 'string' && typeof candidate !== 'number') ||
      !String(candidate).trim()
    ) {
      throw new UnauthorizedException('Usuário autenticado não identificado.');
    }

    return String(candidate).trim();
  }

  private isTimeoutError(error: unknown): boolean {
    const value = error as { code?: unknown; name?: unknown; message?: unknown };
    const code = String(value?.code ?? '').toUpperCase();
    const name = String(value?.name ?? '').toLowerCase();
    const message = String(value?.message ?? '').toLowerCase();

    return (
      ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNABORTED', 'UND_ERR_CONNECT_TIMEOUT'].includes(code) ||
      name.includes('timeout') ||
      message.includes('timeout') ||
      message.includes('timed out')
    );
  }
}
