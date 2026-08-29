import 'dotenv/config';
import { QueueServiceClient } from '@azure/storage-queue';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { connectdb, getDb } from '../src/database/mongodb/connection';
import {
  buildSchedulingTriageReport,
  QueueMessageSnapshot,
} from './triage-aso-processing-queue-lib';

type Args = {
  queue: string;
  batchSize: number;
  maxRounds: number;
  limit: number;
  visibilityTimeout: number;
  json: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    queue: process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing',
    batchSize: 32,
    maxRounds: 20,
    limit: 500,
    visibilityTimeout: 45,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === '--queue' && next) {
      args.queue = next;
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

    if (token === '--visibility' && next) {
      args.visibilityTimeout = Number(next) || args.visibilityTimeout;
      i++;
      continue;
    }

    if (token === '--json') {
      args.json = true;
      continue;
    }
  }

  return args;
}

function parseQueueMessage(messageText: string): any | null {
  const raw = String(messageText || '');
  const candidates = [raw];

  if (!raw.trim().startsWith('{') && !raw.trim().startsWith('[')) {
    try {
      candidates.unshift(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      // ignore
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next
    }
  }

  return null;
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

function formatReportText(report: ReturnType<typeof buildSchedulingTriageReport>) {
  return [
    `[TRIAGE] schedulingId=${report.schedulingId} nome=${report.nomeFuncionario || '-'} decision=${report.decision}`,
    `  mensagens=${report.messageCount} canonical=${report.canonicalMessageId || '-'} dequeueCounts=${report.dequeueCounts.join(',') || '0'}`,
    `  backendEligible=${String(report.backendEligible)} mongoDoc=${report.hasMongoDoc} payloadInvalido=${report.hasInvalidPayload}`,
    `  payloadMedicos=${report.payloadDoctorCodes.join(',') || '-'} mongoMedico=${report.mongoDoctorCode || '-'}`,
    `  reasons=${report.rationale.join(',') || '-'} backendReasons=${report.backendReasons.join(',') || '-'}`,
    `  missingFields=${report.missingFieldsUnion.join(',') || '-'}`,
  ].join('\n');
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
    throw new Error('AZURE_CONNECTION_STRING_BLOB nao configurado');
  }

  if (!process.env.DATABASE_URI) {
    throw new Error('DATABASE_URI nao configurado');
  }

  const mongoClient: MongoClient = await connectdb();
  const collection = getDb().collection(collectionName);

  const queueServiceClient =
    QueueServiceClient.fromConnectionString(connectionString);
  const queueClient = queueServiceClient.getQueueClient(args.queue);

  const exists = await queueClient.exists();
  if (!exists) {
    throw new Error(`Fila "${args.queue}" nao existe`);
  }

  const queueProps = await queueClient.getProperties();
  const messages: QueueMessageSnapshot[] = [];

  for (
    let round = 1;
    round <= args.maxRounds && messages.length < args.limit;
    round++
  ) {
    const response = await queueClient.receiveMessages({
      numberOfMessages: Math.max(1, Math.min(32, args.batchSize)),
      visibilityTimeout: args.visibilityTimeout,
    });

    const items = response.receivedMessageItems || [];
    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      messages.push({
        messageId: item.messageId,
        popReceipt: item.popReceipt,
        insertedOn: item.insertedOn,
        expiresOn: item.expiresOn,
        dequeueCount: item.dequeueCount,
        payload: parseQueueMessage(item.messageText),
        rawText: item.messageText,
      });

      if (messages.length >= args.limit) {
        break;
      }
    }
  }

  const grouped = new Map<string, QueueMessageSnapshot[]>();
  const missingSchedulingIdMessages = messages.filter(
    (message) => !String(message.payload?.schedulingId || '').trim(),
  );

  for (const message of messages) {
    const schedulingId = String(message.payload?.schedulingId || '').trim();
    if (!schedulingId) {
      continue;
    }

    if (!grouped.has(schedulingId)) {
      grouped.set(schedulingId, []);
    }
    grouped.get(schedulingId)!.push(message);
  }

  const mongoCache = new Map<string, any | null>();
  for (const schedulingId of grouped.keys()) {
    mongoCache.set(
      schedulingId,
      await findSchedulingDoc(collection, schedulingId),
    );
  }

  const reports = [...grouped.entries()]
    .map(([schedulingId, schedulingMessages]) =>
      buildSchedulingTriageReport({
        schedulingId,
        messages: schedulingMessages,
        mongoDoc: mongoCache.get(schedulingId),
      }),
    )
    .sort((a, b) => {
      if (b.messageCount !== a.messageCount) {
        return b.messageCount - a.messageCount;
      }
      return a.schedulingId.localeCompare(b.schedulingId);
    });

  const summary = {
    queue: args.queue,
    approximateMessagesCount: Number(
      queueProps?.approximateMessagesCount || 0,
    ),
    sampledMessages: messages.length,
    sampledSchedulingIds: reports.length,
    missingSchedulingIdMessages: missingSchedulingIdMessages.length,
    byDecision: reports.reduce<Record<string, number>>((acc, report) => {
      acc[report.decision] = (acc[report.decision] || 0) + 1;
      return acc;
    }, {}),
  };

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          summary,
          reports,
          missingSchedulingIdMessages: missingSchedulingIdMessages.map(
            (message) => ({
              messageId: message.messageId,
              dequeueCount: message.dequeueCount || 0,
            }),
          ),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `[TRIAGE] queue=${summary.queue} approx=${summary.approximateMessagesCount} sampledMessages=${summary.sampledMessages} sampledSchedulingIds=${summary.sampledSchedulingIds} missingSchedulingId=${summary.missingSchedulingIdMessages}`,
    );
    console.log(
      `[TRIAGE] decisions=${Object.entries(summary.byDecision)
        .map(([decision, count]) => `${decision}:${count}`)
        .join(' | ') || '-'}`,
    );

    for (const report of reports) {
      console.log(formatReportText(report));
    }

    if (missingSchedulingIdMessages.length > 0) {
      console.log(
        `[TRIAGE] mensagens sem schedulingId: ${missingSchedulingIdMessages
          .map((message) => message.messageId)
          .join(', ')}`,
      );
    }
  }

  await mongoClient.close();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[TRIAGE] Erro: ${message}`);
  process.exit(1);
});
