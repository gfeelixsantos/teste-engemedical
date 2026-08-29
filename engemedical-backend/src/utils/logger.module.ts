import { Global, Module } from '@nestjs/common';
import { StructuredLogger } from './logger';

@Global()
@Module({
  providers: [StructuredLogger],
  exports: [StructuredLogger],
})
export class LoggerModule {}
