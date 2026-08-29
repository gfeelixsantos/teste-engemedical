import { Body, Controller, Post } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  @Post('subscribe')
  async subscribe(@Body() data: any) {
    const { unidade, subscription, tipo, sala, exame } = data;

    const contexto = { tipo, sala, exame };

    await this.pushService.addSubscription(unidade, subscription, contexto);

    return { success: true };
  }
}
