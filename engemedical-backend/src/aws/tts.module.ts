import { Module } from '@nestjs/common';
import { PollyService } from './polly.service';
import { TtsService } from './tts.service';

@Module({
  providers: [PollyService, TtsService],
  exports: [PollyService, TtsService],
})
export class TtsModule {}
