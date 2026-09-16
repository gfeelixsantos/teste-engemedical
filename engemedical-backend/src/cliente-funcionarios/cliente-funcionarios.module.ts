import { Module } from '@nestjs/common';
import { MongoModule } from '../mongo/mongo.module';
import { SocModule } from '../soc/soc.module';
import { JwtAuthGuard } from '../soc/guards/jwt-auth.guard';
import { ClienteCompanyAccessService } from './cliente-company-access.service';
import { ClienteFuncionariosController } from './cliente-funcionarios.controller';
import { ClienteFuncionariosStatusService } from './cliente-funcionarios-status.service';
import {
  ClienteFuncionariosService,
  MongoClienteFuncionariosSchedulingReader,
} from './cliente-funcionarios.service';

@Module({
  imports: [MongoModule, SocModule],
  controllers: [ClienteFuncionariosController],
  providers: [
    JwtAuthGuard,
    ClienteCompanyAccessService,
    ClienteFuncionariosStatusService,
    MongoClienteFuncionariosSchedulingReader,
    ClienteFuncionariosService,
  ],
  exports: [ClienteCompanyAccessService],
})
export class ClienteFuncionariosModule {}
