import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SftpIntegratorService } from './sftp-integrator.service';

@Controller('internal/sftp-integrator')
export class SftpIntegratorController {
  constructor(private readonly service: SftpIntegratorService) {}

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

  @Get(':clientKey/files')
  async listFiles(
    @Param('clientKey') clientKey: string,
    @Headers('x-internal-token') token?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalAuth(token);
    return this.service.listFiles(clientKey, Number(limit || 50));
  }

  @Get(':clientKey/files/:id/download')
  async download(
    @Param('clientKey') clientKey: string,
    @Param('id') id: string,
    @Headers('x-internal-token') token: string | undefined,
    @Res() res: Response,
  ) {
    this.assertInternalAuth(token);
    const { file, path } = await this.service.getFileForDownload(clientKey, id);
    res.download(path, file.remoteName);
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
}
