import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { IGrupoResponse, IGrupoCreate, IGrupoUpdate } from './grupos.interface';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Get()
  async findAll(@Headers('x-auth-user') authUser?: string): Promise<IGrupoResponse[]> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    const apenasAtivos = user?.perfil !== 'MASTER';
    return this.gruposService.findAll(apenasAtivos);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<IGrupoResponse> {
    return this.gruposService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: IGrupoCreate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IGrupoResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.gruposService.create(data, user, requestId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: IGrupoUpdate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IGrupoResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.gruposService.update(id, data, user, requestId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<{ success: boolean }> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.gruposService.remove(id, user, requestId);
  }
}
