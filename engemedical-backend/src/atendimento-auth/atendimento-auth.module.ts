import { Module, forwardRef } from '@nestjs/common';
import { MongoModule } from 'src/mongo/mongo.module';
import { AtendimentoAuthService } from './atendimento-auth.service';

@Module({
  imports: [forwardRef(() => MongoModule)],
  providers: [AtendimentoAuthService],
  exports: [AtendimentoAuthService],
})
export class AtendimentoAuthModule {}
