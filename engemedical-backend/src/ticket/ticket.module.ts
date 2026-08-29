import { forwardRef, Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TtsModule } from 'src/aws/tts.module';
import { WebsocketConnectionModule } from 'src/websocket/websocket-connection.module';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { MongoModule } from 'src/mongo/mongo.module';

@Module({
  imports: [
    TtsModule,
    SupabaseModule,
    forwardRef(() => WebsocketConnectionModule),
    forwardRef(() => MongoModule),
  ],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
