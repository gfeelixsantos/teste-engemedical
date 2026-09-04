import { Module } from '@nestjs/common';
import { EsocialController } from './esocial.controller';
import { EsocialService } from './esocial.service';

@Module({
  controllers: [EsocialController],
  providers: [EsocialService],
})
export class EsocialModule {}