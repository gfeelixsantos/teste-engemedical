import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, Headers, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { IUserCreate, IUserUpdate, IUserSync, IUserResponse, IConsentRequest, IConsentStatus } from './users.interface';
import { parseAuthUserHeader } from 'src/core/professional-identity.resolver';
import { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('perfil') perfil?: string,
    @Query('ativo') ativo?: string,
  ): Promise<IUserResponse[]> {
    const ativoBool = ativo !== undefined ? ativo === 'true' : undefined;
    return this.usersService.findAll(perfil, ativoBool);
  }

  @Get(':codigo')
  async findByCodigo(@Param('codigo') codigo: string): Promise<IUserResponse> {
    return this.usersService.findByCodigo(codigo);
  }

  @Post('sync')
  async sync(
    @Body() data: IUserSync,
    @Headers('x-auth-user') authUser?: string,
  ): Promise<IUserResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    return this.usersService.sync(data, user);
  }

  @Post()
  async create(@Body() data: IUserCreate): Promise<IUserResponse> {
    return this.usersService.upsert(data);
  }

  @Put(':codigo')
  async update(
    @Param('codigo') codigo: string,
    @Body() data: IUserUpdate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IUserResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    return this.usersService.update(codigo, data, user, requestId);
  }

  @Get(':codigo/consent')
  async checkConsent(@Param('codigo') codigo: string): Promise<IConsentStatus[]> {
    return this.usersService.checkConsent(codigo);
  }

  @Post('consent')
  @HttpCode(HttpStatus.CREATED)
  async recordConsent(
    @Body() input: IConsentRequest & { user_codigo?: string },
    @Req() req: Request,
  ) {
    const authUser = parseAuthUserHeader(req.headers['x-auth-user']);
    const codigo = authUser?.codigo ?? input.user_codigo;

    if (!codigo) {
      throw new UnauthorizedException('Usuário autenticado não informado');
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] as string;

    const userData = authUser ? { codigo: authUser.codigo, nome: authUser.nome, cpf: authUser.cpf, perfil: authUser.perfil } : undefined;
    return this.usersService.recordConsent(codigo, input, ip, userAgent, userData);
  }

  @Delete(':codigo/anonymize')
  async anonymize(
    @Param('codigo') codigo: string,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<{ success: boolean }> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    await this.usersService.anonymize(codigo, user, requestId);
    return { success: true };
  }
}
