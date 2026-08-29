import 'reflect-metadata';

import { MODULE_METADATA } from '@nestjs/common/constants';

import { AppModule } from './app.module';
import { GedBatchModule } from './ged-batch/ged-batch.module';

describe('AppModule composition', () => {
  it('imports GedBatchModule so CronJobs can resolve GedBatchService', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? [];

    expect(imports).toContain(GedBatchModule);
  });
});
