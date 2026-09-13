import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../soc/guards/jwt-auth.guard';
import { HistoryImportService } from './history-import.service';

@Controller('soc/history-import')
@UseGuards(JwtAuthGuard)
export class HistoryImportController {
  constructor(private readonly service: HistoryImportService) {}
  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  analyze(@UploadedFile() file: Express.Multer.File) { return this.service.analyze(file); }
  @Get(':id')
  get(@Param('id') id: string) { return this.service.get(id); }
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() body: { employeeId: string; documentIds: string[] }) { return this.service.confirm(id, body.employeeId, body.documentIds); }
}
