import { BadRequestException, Body, Controller, Get, Param, Post, Req, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('start')
  async start(@Req() request: ClientActivationRequest) {
    const companyCode = this.readCompanyCode(request.query?.empresa || request.body?.empresa);
    return this.service.start(companyCode, this.readRegistrationCode(request), this.readUserId(request));
  }

  @Post(':id/appointment')
  async appointment(@Param('id') id: string, @Body() body: { empresa: string; start_time: string; end_time: string; emails_comunicado?: string[] }, @Req() request: ClientActivationRequest) {
    return this.service.saveAppointment(id, this.readCompanyCode(body.empresa), this.readRegistrationCode(request), this.readUserId(request), body);
  }

  @Post(':id/contact')
  async contact(@Param('id') id: string, @Body() body: { empresa: string; confirmed: boolean; name: string; email: string; phone?: string }, @Req() request: ClientActivationRequest) {
    return this.service.saveCompanyContact(id, this.readCompanyCode(body.empresa), this.readRegistrationCode(request), this.readUserId(request), body);
  }

  @Post(':id/company')
  async company(@Param('id') id: string, @Body() body: { empresa: string }, @Req() request: ClientActivationRequest) {
    return this.service.confirmCompany(id, this.readCompanyCode(body.empresa), this.readRegistrationCode(request), this.readUserId(request));
  }

  @Post(':id/employee-sheet')
  @UseInterceptors(FileInterceptor('file'))
  async employeeSheet(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() request: ClientActivationRequest) {
    const companyCode = this.readCompanyCode(request.query?.empresa || request.body?.empresa);
    return this.service.uploadEmployeeSheet(id, companyCode, this.readRegistrationCode(request), this.readUserId(request), file);
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
