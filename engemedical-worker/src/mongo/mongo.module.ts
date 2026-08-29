import { forwardRef, Module } from '@nestjs/common';
import { MongoService } from './mongo.service';
import { MongoController } from './mongo.controller';
import { WebsocketConnectionModule } from 'src/websocket/websocket-connection.module';
import { SocModule } from 'src/soc/soc.module';
import { AzureModule } from 'src/azure/azure.module';

@Module({
  imports: [forwardRef(() => WebsocketConnectionModule), AzureModule],
  controllers: [MongoController],
  providers: [MongoService],
  exports: [MongoService],
})
export class MongoModule {}
