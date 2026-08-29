import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SignatureRetryCronService } from './core/signature-retry.cron';
import { ExamesLoaderService } from './exames/exames-loader.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MongoModule } from './mongo/mongo.module';
import { SocModule } from './soc/soc.module';
import { WebsocketConnectionModule } from './websocket/websocket-connection.module';
import { PdfmakeModule } from './pdfmake/pdfmake.module';
import { AzureModule } from './azure/azure.module';
import { NodmailerModule } from './nodemailer/nodemailer.module';
import { SupabaseModule } from './supabase/supabase.module';
import { SignatureModule } from './signature/signature.module';
import { LoggerModule } from './core/logger/logger.module';

require('dotenv').config();

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    WebsocketConnectionModule,
    MongoModule,
    SocModule,
    PdfmakeModule,
    AzureModule,
    NodmailerModule,
    SupabaseModule,
    SignatureModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SignatureRetryCronService,
    ExamesLoaderService,
  ],
})
export class AppModule {}
