import { Controller, Get, Param } from '@nestjs/common';
import { MuralService } from './mural.service';

@Controller('mural')
export class MuralController {
  constructor(private readonly muralService: MuralService) {}

  @Get()
  async findAll() {
    return this.muralService.findAll();
  }

  @Get('ativos')
  async findActive() {
    return this.muralService.findActive();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.muralService.findOne(id);
  }
}
