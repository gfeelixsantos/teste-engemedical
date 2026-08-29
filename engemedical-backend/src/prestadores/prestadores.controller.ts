import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { PrestadoresService } from './prestadores.service';
import { IPrestadorResponse, IPrestadorCreate, IPrestadorUpdate } from './prestadores.interface';

@Controller('prestadores')
export class PrestadoresController {
  constructor(private readonly prestadoresService: PrestadoresService) {}

  @Get()
  async findAll(@Headers('x-auth-user') authUser?: string): Promise<IPrestadorResponse[]> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    const apenasAtivos = user?.perfil !== 'MASTER';
    return this.prestadoresService.findAll(apenasAtivos);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<IPrestadorResponse> {
    return this.prestadoresService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: IPrestadorCreate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IPrestadorResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.prestadoresService.create(data, user, requestId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: IPrestadorUpdate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IPrestadorResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.prestadoresService.update(id, data, user, requestId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<{ success: boolean }> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.prestadoresService.remove(id, user, requestId);
  }
}
