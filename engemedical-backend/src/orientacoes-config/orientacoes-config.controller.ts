import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { OrientacoesConfigService } from './orientacoes-config.service';
import {
  IOrientacaoConfigResponse,
  IOrientacaoConfigCreate,
  IOrientacaoConfigUpdate,
} from './orientacoes-config.interface';

@Controller('orientacoes-config')
export class OrientacoesConfigController {
  constructor(
    private readonly orientacoesConfigService: OrientacoesConfigService,
  ) {}

  @Get()
  async findAll(
    @Headers('x-auth-user') authUser?: string,
  ): Promise<IOrientacaoConfigResponse[]> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    const apenasAtivos = user?.perfil !== 'MASTER';
    return this.orientacoesConfigService.findAll(apenasAtivos);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<IOrientacaoConfigResponse> {
    return this.orientacoesConfigService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: IOrientacaoConfigCreate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IOrientacaoConfigResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user)
      throw new BadRequestException('Usuário autenticado não informado');
    return this.orientacoesConfigService.create(data, user, requestId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: IOrientacaoConfigUpdate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IOrientacaoConfigResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user)
      throw new BadRequestException('Usuário autenticado não informado');
    return this.orientacoesConfigService.update(id, data, user, requestId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<{ success: boolean }> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user)
      throw new BadRequestException('Usuário autenticado não informado');
    return this.orientacoesConfigService.remove(id, user, requestId);
  }
}
