import { Controller, Get, Post, Put, Delete, Param, Body, Query, Headers } from '@nestjs/common';
import { UnitsService } from './units.service';
import { IUnitCreate, IUnitUpdate, IUnitResponse } from './units.interface';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  async findAll(@Query('admin') admin?: string): Promise<IUnitResponse[]> {
    if (admin === 'true') {
      return this.unitsService.findAllAdmin();
    }
    return this.unitsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<IUnitResponse> {
    return this.unitsService.findById(id);
  }

  @Post()
  async create(@Body() data: IUnitCreate): Promise<IUnitResponse> {
    return this.unitsService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: IUnitUpdate,
  ): Promise<IUnitResponse> {
    return this.unitsService.update(id, data);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-auth-user') authUser?: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<{ success: boolean }> {
    const user = authUser ? JSON.parse(authUser) : undefined;
    return this.unitsService.remove(id, user, requestId);
  }
}
