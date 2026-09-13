import {
  Controller,
  Body,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SftpIntegratorService } from './sftp-integrator.service';
import { SftpExecutionCancellationRegistry } from './sftp-execution-cancellation';

@Controller('internal/sftp-integrator')
export class SftpIntegratorController {
  constructor(
    private readonly service: SftpIntegratorService,
    @Optional() private readonly cancellation?: SftpExecutionCancellationRegistry,
  ) {}

  private assertInternalAuth(token?: string) {
    const expected = process.env.INTERNAL_WORKER_TOKEN;
    if (!expected) {
      throw new UnauthorizedException('INTERNAL_WORKER_TOKEN nao configurado');
    }
    if (!token || token !== expected) {
      throw new UnauthorizedException('Token interno invalido');
    }
  }

  @Post(':clientKey/pull')
  async pull(
    @Param('clientKey') clientKey: string,
    @Headers('x-internal-token') token?: string,
  ) {
    this.assertInternalAuth(token);
    return this.service.pullLatest(clientKey);
  }

  @Post(':clientKey/dry-run-latest')
  async dryRunLatest(
    @Param('clientKey') clientKey: string,
    @Headers('x-internal-token') token?: string,
  ) {
    this.assertInternalAuth(token);
    return this.service.pullLatestAndRunDryRun(clientKey);
  }

  @Get(':clientKey/files')
  async listFiles(
    @Param('clientKey') clientKey: string,
    @Headers('x-internal-token') token?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalAuth(token);
    return this.service.listFiles(clientKey, Number(limit || 50));
  }

  @Get(':clientKey/runs')
  async listRuns(
    @Param('clientKey') clientKey: string,
    @Headers('x-internal-token') token?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalAuth(token);
    return this.service.listRuns(clientKey, Number(limit || 50));
  }

  @Get(':clientKey/files/:id/download')
  async download(
    @Param('clientKey') clientKey: string,
    @Param('id') id: string,
    @Headers('x-internal-token') token: string | undefined,
    @Res() res: Response,
  ) {
    this.assertInternalAuth(token);
    const { file, path, buffer } = await this.service.getFileForDownload(clientKey, id);
    if (buffer) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${file.remoteName}"`);
      return res.send(buffer);
    }
    return res.download(path, file.remoteName);
  }

  @Get(':clientKey/runs/:id/report')
  async downloadReport(
    @Param('clientKey') clientKey: string,
    @Param('id') id: string,
    @Headers('x-internal-token') token: string | undefined,
    @Res() res: Response,
  ) {
    this.assertInternalAuth(token);
    const report = await this.service.getRunReportForDownload(clientKey, id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    res.send(report.buffer);
  }

  @Post(':clientKey/files/:id/parse')
  async parseFile(
    @Param('clientKey') clientKey: string,
    @Param('id') id: string,
    @Headers('x-internal-token') token?: string,
  ) {
    this.assertInternalAuth(token);
    return this.service.parseFile(clientKey, id);
  }

  @Post(':clientKey/files/:id/dry-run')
  async dryRun(
    @Param('clientKey') clientKey: string,
    @Param('id') id: string,
    @Headers('x-internal-token') token?: string,
  ) {
    this.assertInternalAuth(token);
    return this.service.runDryRun(clientKey, id);
  }

  @Post(':clientKey/files/:id/process-soc-limited')
  async processSocLimited(
    @Param('clientKey') clientKey: string,
    @Param('id') id: string,
    @Headers('x-internal-token') token?: string,
    @Body('executionId') executionId?: string,
    @Body('requestedByEmail') requestedByEmail?: string,
  ) {
    this.assertInternalAuth(token);
    if (executionId) this.cancellation?.start(executionId);
    try {
      return executionId
        ? await this.service.processSocLimited(clientKey, id, executionId, requestedByEmail)
        : await this.service.processSocLimited(clientKey, id);
    } finally {
      if (executionId) this.cancellation?.finish(executionId);
    }
  }

  @Post(':clientKey/executions/:executionId/cancel')
  cancelExecution(
    @Param('executionId') executionId: string,
    @Headers('x-internal-token') token?: string,
  ) {
    this.assertInternalAuth(token);
    this.cancellation?.cancel(executionId);
    return { executionId, status: 'cancellation_requested' };
  }
}
