import { Module } from '@nestjs/common';
import { MongoModule } from '../mongo/mongo.module';
import { SocModule } from '../soc/soc.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ClienteCompanyAccessService } from './cliente-company-access.service';
import { ClienteFuncionariosController } from './cliente-funcionarios.controller';
import { ClienteFuncionariosStatusService } from './cliente-funcionarios-status.service';
import {
  ClienteFuncionariosService,
  MongoClienteFuncionariosSchedulingReader,
} from './cliente-funcionarios.service';

@Module({
  imports: [MongoModule, SocModule, SupabaseModule],
  controllers: [ClienteFuncionariosController],
  providers: [
    ClienteCompanyAccessService,
    ClienteFuncionariosStatusService,
    MongoClienteFuncionariosSchedulingReader,
    ClienteFuncionariosService,
  ],
})
export class ClienteFuncionariosModule {}
