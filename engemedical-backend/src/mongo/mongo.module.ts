import { forwardRef, Module } from '@nestjs/common';
import { MongoService } from './mongo.service';
import { EmpresaCacheService } from './empresa-cache.service';
import { MongoController } from './mongo.controller';
import { WebsocketConnectionModule } from 'src/websocket/websocket-connection.module';
import { SocModule } from 'src/soc/soc.module';
import { AzureModule } from 'src/azure/azure.module';
import { TicketModule } from 'src/ticket/ticket.module';
import { StatisticsService } from './statistics.service';
import { SignatureModule } from 'src/signature/signature.module';
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { UnitsModule } from 'src/units/units.module';
import { OrientacoesConfigModule } from 'src/orientacoes-config/orientacoes-config.module';

@Module({
  imports: [
    forwardRef(() => WebsocketConnectionModule),
    forwardRef(() => AzureModule),
    forwardRef(() => SocModule),
    forwardRef(() => SignatureModule),
    forwardRef(() => UnitsModule),
    AuditLogModule,
    TicketModule,
    OrientacoesConfigModule,
  ],
  controllers: [MongoController],
  providers: [
    // Serviço principal (usa composição)
    MongoService,
    StatisticsService,
    EmpresaCacheService,
  ],
  exports: [MongoService, EmpresaCacheService],
})
export class MongoModule {}
