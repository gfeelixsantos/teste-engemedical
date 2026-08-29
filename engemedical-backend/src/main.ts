import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { StructuredLogger } from './utils/logger';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import * as dns from 'node:dns';

// Fix for ECONNREFUSED on MongoDB SRV lookups in Node 17+ on some Windows environments
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const DEFAULT_CORS_ORIGINS = [
  'https://cmso360-frontend.vercel.app',
  'http://localhost:3000',
];

function normalizeEnvValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function resolveCorsOrigins() {
  const raw = normalizeEnvValue(process.env.CORS_ORIGIN || '');

  if (!raw) return DEFAULT_CORS_ORIGINS;

  const list = raw
    .split(',')
    .map((item) => normalizeEnvValue(item))
    .filter(Boolean);

  if (!list.length) return DEFAULT_CORS_ORIGINS;

  return list;
}

async function bootstrap() {
  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  });

  console.log('🎬 Starting bootstrap process...');
  console.log(
    `🔍 Environment check: PORT=${process.env.PORT}, MONGO_URL=${process.env.MONGO_URL ? 'PRESENT' : 'MISSING'}`,
  );

  try {
    console.log('📦 Initializing NestFactory...');
    const logger = new StructuredLogger();
    logger.setContext('Bootstrap');

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger,
    });
    console.log('✅ NestFactory created.');

    app.enableCors({
      origin: '*',
      methods: '*',
      allowedHeaders: '*',
      credentials: true,
    });

    console.log('📁 Setting up static assets and directories...');
    // Configuração do diretório de áudio temporário
    const audioPath = join(process.cwd(), 'temp', 'audio');
    if (!existsSync(audioPath)) {
      mkdirSync(audioPath, { recursive: true });
    }

    const audiometriaPath = join(process.cwd(), 'temp', 'audiometria');
    if (!existsSync(audiometriaPath)) {
      mkdirSync(audiometriaPath, { recursive: true });
    }

    app.useStaticAssets(audioPath, { prefix: '/temp/audio/' });
    app.useStaticAssets(audiometriaPath, { prefix: '/temp/audiometria/' });
    console.log('✅ Static assets configured.');

    if (typeof global.crypto === 'undefined') {
      const crypto = require('crypto');
      global.crypto = crypto;
    }

    const port = Number(process.env.PORT) || 3333;
    const host = '0.0.0.0';

    console.log(`🚀 Attempting to listen on ${host}:${port}...`);
    await app.listen(port, host);

    console.log(
      `✅ Application is definitely listening on http://${host}:${port}`,
    );
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

bootstrap();
