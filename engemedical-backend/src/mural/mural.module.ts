import { Module } from '@nestjs/common';
import { MuralController } from './mural.controller';
import { MuralService } from './mural.service';
import { MongoModule } from '../mongo/mongo.module';

@Module({
  imports: [MongoModule],
  controllers: [MuralController],
  providers: [MuralService],
  exports: [MuralService],
})
export class MuralModule {}
