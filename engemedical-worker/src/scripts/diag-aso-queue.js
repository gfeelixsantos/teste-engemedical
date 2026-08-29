const path = require('path');
const { QueueServiceClient } = require('@azure/storage-queue');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (const arg of args) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    parsed[key] = value || true;
  }

  return parsed;
}

function pickFirstFilled(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      if (value.trim() !== '') return value;
      continue;
    }
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return '';
}

async function peekQueueMessages(queueName, limit) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING não configurado.');
  }

  const queueServiceClient =
    QueueServiceClient.fromConnectionString(connectionString);
  const queueClient = queueServiceClient.getQueueClient(queueName);
  const response = await queueClient.peekMessages({
    numberOfMessages: limit,
  });

  return (response.peekedMessageItems || []).map((item) => ({
    messageId: item.messageId,
    insertedOn: item.insertedOn,
    expiresOn: item.expiresOn,
    payload: JSON.parse(item.messageText),
  }));
}

async function connectMongo() {
  const mongoUrl = process.env.MONGO_URL;
  const mongoDatabase = process.env.MONGO_DATABASE;
  if (!mongoUrl || !mongoDatabase) {
    throw new Error('MONGO_URL ou MONGO_DATABASE não configurados.');
  }

  const client = new MongoClient(mongoUrl, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  await client.connect();
  return {
    client,
    db: client.db(mongoDatabase),
  };
}

function findClinicalExam(scheduling) {
  return (scheduling?.EXAMES || []).find(
    (ex) =>
      ex?.nomeExame?.toUpperCase().includes('CLIN') ||
      ex?.grupo?.toUpperCase().includes('CLIN') ||
      ex?.codigoExame === 'clinico',
  );
}

function buildProfessionalLookupCandidates(payload, scheduling, exameClinico) {
  const payloadProfessional = payload?.profissional || null;
  const asoProfessional = scheduling?.ASOINFO?.professional || null;
  const clinicalProfessionalData =
    exameClinico?.professional || exameClinico?.profissionalData || null;

  const professionalCode = String(
    exameClinico?.codigoProfissional ||
      payloadProfessional?.codigo ||
      asoProfessional?.codigo ||
      scheduling?.ASOINFO?.codigoProfissional ||
      scheduling?.MEDICO ||
      '',
  ).trim();

  const professionalNameHint = String(
    payloadProfessional?.nome ||
      payloadProfessional?.name ||
      asoProfessional?.nome ||
      clinicalProfessionalData?.nome ||
      clinicalProfessionalData?.profissional ||
      exameClinico?.profissional ||
      exameClinico?.formulario?.medico ||
      exameClinico?.formulario?.profissional ||
      scheduling?.MEDICO ||
      '',
  ).trim();

  return {
    payloadProfessional,
    asoProfessional,
    clinicalProfessionalData,
    professionalCode,
    professionalNameHint,
  };
}

async function findDbUser(usersCollection, candidates) {
  const { professionalCode, professionalNameHint, asoProfessional } = candidates;
  const numericProfessionalCode = Number(professionalCode);
  const codeCandidates = Array.from(
    new Set(
      [
        professionalCode,
        Number.isFinite(numericProfessionalCode)
          ? String(numericProfessionalCode)
          : '',
      ].filter((value) => String(value || '').trim() !== ''),
    ),
  );
  const nameCandidates = Array.from(
    new Set(
      [
        professionalNameHint,
        asoProfessional?.nome,
      ].filter((value) => String(value || '').trim() !== ''),
    ),
  );

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (codeCandidates.length === 0 && nameCandidates.length === 0) {
    return null;
  }

  return usersCollection.findOne({
    $or: [
      ...codeCandidates.flatMap((candidate) => [
        { codigo: candidate },
        ...(Number.isFinite(Number(candidate)) ? [{ codigo: Number(candidate) }] : []),
      ]),
      ...nameCandidates.flatMap((candidate) => [
        { nome: candidate },
        { name: candidate },
        { nome: new RegExp(`^${escapeRegExp(candidate)}$`, 'i') },
        { name: new RegExp(`^${escapeRegExp(candidate)}$`, 'i') },
      ]),
      ...(professionalNameHint ? [{ profissional: professionalNameHint }] : []),
    ],
  });
}

function resolveMetadata(candidates, exameClinico, scheduling, dbUser) {
  const { payloadProfessional, asoProfessional, clinicalProfessionalData } =
    candidates;

  const professionalName =
    pickFirstFilled(
      payloadProfessional?.nome,
      payloadProfessional?.name,
      asoProfessional?.nome,
      asoProfessional?.name,
      clinicalProfessionalData?.nome,
      clinicalProfessionalData?.profissional,
      dbUser?.nome,
      dbUser?.name,
    ) ||
    exameClinico?.profissional ||
    scheduling?.MEDICO ||
    'N/D';

  const cpf =
    pickFirstFilled(
      payloadProfessional?.cpf,
      payloadProfessional?.documento,
      asoProfessional?.cpf,
      asoProfessional?.documento,
      clinicalProfessionalData?.cpf,
      clinicalProfessionalData?.documento,
      dbUser?.cpf,
      dbUser?.documento,
    ) || '';

  const crm =
    pickFirstFilled(
      payloadProfessional?.conselho,
      payloadProfessional?.crm,
      payloadProfessional?.registro,
      asoProfessional?.conselho,
      asoProfessional?.crm,
      asoProfessional?.registro,
      clinicalProfessionalData?.conselho,
      clinicalProfessionalData?.crm,
      clinicalProfessionalData?.registro,
      dbUser?.conselho,
      dbUser?.crm,
      dbUser?.registro,
    ) || '';

  const uf =
    pickFirstFilled(
      payloadProfessional?.ufconselho,
      payloadProfessional?.crm_uf,
      payloadProfessional?.uf,
      asoProfessional?.ufconselho,
      asoProfessional?.crm_uf,
      asoProfessional?.uf,
      clinicalProfessionalData?.ufconselho,
      clinicalProfessionalData?.crm_uf,
      clinicalProfessionalData?.uf,
      dbUser?.ufconselho,
      dbUser?.crm_uf,
      dbUser?.uf,
    ) || '';

  return {
    professionalName,
    cpf,
    crm,
    uf,
    complete: Boolean(professionalName && crm && cpf),
  };
}

function shrinkUser(user) {
  if (!user) return null;
  return {
    codigo: user.codigo,
    nome: user.nome || user.name,
    cpf: user.cpf || user.documento,
    conselho: user.conselho || user.crm || user.registro,
    ufconselho: user.ufconselho || user.crm_uf || user.uf,
  };
}

async function main() {
  const args = parseArgs();
  const queueName =
    process.env.AZURE_QUEUE_ASO_ENRIQUECIMENTO || 'aso-enriquecimento';
  const limit = Math.min(Math.max(Number(args.limit || 10), 1), 32);
  const schedulingIdFilter = String(args.schedulingId || '').trim();
  const prontuarioFilter = String(args.prontuario || '').trim();

  const { client, db } = await connectMongo();
  try {
    const schedulings = db.collection(process.env.MONGO_COLLECTION || 'schedulings');
    const users = db.collection('users');

    let selected = null;
    let scheduling = null;

    if (prontuarioFilter) {
      scheduling = await schedulings.findOne({
        CODIGOPRONTUARIO: prontuarioFilter,
      });
      if (!scheduling) {
        throw new Error(
          `Nenhum scheduling encontrado com prontuario=${prontuarioFilter}.`,
        );
      }
      selected = {
        messageId: null,
        insertedOn: null,
        payload: {
          schedulingId: String(scheduling._id),
          medico:
            scheduling.ASOINFO?.codigoProfissional ||
            scheduling.MEDICO ||
            '',
          profissional: scheduling.ASOINFO?.professional || null,
          credentials: scheduling.ASOINFO?.credentials || null,
          nomeFuncionario: scheduling.NOME || null,
          nomeEmpresa: scheduling.NOMEEMPRESA || null,
          tipoExame: scheduling.TIPOEXAMENOME || null,
        },
      };
    } else {
      const messages = await peekQueueMessages(queueName, limit);
      selected = schedulingIdFilter
        ? messages.find(
            (message) =>
              String(message.payload?.schedulingId || '').trim() === schedulingIdFilter,
          )
        : messages[0];

      if (!selected) {
        throw new Error(
          schedulingIdFilter
            ? `Nenhuma mensagem visível com schedulingId=${schedulingIdFilter} na fila ${queueName}.`
            : `Nenhuma mensagem visível encontrada na fila ${queueName}.`,
        );
      }

      scheduling = await schedulings.findOne({
        _id: new ObjectId(String(selected.payload.schedulingId).trim()),
      });
    }

    if (!scheduling) {
      throw new Error(
        `Scheduling ${selected.payload.schedulingId} não encontrado no Mongo.`,
      );
    }

    const exameClinico = findClinicalExam(scheduling);
    const candidates = buildProfessionalLookupCandidates(
      selected.payload,
      scheduling,
      exameClinico,
    );
    const dbUser = await findDbUser(users, candidates);
    const resolved = resolveMetadata(candidates, exameClinico, scheduling, dbUser);

    console.log(
      JSON.stringify(
        {
          queue: {
            queueName,
            messageId: selected.messageId,
            insertedOn: selected.insertedOn,
            schedulingId: selected.payload.schedulingId,
            mode: prontuarioFilter ? 'mongo-prontuario' : 'queue-peek',
          },
          payload: {
            medico: selected.payload.medico,
            profissional: selected.payload.profissional || null,
            credentials: selected.payload.credentials || null,
            nomeFuncionario: selected.payload.nomeFuncionario,
            nomeEmpresa: selected.payload.nomeEmpresa,
            tipoExame: selected.payload.tipoExame,
          },
          mongo: {
            MEDICO: scheduling.MEDICO || null,
            ASOINFO: {
              codigoProfissional: scheduling.ASOINFO?.codigoProfissional || null,
              professional: scheduling.ASOINFO?.professional || null,
            },
            exameClinico: exameClinico
              ? {
                  codigoProfissional: exameClinico.codigoProfissional || null,
                  profissional: exameClinico.profissional || null,
                  professional: exameClinico.professional || null,
                  formulario: {
                    medico: exameClinico.formulario?.medico || null,
                    profissional: exameClinico.formulario?.profissional || null,
                  },
                }
              : null,
          },
          dbUser: shrinkUser(dbUser),
          resolved,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[diag-aso-queue] erro:', error?.message || error);
  process.exit(1);
});
