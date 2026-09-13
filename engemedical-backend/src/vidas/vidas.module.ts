import { Module } from '@nestjs/common';
import { VidasController } from './vidas.controller';
import { VidasService } from './vidas.service';
import { MongoModule } from '../mongo/mongo.module';
import { SocModule } from '../soc/soc.module';

@Module({
  imports: [MongoModule, SocModule],
  controllers: [VidasController],
  providers: [VidasService],
  exports: [VidasService],
})
export class VidasModule {}
