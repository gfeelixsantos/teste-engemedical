import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ExamesService } from './exames.service';
import { IExameResponse, IExameCreate, IExameUpdate } from './exames.interface';

@Controller('exames')
export class ExamesController {
  constructor(private readonly examesService: ExamesService) {}

  @Get()
  async findAll(@Headers('x-auth-user') authUser?: string): Promise<IExameResponse[]> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    const apenasAtivos = user?.perfil !== 'MASTER';
    return this.examesService.findAll(apenasAtivos);
  }

  @Get('grupos')
  async findGrupos(): Promise<string[]> {
    return this.examesService.findGrupos();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<IExameResponse> {
    return this.examesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: IExameCreate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IExameResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.examesService.create(data, user, requestId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: IExameUpdate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IExameResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.examesService.update(id, data, user, requestId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<{ success: boolean }> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.examesService.remove(id, user, requestId);
  }
}
