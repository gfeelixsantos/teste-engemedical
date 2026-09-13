import { Module } from '@nestjs/common';
import { VolumetriaController } from './volumetria.controller';
import { VolumetriaService } from './volumetria.service';
import { MongoModule } from '../mongo/mongo.module';
import { SocModule } from '../soc/soc.module';

@Module({
  imports: [MongoModule, SocModule],
  controllers: [VolumetriaController],
  providers: [VolumetriaService],
  exports: [VolumetriaService],
})
export class VolumetriaModule {}