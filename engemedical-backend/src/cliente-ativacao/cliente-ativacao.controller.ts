import { BadRequestException, Controller, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../soc/guards/jwt-auth.guard';
import { ClientActivationService } from './cliente-ativacao.service';

type ClientActivationRequest = Request & { user?: { sub?: unknown; userId?: unknown; codigo?: unknown; registrationCode?: unknown } };

@Controller('cliente/ativacao')
@UseGuards(JwtAuthGuard)
export class ClientActivationController {
  constructor(private readonly service: ClientActivationService) {}

  @Get()
  async get(@Req() request: ClientActivationRequest) {
    return this.getActivation(request);
  }

  @Get('summary')
  async summary(@Req() request: ClientActivationRequest) {
    const result = await this.getActivation(request);
    return { company: result.company, activation: result.activation };
  }

  private getActivation(request: ClientActivationRequest) {
    const companyCode = this.readCompanyCode(request.query?.empresa);
    return this.service.getActivation(companyCode, this.readRegistrationCode(request), this.readUserId(request));
  }

  private readCompanyCode(value: unknown): string {
    const normalized = String(value ?? '').trim();
    if (!/^\d{3,10}$/.test(normalized)) throw new BadRequestException('empresa é obrigatória e deve conter de 3 a 10 dígitos.');
    return normalized;
  }

  private readRegistrationCode(request: ClientActivationRequest): string {
    const value = request.user?.registrationCode;
    if (typeof value !== 'string' || !value.trim()) throw new UnauthorizedException('Empresas do usuário não identificadas.');
    return value.trim();
  }

  private readUserId(request: ClientActivationRequest): string {
    const value = request.user?.userId ?? request.user?.sub ?? request.user?.codigo;
    if ((typeof value !== 'string' && typeof value !== 'number') || !String(value).trim()) throw new UnauthorizedException('Usuário não identificado.');
    return String(value).trim();
  }
}
