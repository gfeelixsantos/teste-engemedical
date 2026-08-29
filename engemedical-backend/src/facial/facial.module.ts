import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AzureModule } from 'src/azure/azure.module';
import { AtendimentoAuthModule } from 'src/atendimento-auth/atendimento-auth.module';
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { BiometriaLgpdTermoService } from 'src/biometria/biometria-lgpd-termo.service';
import { MongoModule } from 'src/mongo/mongo.module';
import { FacialController } from './facial.controller';
import { FacialService } from './facial.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => MongoModule),
    forwardRef(() => AzureModule),
    forwardRef(() => AtendimentoAuthModule),
    AuditLogModule,
  ],
  controllers: [FacialController],
  providers: [FacialService, BiometriaLgpdTermoService],
  exports: [FacialService],
})
export class FacialModule {}
