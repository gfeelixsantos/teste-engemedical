const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { AsoSignatureService } = require('./dist/src/signature/aso-signature.service');
const { resolveMetadata } = require('./dist/src/signature/resolve-aso-metadata');
const { Db } = require('mongodb');

async function testAso() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // Simular injecao ou rodar diretamente.
}
testAso().catch(console.error);
