import { forwardRef, Module } from '@nestjs/common';
import { PainelModule } from 'src/painel/painel.module';
import { SocModule } from 'src/soc/soc.module';
import { TicketModule } from 'src/ticket/ticket.module';
import { WebsocketGateway } from './websocket-connection';
import { PushModule } from 'src/push/push.module';
import { MongoModule } from 'src/mongo/mongo.module';
import { TtsModule } from 'src/aws/tts.module';
import { AzureModule } from 'src/azure/azure.module';
import { BiometriaCryptoService } from 'src/biometria/biometria-crypto.service';
import { BiometriaLgpdTermoService } from 'src/biometria/biometria-lgpd-termo.service';
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { AtendimentoAuthModule } from 'src/atendimento-auth/atendimento-auth.module';
import { FacialModule } from 'src/facial/facial.module';
import { TeleatendimentoModule } from 'src/teleatendimento/teleatendimento.module';

@Module({
  imports: [
    forwardRef(() => TicketModule),
    forwardRef(() => MongoModule),
    PainelModule,
    SocModule,
    PushModule,
    TtsModule,
    AzureModule,
    AuditLogModule,
    forwardRef(() => AtendimentoAuthModule),
    FacialModule,
    TeleatendimentoModule,
  ],
  providers: [
    WebsocketGateway,
    BiometriaCryptoService,
    BiometriaLgpdTermoService,
  ],
  exports: [WebsocketGateway],
})
export class WebsocketConnectionModule {}
