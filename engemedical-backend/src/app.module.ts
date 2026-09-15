import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TicketController } from './ticket/ticket.controller';
import { MongoModule } from './mongo/mongo.module';
import { SocModule } from './soc/soc.module';
import { VolumetriaModule } from './volumetria/volumetria.module';
import { WebsocketConnectionModule } from './websocket/websocket-connection.module';
import { TtsModule } from './aws/tts.module';
import { PainelModule } from './painel/painel.module';
import { TicketModule } from './ticket/ticket.module';
import { PushModule } from './push/push.module';
import { AzureModule } from './azure/azure.module';
import { SupabaseModule } from './supabase/supabase.module';
import { PscModule } from './psc/psc.module';
import { SignatureModule } from './signature/signature.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { HealthController } from './health/health.controller';
import { InternalModule } from './internal/internal.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { NodemailerModule } from './nodemailer/nodemailer.module';
import { StructuredLogger } from './utils/logger';
import { LoggerModule } from './utils/logger.module';
import { LoggerMiddleware } from './utils/logger.middleware';
import { MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { GedBatchModule } from './ged-batch/ged-batch.module';
import { CronModule } from './cron/cron.module';
import { BlobProxyModule } from './blob-proxy/blob-proxy.module';
import { UsersModule } from './users/users.module';
import { ExamesModule } from './exames/exames.module';
import { GruposModule } from './grupos/grupos.module';
import { PrestadoresModule } from './prestadores/prestadores.module';
import { RiscosConfigModule } from './riscos-config/riscos-config.module';
import { OrientacoesConfigModule } from './orientacoes-config/orientacoes-config.module';
import { EmpresasModule } from './empresas/empresas.module';
import { FacialModule } from './facial/facial.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AtendimentoAuthModule } from './atendimento-auth/atendimento-auth.module';
import { UnitsModule } from './units/units.module';
import { TeleatendimentoModule } from './teleatendimento/teleatendimento.module';
import { GoogleDriveModule } from './google/drive/google-drive.module';
import { CommitmentsModule } from './commitments/commitments.module';
import { MuralModule } from './mural/mural.module';
import { CustomerEmailCampaignModule } from './customer-email-campaign/customer-email-campaign.module';
import { SftpIntegratorModule } from './sftp-integrator/sftp-integrator.module';
import { SftpReportsModule } from './sftp-reports/sftp-reports.module';
import { ConvocacaoModule } from './convocacao/convocacao.module';
import { AbsenteismoModule } from './absenteismo/absenteismo.module';
import { EsocialModule } from './esocial/esocial.module';
import { VidasModule } from './vidas/vidas.module';
import { DocumentosModule } from './documentos/documentos.module';
import { ProfissionaisModule } from './profissionais/profissionais.module';
import { HistoryImportModule } from './history-import/history-import.module';
import { ClienteDashboardModule } from './cliente-dashboard/cliente-dashboard.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { PrestadoresDashboardModule } from './prestadores-dashboard/prestadores-dashboard.module';
import { ClienteFuncionariosModule } from './cliente-funcionarios/cliente-funcionarios.module';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: path.resolve(__dirname, '../.env') }),
    VolumetriaModule,
    AbsenteismoModule,
    EsocialModule,
    WebsocketConnectionModule,
    MongoModule,
    SocModule,
    TtsModule,
    PainelModule,
    TicketModule,
    PushModule,
    AzureModule,
    SupabaseModule,
    PscModule,
    SignatureModule,
    UserSettingsModule,
    InternalModule,
    ScrapersModule,
    NodemailerModule,
    LoggerModule,
    GedBatchModule,
    CronModule,
    BlobProxyModule,
    UsersModule,
    ExamesModule,
    GruposModule,
    PrestadoresModule,
    RiscosConfigModule,
    OrientacoesConfigModule,
    EmpresasModule,
    FacialModule,
    AuditLogModule,
    AtendimentoAuthModule,
    UnitsModule,
    TeleatendimentoModule,
    GoogleDriveModule,
    CommitmentsModule,
    MuralModule,
    CustomerEmailCampaignModule,
    SftpIntegratorModule,
    SftpReportsModule,
    ConvocacaoModule,
    VidasModule,
    DocumentosModule,
    ProfissionaisModule,
    HistoryImportModule,
    ClienteDashboardModule,
    FinanceiroModule,
    PrestadoresDashboardModule,
    ClienteFuncionariosModule,
  ],
  controllers: [AppController, TicketController, HealthController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
