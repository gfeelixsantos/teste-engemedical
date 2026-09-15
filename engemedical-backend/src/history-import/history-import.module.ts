import { Module } from '@nestjs/common';
import { MongoModule } from '../mongo/mongo.module';
import { SocModule } from '../soc/soc.module';
import { HistoryImportController } from './history-import.controller';
import { HistoryImportService } from './history-import.service';
import { HistoryImportCancellationRegistry } from './history-import-cancellation';
import { HistoryImportStorage } from './history-import-storage';

@Module({ imports: [MongoModule, SocModule], controllers: [HistoryImportController], providers: [HistoryImportService, HistoryImportCancellationRegistry, HistoryImportStorage] })
export class HistoryImportModule {}
