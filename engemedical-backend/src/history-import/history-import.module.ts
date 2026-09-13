import { Module } from '@nestjs/common';
import { MongoModule } from '../mongo/mongo.module';
import { SocModule } from '../soc/soc.module';
import { HistoryImportController } from './history-import.controller';
import { HistoryImportService } from './history-import.service';

@Module({ imports: [MongoModule, SocModule], controllers: [HistoryImportController], providers: [HistoryImportService] })
export class HistoryImportModule {}
