import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { RiscosConfigService } from './riscos-config.service';
import { IRiscoConfigResponse, IRiscoConfigCreate, IRiscoConfigUpdate } from './riscos-config.interface';

@Controller('riscos-config')
export class RiscosConfigController {
  constructor(private readonly riscosConfigService: RiscosConfigService) {}

  @Get()
  async findAll(@Headers('x-auth-user') authUser?: string): Promise<IRiscoConfigResponse[]> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    const apenasAtivos = user?.perfil !== 'MASTER';
    return this.riscosConfigService.findAll(apenasAtivos);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<IRiscoConfigResponse> {
    return this.riscosConfigService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: IRiscoConfigCreate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IRiscoConfigResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.riscosConfigService.create(data, user, requestId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: IRiscoConfigUpdate,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<IRiscoConfigResponse> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.riscosConfigService.update(id, data, user, requestId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<{ success: boolean }> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    if (!user) throw new BadRequestException('Usuário autenticado não informado');
    return this.riscosConfigService.remove(id, user, requestId);
  }
}
