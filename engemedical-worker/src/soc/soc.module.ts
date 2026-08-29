import { forwardRef, Module } from '@nestjs/common';
import { SocService } from './soc.service';
import { SocController } from './soc.controller';
import { MongoModule } from '../mongo/mongo.module';

@Module({
  imports: [forwardRef(() => MongoModule)],
  controllers: [SocController],
  providers: [SocService],
  exports: [SocService],
})
export class SocModule {}
