import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CommitmentsService } from './commitments.service';
import { ICreateCommitmentDto, IUpdateCommitmentDto, VehicleType } from './interfaces/employee-commitment.interface';

@Controller('commitments')
export class CommitmentsController {
  constructor(private readonly commitmentsService: CommitmentsService) {}

  @Get()
  async findAll(@Query('participant') participant?: string, @Query('vehicle') vehicle?: VehicleType) {
    return this.commitmentsService.findAll(participant, vehicle);
  }

  @Get('available-vehicles')
  async getAvailableVehicles(
    @Query('start_time') start_time: string,
    @Query('end_time') end_time: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.commitmentsService.findAvailableVehicles(start_time, end_time, excludeId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.commitmentsService.findById(id);
  }

  @Post()
  async create(@Body() input: ICreateCommitmentDto) {
    return this.commitmentsService.create(input);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() input: IUpdateCommitmentDto) {
    return this.commitmentsService.update(id, input);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.commitmentsService.delete(id);
  }
}
