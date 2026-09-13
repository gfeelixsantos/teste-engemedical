import {
  Controller,
  Get,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { SftpReportsService } from './sftp-reports.service';
import {
  SftpExecutionsResponse,
  SftpFilesResponse,
  SftpReportDto,
  SftpHorariosResponse,
  SftpExecutionsQuery,
  SftpFilesQuery,
  SftpStatus,
  SftpRunStatus,
} from './sftp-reports.types';

@Controller('sftp')
export class SftpReportsController {
  constructor(private readonly service: SftpReportsService) {}

  /**
   * GET /sftp-executions
   * Lista execuções de processamento SFTP
   * Query params: clientKey?, status?, limit?, skip?
   */
  @Get('sftp-executions')
  async getExecutions(
    @Query('clientKey') clientKey?: string,
    @Query('status') status?: SftpRunStatus,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
  ): Promise<SftpExecutionsResponse> {
    const query: SftpExecutionsQuery = {
      limit: limit ?? 50,
      skip: skip ?? 0,
    };

    if (clientKey) query.clientKey = clientKey;
    if (status) query.status = status;

    return this.service.getExecutions(query);
  }

  /**
   * GET /sftp-files
   * Lista arquivos baixados via SFTP
   * Query params: clientKey?, status?, limit?, skip?
   */
  @Get('sftp-files')
  async getFiles(
    @Query('clientKey') clientKey?: string,
    @Query('status') status?: SftpStatus,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
  ): Promise<SftpFilesResponse> {
    const query: SftpFilesQuery = {
      limit: limit ?? 50,
      skip: skip ?? 0,
    };

    if (clientKey) query.clientKey = clientKey;
    if (status) query.status = status;

    return this.service.getFiles(query);
  }

  /**
   * GET /sftp-report/:id
   * Detalhes de uma execução específica
   */
  @Get('sftp-report/:id')
  async getReportById(
    @Param('id') id: string,
  ): Promise<SftpReportDto> {
    const result = await this.service.getReportById(id);

    if (!result.execution) {
      throw new NotFoundException(`Execucao com id ${id} nao encontrada`);
    }

    return result;
  }

  /**
   * GET /sftp-horarios
   * Informações de agendamento (cron) para SFTP
   */
  @Get('sftp-horarios')
  async getHorarios(): Promise<SftpHorariosResponse> {
    return this.service.getHorarios();
  }
}