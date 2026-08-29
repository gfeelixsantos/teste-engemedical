import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppLogger } from './core/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = await app.resolve(AppLogger);
  app.useLogger(logger);

  logger.log('🚀 Starting application...');
  try {
    // Libera CORS para qualquer origem
    app.enableCors({
      origin: '*',
      methods: '*',
      allowedHeaders: '*',
    });

    await app.listen(process.env.PORT ?? 3334, '0.0.0.0');
    logger.log(`Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}
bootstrap();
