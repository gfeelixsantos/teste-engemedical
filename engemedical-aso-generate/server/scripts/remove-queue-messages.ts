import 'dotenv/config';
import { QueueServiceClient } from '@azure/storage-queue';

type Args = {
  queue: string;
  schedulingId?: string;
  nome?: string;
  batchSize: number;
  maxRounds: number;
  dryRun: boolean;
  dedupLatestById: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    queue: 'aso-processing',
    batchSize: 32,
    maxRounds: 200,
    dryRun: false,
    dedupLatestById: false,
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
      args.schedulingId = next;
      i++;
      continue;
    }

    if (token === '--nome' && next) {
      args.nome = next;
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

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--dedup-latest-by-id') {
      args.dedupLatestById = true;
      continue;
    }
  }

  return args;
}

function matchesFilter(payload: any, args: Args): boolean {
  if (args.schedulingId) {
    const sameId = String(payload?.schedulingId || '').trim() === args.schedulingId.trim();
    if (!sameId) {
      return false;
    }
  }

  if (args.nome) {
    const payloadName = String(payload?.nomeFuncionario || '').toLowerCase();
    const targetName = args.nome.toLowerCase();
    if (!payloadName.includes(targetName)) {
      return false;
    }
  }

  return true;
}

function getInsertedTimeMs(message: any): number {
  const value = message?.insertedOn;
  if (!value) {
    return 0;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.dedupLatestById && !args.schedulingId && !args.nome) {
    throw new Error(
      'Informe um filtro (--schedulingId e/ou --nome) ou use --dedup-latest-by-id',
    );
  }

  const connectionString = process.env.AZURE_CONNECTION_STRING_BLOB;
  if (!connectionString) {
    throw new Error('AZURE_CONNECTION_STRING_BLOB não configurado');
  }

  const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
  const queueClient = queueServiceClient.getQueueClient(args.queue);

  const exists = await queueClient.exists();
  if (!exists) {
    throw new Error(`Fila "${args.queue}" não existe`);
  }

  console.log(`[QUEUE] Iniciando varredura na fila: ${args.queue}`);
  console.log(`[QUEUE] Modo dedupLatestById=${args.dedupLatestById}`);
  console.log(`[QUEUE] Filtros => schedulingId=${args.schedulingId || '-'} | nome=${args.nome || '-'} | dryRun=${args.dryRun}`);

  let totalSeen = 0;
  let totalMatched = 0;
  let totalDeleted = 0;
  const latestBySchedulingId = new Map<string, any>();

  for (let round = 1; round <= args.maxRounds; round++) {
    const response = await queueClient.receiveMessages({
      numberOfMessages: Math.max(1, Math.min(32, args.batchSize)),
      visibilityTimeout: 300,
    });

    const items = response.receivedMessageItems || [];
    if (items.length === 0) {
      console.log(`[QUEUE] Sem mais mensagens visíveis no round ${round}.`);
      break;
    }

    for (const message of items) {
      totalSeen++;
      let payload: any = null;

      try {
        payload = JSON.parse(message.messageText);
      } catch {
        // Se não for JSON, nunca bate em filtros de schedulingId/nome.
        payload = null;
      }

      const matched = matchesFilter(payload, args);
      if (!args.dedupLatestById && !matched) {
        continue;
      }

      totalMatched++;
      const schedulingId = String(payload?.schedulingId || '-');
      const nome = String(payload?.nomeFuncionario || '-');

      if (args.dedupLatestById) {
        if (!payload?.schedulingId) {
          continue;
        }

        const key = String(payload.schedulingId).trim();
        const currentMs = getInsertedTimeMs(message);
        const previous = latestBySchedulingId.get(key);

        if (!previous) {
          latestBySchedulingId.set(key, message);
          continue;
        }

        const previousMs = getInsertedTimeMs(previous);
        const currentIsNewer = currentMs >= previousMs;
        const toDelete = currentIsNewer ? previous : message;
        const toKeep = currentIsNewer ? message : previous;
        latestBySchedulingId.set(key, toKeep);

        const duplicateInfo = `[QUEUE] Duplicada: keep=${toKeep.messageId} delete=${toDelete.messageId} schedulingId=${key} nome=${nome}`;
        console.log(duplicateInfo);

        if (!args.dryRun) {
          await queueClient.deleteMessage(toDelete.messageId, toDelete.popReceipt);
          totalDeleted++;
        }
      } else {
        console.log(
          `[QUEUE] Match: messageId=${message.messageId} schedulingId=${schedulingId} nome=${nome}`,
        );

        if (!args.dryRun) {
          await queueClient.deleteMessage(message.messageId, message.popReceipt);
          totalDeleted++;
        }
      }
    }
  }

  console.log(
    `[QUEUE] Resumo => lidas=${totalSeen} | matched=${totalMatched} | removidas=${totalDeleted} | dryRun=${args.dryRun}`,
  );
}

main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[QUEUE] Erro: ${msg}`);
  process.exit(1);
});
