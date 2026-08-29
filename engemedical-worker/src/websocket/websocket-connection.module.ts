import { forwardRef, Module } from '@nestjs/common';

import { SocModule } from 'src/soc/soc.module';

import { WebsocketGateway } from './websocket-connection';

@Module({
  imports: [SocModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketConnectionModule {}
