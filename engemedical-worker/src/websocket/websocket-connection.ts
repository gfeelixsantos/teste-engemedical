import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { SocService } from 'src/soc/soc.service';
import { EventType } from './events/events';

@Injectable()
@WebSocketGateway({
  transports: ['websocket'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
})
export class WebsocketGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly socService: SocService) {}
}
