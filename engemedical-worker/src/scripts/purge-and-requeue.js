/**
 * purge-and-requeue.js
 *
 * Limpa a fila aso-enriquecimento e reenfileira os ASOs pendentes com a URL
 * correta buscada diretamente do MongoDB (ASOINFO.url).
 *
 * Estratégia:
 *  1. Busca todos schedulings com ASOINFO.status FALHA ou DIGITALIZADA que possuem ASOINFO.url
 *  2. Reseta para PENDENTE no Mongo (evita reprocessamentos duplicados)
 *  3. Reenfileira com o payload correto (com url real)
 *
 * Uso:
 *   node src/scripts/purge-and-requeue.js
 *   node src/scripts/purge-and-requeue.js --dry-run  (apenas lista, não enfileira)
 *   node src/scripts/purge-and-requeue.js --limit 20
 */

const { MongoClient, ObjectId } = require('mongodb');
const { QueueServiceClient } = require('@azure/storage-queue');
require('dotenv').config({ path: '.env' });

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;

async function run() {
  if (isDryRun) {
    console.log('=== DRY RUN MODE - nenhuma mensagem sera enviada ===\n');
  }

  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.MONGO_DATABASE);

  // Busca ASOs que falharam OU ficaram em DIGITALIZADA mas possuem URL válida de ASO
  const schedulings = await db.collection('schedulings').find({
    'ASOINFO.status': { $in: ['FALHA', 'DIGITALIZADA'] },
    $and: [
      { 'ASOINFO.url': { $exists: true, $ne: null, $not: /^$/ } },
      { 'ASOINFO.url': { $regex: '/aso/', $options: 'i' } },
    ],
  }).sort({ _id: -1 }).limit(limit).toArray();

  if (schedulings.length === 0) {
    console.log('Nenhum ASO elegivel para reenfileiramento encontrado.');
    await client.close();
    return;
  }

  const withoutUrl = await db.collection('schedulings').countDocuments({
    'ASOINFO.status': { $in: ['FALHA', 'DIGITALIZADA'] },
    $or: [
      { 'ASOINFO.url': { $exists: false } },
      { 'ASOINFO.url': null },
      { 'ASOINFO.url': '' },
    ],
  });

  console.log(`\n=== RESUMO ===`);
  console.log(`Elegíveis para reenfileiramento (com url): ${schedulings.length}`);
  console.log(`SEM url (impossível recuperar via fila):   ${withoutUrl}`);
  console.log(`=============\n`);

  if (withoutUrl > 0) {
    console.log(`AVISO: ${withoutUrl} ASO(s) em FALHA/DIGITALIZADA sem ASOINFO.url.`);
    console.log(`Estes precisam ser gerados novamente pelo backend (finishScheduling).\n`);
  }

  if (isDryRun) {
    console.log('Schedulings que seriam reenfileirados:');
    for (const s of schedulings) {
      console.log(`  - ${s._id} | ${s.NOME} | ${s.NOMEEMPRESA} | url=${s.ASOINFO?.url}`);
    }
    await client.close();
    return;
  }

  const queueName = process.env.AZURE_QUEUE_ASO_ENRIQUECIMENTO || 'aso-enriquecimento';
  const queueServiceClient = QueueServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  const queueClient = queueServiceClient.getQueueClient(queueName);

  let enqueued = 0;
  let skipped = 0;

  for (const s of schedulings) {
    const asoUrl = s.ASOINFO?.url;
    const id = s._id.toString();

    // Valida que a URL é do ASO (proteção extra antes de enviar)
    if (!asoUrl || !asoUrl.toLowerCase().includes('/aso/')) {
      console.log(`  [SKIP] ${id} | ${s.NOME} - URL nao e de ASO: ${asoUrl}`);
      skipped++;
      continue;
    }

    const payload = {
      schedulingId: id,
      url: asoUrl,                                        // URL real do PDF no Blob
      codEmpresa: s.CODIGOEMPRESA || null,
      medico: s.ASOINFO?.codigoProfissional || s.MEDICO || '',
      profissional: s.ASOINFO?.professional || null,
      credentials: s.ASOINFO?.credentials || null,
      nomeFuncionario: s.NOME || 'N/D',
      nomeEmpresa: s.NOMEEMPRESA || 'N/D',
      tipoExame: s.TIPOEXAMENOME || 'N/D',
    };

    try {
      // Reset para PENDENTE no MongoDB para evitar conflito de idempotência
      await db.collection('schedulings').updateOne(
        { _id: s._id },
        {
          $set: {
            'ASOINFO.status': 'PENDENTE',
            'ASOINFO.updatedAt': new Date(),
            'ASOINFO.error': null,
            'ASOINFO.retry.pending': false,
          }
        }
      );

      const messageText = JSON.stringify(payload);
      const b64 = Buffer.from(messageText).toString('base64');
      await queueClient.sendMessage(b64);

      enqueued++;
      console.log(`  [OK] ${id} | ${s.NOME} | ${s.NOMEEMPRESA}`);
      console.log(`       url=${asoUrl.slice(-60)}`);
    } catch (err) {
      console.error(`  [ERRO] ${id} | ${s.NOME} - ${err.message}`);
    }
  }

  console.log(`\n=== CONCLUIDO ===`);
  console.log(`Enfileirados: ${enqueued}`);
  console.log(`Ignorados:    ${skipped}`);

  await client.close();
}

run().catch((err) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
