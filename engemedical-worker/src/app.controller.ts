import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) {}

  @Get()
  async getHello(@Res() res: any) {
    const health = await this.appService.checkHealth();
    if (health.status === 'up') {
      return res.status(HttpStatus.OK).json({ ...health, status: 'ok' });
    } else {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ ...health, status: 'error' });
    }
  }
}
