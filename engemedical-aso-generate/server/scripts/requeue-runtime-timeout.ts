import 'dotenv/config';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { connectdb, getDb } from '../src/database/mongodb/connection';
import { QueueServiceClient } from '@azure/storage-queue';
import {
  buildAsoRequeuePayload,
  getMissingRequiredFields,
  isAsoEligibleForProcessing,
} from './requeue-aso-processing-lib';

async function main(): Promise<void> {
  const connectionString = process.env.AZURE_CONNECTION_STRING_BLOB;
  const collectionName =
    process.env.DATABASE_COLLECTION ||
    process.env.DATABASE_COLECTION ||
    process.env.MONGO_COLLECTION ||
    'schedulings';
  const queueName = process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing';

  if (!connectionString) {
    throw new Error('AZURE_CONNECTION_STRING_BLOB não configurado');
  }

  if (!process.env.DATABASE_URI) {
    throw new Error('DATABASE_URI não configurado');
  }

  const mongoClient: MongoClient = await connectdb();
  const collection = getDb().collection(collectionName);

  const queueServiceClient =
    QueueServiceClient.fromConnectionString(connectionString);
  const queueClient = queueServiceClient.getQueueClient(queueName);

  const exists = await queueClient.exists();
  if (!exists) {
    throw new Error(`Fila "${queueName}" não existe`);
  }

  console.log('[REQUEUE-RUNTIME-TIMEOUT] Iniciando reenfileiramento de atendimentos com erro "Runtime.callFunctionOn timed out"');

  // Query for schedulings with Runtime.callFunctionOn timed out error
  const docs = await collection
    .find({
      'ASOINFO.signature.error': { $regex: 'Runtime.callFunctionOn timed out' },
    })
    .toArray();

  console.log(`[REQUEUE-RUNTIME-TIMEOUT] Encontrados ${docs.length} atendimentos com o erro`);

  let totalRequeued = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const doc of docs) {
    const schedulingId = String(doc?._id || '').trim();

    try {
      // Check if eligible for processing
      if (!isAsoEligibleForProcessing(doc)) {
        console.warn(
          `[REQUEUE-RUNTIME-TIMEOUT] schedulingId=${schedulingId} ignorado: não é elegível para processamento`,
        );
        totalSkipped++;
        continue;
      }

      // Build payload
      const rebuiltPayload = buildAsoRequeuePayload(doc);
      const rebuiltMissing = getMissingRequiredFields(rebuiltPayload);
      
      if (rebuiltMissing.length > 0) {
        console.warn(
          `[REQUEUE-RUNTIME-TIMEOUT] schedulingId=${schedulingId} não reenfileirado: payload incompleto (${rebuiltMissing.join(', ')})`,
        );
        totalSkipped++;
        continue;
      }

      // Send to queue
      await queueClient.sendMessage(JSON.stringify(rebuiltPayload));

      // Mark as queued
      const queuedAt = new Date();
      const filter = ObjectId.isValid(schedulingId)
        ? { _id: new ObjectId(schedulingId) }
        : { _id: schedulingId as any };

      await collection.updateOne(filter, {
        $set: {
          'ASOINFO.processingQueuedAt': queuedAt,
          'ASOINFO.updatedAt': queuedAt,
        },
      });

      console.log(
        `[REQUEUE-RUNTIME-TIMEOUT] schedulingId=${schedulingId} reenfileirado com sucesso`,
      );
      totalRequeued++;
    } catch (error) {
      console.error(
        `[REQUEUE-RUNTIME-TIMEOUT] Erro ao reenfileirar schedulingId=${schedulingId}: ${error}`,
      );
      totalErrors++;
    }
  }

  await mongoClient.close();

  console.log(
    `[REQUEUE-RUNTIME-TIMEOUT] Resumo => total=${docs.length} | reenfileirados=${totalRequeued} | ignorados=${totalSkipped} | erros=${totalErrors}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[REQUEUE-RUNTIME-TIMEOUT] Erro: ${message}`);
  process.exit(1);
});
