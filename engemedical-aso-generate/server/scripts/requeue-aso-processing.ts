import 'dotenv/config';
import { QueueServiceClient } from '@azure/storage-queue';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { connectdb, getDb } from '../src/database/mongodb/connection';
import {
  buildAsoRequeuePayload,
  getMessageMissingRequiredFields,
  getMissingRequiredFields,
  isAsoEligibleForProcessing,
  isPendingMongoAsoCandidate,
} from './requeue-aso-processing-lib';

type Args = {
  queue: string;
  batchSize: number;
  maxRounds: number;
  limit: number;
  dryRun: boolean;
  schedulingIds: Set<string>;
  processAllVisible: boolean;
  fromMongoPending: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    queue: process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing',
    batchSize: 32,
    maxRounds: 100,
    limit: 200,
    dryRun: false,
    schedulingIds: new Set<string>(),
    processAllVisible: false,
    fromMongoPending: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === '--queue' && next) {
      args.queue = next;
      i++;
      continue;
    }

    if (token === '--schedulingId' && next) {
      next
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => args.schedulingIds.add(item));
      i++;
      continue;
    }

    if (token === '--batch' && next) {
      args.batchSize = Number(next) || args.batchSize;
      i++;
      continue;
    }

    if (token === '--maxRounds' && next) {
      args.maxRounds = Number(next) || args.maxRounds;
      i++;
      continue;
    }

    if (token === '--limit' && next) {
      args.limit = Number(next) || args.limit;
      i++;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--all-visible') {
      args.processAllVisible = true;
      continue;
    }

    if (token === '--from-mongo-pending') {
      args.fromMongoPending = true;
      continue;
    }
  }

  return args;
}

function parseQueueMessage(messageText: string): any | null {
  try {
    return JSON.parse(messageText);
  } catch {
    return null;
  }
}

function shouldProcessMessage(payload: any, args: Args): boolean {
  if (!payload) {
    return false;
  }

  const schedulingId = String(payload?.schedulingId || '').trim();
  if (args.schedulingIds.size > 0) {
    return schedulingId.length > 0 && args.schedulingIds.has(schedulingId);
  }

  if (args.processAllVisible) {
    return true;
  }

  return getMessageMissingRequiredFields(payload).length > 0;
}

async function findSchedulingDoc(
  collection: Collection,
  schedulingId: string,
): Promise<any | null> {
  if (!schedulingId.trim()) {
    return null;
  }

  if (ObjectId.isValid(schedulingId)) {
    const byObjectId = await collection.findOne({
      _id: new ObjectId(schedulingId),
    });
    if (byObjectId) {
      return byObjectId;
    }
  }

  return collection.findOne({ _id: schedulingId as any });
}

async function markAsQueuedForProcessing(
  collection: Collection,
  schedulingId: string,
): Promise<void> {
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
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = process.env.AZURE_CONNECTION_STRING_BLOB;
  const collectionName =
    process.env.DATABASE_COLLECTION ||
    process.env.DATABASE_COLECTION ||
    process.env.MONGO_COLLECTION ||
    'schedulings';

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
  const queueClient = queueServiceClient.getQueueClient(args.queue);

  const exists = await queueClient.exists();
  if (!exists) {
    throw new Error(`Fila "${args.queue}" não existe`);
  }

  console.log(
    `[REQUEUE] Iniciando rotina | queue=${args.queue} | dryRun=${args.dryRun} | schedulingIds=${args.schedulingIds.size || 0} | allVisible=${args.processAllVisible} | fromMongoPending=${args.fromMongoPending} | limit=${args.limit}`,
  );

  let totalSeen = 0;
  let totalCandidates = 0;
  let totalRequeued = 0;
  let totalDeleted = 0;
  let totalSkipped = 0;
  const touchedSchedulingIds = new Set<string>();
  const mongoStatuses = new Set(['PENDENTE', 'FALHA']);

  try {
    if (args.fromMongoPending) {
      const filter =
        args.schedulingIds.size > 0
          ? {
              _id: {
                $in: [...args.schedulingIds]
                  .filter((id) => ObjectId.isValid(id))
                  .map((id) => new ObjectId(id)),
              },
            }
          : {
              'ASOINFO.status': { $in: [...mongoStatuses] },
            };

      const docs = await collection
        .find(filter)
        .limit(Math.max(1, args.limit))
        .toArray();

      totalSeen = docs.length;

      for (const doc of docs) {
        const schedulingId = String(doc?._id || '').trim();

        if (
          args.schedulingIds.size === 0 &&
          !isPendingMongoAsoCandidate(doc, mongoStatuses)
        ) {
          totalSkipped++;
          continue;
        }

        totalCandidates++;

        if (
          args.schedulingIds.size > 0 &&
          !isAsoEligibleForProcessing(doc)
        ) {
          console.warn(
            `[REQUEUE] schedulingId=${schedulingId} ignorado: somente parecer APTO puro pode entrar no aso-processing.`,
          );
          totalSkipped++;
          continue;
        }

        const rebuiltPayload = buildAsoRequeuePayload(doc);
        const rebuiltMissing = getMissingRequiredFields(rebuiltPayload);
        if (rebuiltMissing.length > 0) {
          console.warn(
            `[REQUEUE] schedulingId=${schedulingId} não reenfileirado: payload reconstruído continua incompleto (${rebuiltMissing.join(', ')}).`,
          );
          totalSkipped++;
          continue;
        }

        console.log(
          `[REQUEUE] schedulingId=${schedulingId} source=mongo status=${String(doc?.ASOINFO?.status || '-')} action=REENQUEUE`,
        );

        if (args.dryRun) {
          touchedSchedulingIds.add(schedulingId);
          totalRequeued++;
          continue;
        }

        await queueClient.sendMessage(JSON.stringify(rebuiltPayload));
        await markAsQueuedForProcessing(collection, schedulingId);
        touchedSchedulingIds.add(schedulingId);
        totalRequeued++;
      }

      console.log(
        `[REQUEUE] Resumo => lidas=${totalSeen} | candidatas=${totalCandidates} | reenfileiradas=${totalRequeued} | removidas=${totalDeleted} | ignoradas=${totalSkipped} | schedulingIds=${touchedSchedulingIds.size}`,
      );
      return;
    }

    for (let round = 1; round <= args.maxRounds; round++) {
      const response = await queueClient.receiveMessages({
        numberOfMessages: Math.max(1, Math.min(32, args.batchSize)),
        visibilityTimeout: 300,
      });

      const items = response.receivedMessageItems || [];
      if (items.length === 0) {
        console.log(`[REQUEUE] Sem mais mensagens visíveis no round ${round}.`);
        break;
      }

      for (const message of items) {
        totalSeen++;
        const payload = parseQueueMessage(message.messageText);
        const schedulingId = String(payload?.schedulingId || '').trim();

        if (!shouldProcessMessage(payload, args)) {
          totalSkipped++;
          continue;
        }

        totalCandidates++;

        if (!payload) {
          console.warn(
            `[REQUEUE] Mensagem ${message.messageId} ignorada: payload não é JSON válido.`,
          );
          continue;
        }

        if (!schedulingId) {
          console.warn(
            `[REQUEUE] Mensagem ${message.messageId} ignorada: schedulingId ausente.`,
          );
          continue;
        }

        const doc = await findSchedulingDoc(collection, schedulingId);
        if (!doc) {
          console.warn(
            `[REQUEUE] schedulingId=${schedulingId} não encontrado no Mongo. Mensagem antiga preservada.`,
          );
          continue;
        }

        if (!isAsoEligibleForProcessing(doc)) {
          console.warn(
            `[REQUEUE] schedulingId=${schedulingId} ignorado: somente parecer APTO puro pode entrar no aso-processing.`,
          );
          continue;
        }

        const rebuiltPayload = buildAsoRequeuePayload(doc);
        const rebuiltMissing = getMissingRequiredFields(rebuiltPayload);
        if (rebuiltMissing.length > 0) {
          console.warn(
            `[REQUEUE] schedulingId=${schedulingId} não reenfileirado: payload reconstruído continua incompleto (${rebuiltMissing.join(', ')}).`,
          );
          continue;
        }

        const originalMissing = getMessageMissingRequiredFields(payload);
        const shouldSendFreshMessage = !touchedSchedulingIds.has(schedulingId);

        console.log(
          `[REQUEUE] schedulingId=${schedulingId} candidate=${message.messageId} missingOriginal=${originalMissing.join(',') || '-'} action=${shouldSendFreshMessage ? 'REENQUEUE' : 'DELETE_DUPLICATE'}`,
        );

        if (args.dryRun) {
          if (shouldSendFreshMessage) {
            touchedSchedulingIds.add(schedulingId);
            totalRequeued++;
          }
          totalDeleted++;
          continue;
        }

        if (shouldSendFreshMessage) {
          await queueClient.sendMessage(JSON.stringify(rebuiltPayload));
          await markAsQueuedForProcessing(collection, schedulingId);
          touchedSchedulingIds.add(schedulingId);
          totalRequeued++;
        }

        await queueClient.deleteMessage(message.messageId, message.popReceipt);
        totalDeleted++;
      }
    }
  } finally {
    await mongoClient.close();
  }

  console.log(
    `[REQUEUE] Resumo => lidas=${totalSeen} | candidatas=${totalCandidates} | reenfileiradas=${totalRequeued} | removidas=${totalDeleted} | ignoradas=${totalSkipped} | schedulingIds=${touchedSchedulingIds.size}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[REQUEUE] Erro: ${message}`);
  process.exit(1);
});
