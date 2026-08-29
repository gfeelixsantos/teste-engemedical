import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { MongoModule } from 'src/mongo/mongo.module';
import { SignatureModule } from 'src/signature/signature.module';
import { AzureService } from 'src/azure/azure.service';

@Module({
  imports: [MongoModule, SignatureModule],
  providers: [AzureService],
  controllers: [InternalController],
})
export class InternalModule {}
