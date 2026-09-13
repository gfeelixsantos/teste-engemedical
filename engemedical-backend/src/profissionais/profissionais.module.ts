import { Module } from '@nestjs/common';
import { ProfissionaisController } from './profissionais.controller';
import { ProfissionaisService } from './profissionais.service';
import { MongoModule } from '../mongo/mongo.module';

@Module({
  imports: [MongoModule],
  controllers: [ProfissionaisController],
  providers: [ProfissionaisService],
  exports: [ProfissionaisService],
})
export class ProfissionaisModule {}
