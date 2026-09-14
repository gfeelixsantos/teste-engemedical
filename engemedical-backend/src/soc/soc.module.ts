import { forwardRef, Module } from '@nestjs/common';
import { SocService } from './soc.service';
import { SocController } from './soc.controller';
import { MongoModule } from '../mongo/mongo.module';
import { SocCompanyService } from './services/soc-company.service';
import { SocExportService } from './services/soc-export.service';
import { SocExamService } from './services/soc-exam.service';
import { SocRiskService } from './services/soc-risk.service';
import { SocEmployeeRiskService } from './services/soc-employee-risk.service';
import { SocAudiometryService } from './services/soc-audiometry.service';
import { SocPcdService } from './services/soc-pcd.service';
import { SocCredentialedService } from './services/soc-credentialed.service';
import { SocUploadService } from './services/soc-upload.service';
import { AsoWorkerOrchestratorService } from './services/aso-worker-orchestrator.service';
import { AzureModule } from 'src/azure/azure.module';
import { GoogleDriveModule } from 'src/google/drive/google-drive.module';
import { NodemailerModule } from '../nodemailer/nodemailer.module';
import { UnitsModule } from '../units/units.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { RiscosConfigModule } from '../riscos-config/riscos-config.module';
import { SftpIntegratorModule } from '../sftp-integrator/sftp-integrator.module';
import { SocInactivationCancellationRegistry } from './soc-inactivation-cancellation';

@Module({
  imports: [
    forwardRef(() => MongoModule),
    forwardRef(() => AzureModule),
    GoogleDriveModule,
    NodemailerModule,
    forwardRef(() => UnitsModule),
    SupabaseModule,
    RiscosConfigModule,
    forwardRef(() => SftpIntegratorModule),
  ],
  controllers: [SocController],
  providers: [
    SocService,
    SocCompanyService,
    SocExportService,
    SocExamService,
    SocRiskService,
    SocEmployeeRiskService,
    SocAudiometryService,
    SocPcdService,
    SocCredentialedService,
    SocUploadService,
    AsoWorkerOrchestratorService,
    SocInactivationCancellationRegistry,
  ],
  exports: [
    SocService,
    SocCompanyService,
    SocExportService,
    SocExamService,
    SocRiskService,
    SocEmployeeRiskService,
    SocAudiometryService,
    SocPcdService,
    SocCredentialedService,
    SocUploadService,
    AsoWorkerOrchestratorService,
  ],
})
export class SocModule {}
