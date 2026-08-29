import { Module, forwardRef } from '@nestjs/common';
import { EmpresasController } from './empresas.controller';
import { EmpresaDocumentosService } from './empresa-documentos.service';
import { MongoModule } from 'src/mongo/mongo.module';
import { AzureModule } from 'src/azure/azure.module';
import { SocModule } from 'src/soc/soc.module';

@Module({
  imports: [
    forwardRef(() => MongoModule),
    forwardRef(() => AzureModule),
    forwardRef(() => SocModule),
  ],
  controllers: [EmpresasController],
  providers: [EmpresaDocumentosService],
  exports: [EmpresaDocumentosService],
})
export class EmpresasModule {}
