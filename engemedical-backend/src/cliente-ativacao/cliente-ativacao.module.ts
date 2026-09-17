import { Module } from '@nestjs/common';
import { ClienteFuncionariosModule } from '../cliente-funcionarios/cliente-funcionarios.module';
import { MongoModule } from '../mongo/mongo.module';
import { JwtAuthGuard } from '../soc/guards/jwt-auth.guard';
import { ClientActivationController } from './cliente-ativacao.controller';
import { ClientActivationRepository } from './cliente-ativacao.repository';
import { ClientActivationService } from './cliente-ativacao.service';
import { CommitmentsModule } from '../commitments/commitments.module';

@Module({
  imports: [ClienteFuncionariosModule, MongoModule, CommitmentsModule],
  controllers: [ClientActivationController],
  providers: [JwtAuthGuard, ClientActivationRepository, ClientActivationService],
})
export class ClienteAtivacaoModule {}
