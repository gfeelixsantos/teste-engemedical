import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { GedBatchService } from './ged-batch.service';
import {
  CreateGedBatchDto,
  GedBatchJob,
  inferScope,
  validateScopeConstraints,
} from './ged-batch.types';

@Controller('schedulings/ged/batch')
export class GedBatchController {
  private readonly logger = new Logger(GedBatchController.name);

  constructor(
    private readonly gedBatchService: GedBatchService,
  ) {}

  private extractUserId(req: Request): string {
    return (req as any).user?.userId || (req as any).user?.sub || 'unknown';
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateGedBatchDto,
    @Req() req: Request,
  ): Promise<GedBatchJob> {
    const userId = this.extractUserId(req);

    try {
      const scope = inferScope(dto);
      validateScopeConstraints(scope, dto);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : String(err),
      );
    }

    return this.gedBatchService.createJob(dto, userId);
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<GedBatchJob[]> {
    const userId = this.extractUserId(req);
    return this.gedBatchService.listJobs(
      userId,
      Number(limit || 20),
      Number(skip || 0),
    );
  }

  @Get(':id')
  async getStatus(@Param('id') id: string): Promise<GedBatchJob> {
    return this.gedBatchService.getJob(id);
  }
}
