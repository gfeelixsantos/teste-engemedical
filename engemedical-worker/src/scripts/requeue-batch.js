const { MongoClient, ObjectId } = require('mongodb');
const { QueueServiceClient } = require('@azure/storage-queue');
require('dotenv').config({ path: '.env' });

async function run() {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.MONGO_DATABASE);

  // Busca 10 ASOs recentes que estao travados em DIGITALIZADA
  // (FALHA sao ignorados aqui para evitar loops - so reprocessar DIGITALIZADA)
  const schedulings = await db.collection('schedulings').find({
    'ASOINFO.status': 'DIGITALIZADA',
    'ASOINFO.url': { $exists: true, $ne: null },
    'ASOINFO': { $exists: true }
  }).sort({ _id: -1 }).limit(10).toArray();

  if (schedulings.length === 0) {
    console.log('Nenhum ASO encontrado em status DIGITALIZADA ou FALHA para teste.');
    await client.close();
    return;
  }

  const queueName = process.env.AZURE_QUEUE_ASO_ENRIQUECIMENTO || 'aso-enriquecimento';
  const queueServiceClient = QueueServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const queueClient = queueServiceClient.getQueueClient(queueName);
  
  // Assegura que a fila existe
  try { await queueClient.create(); } catch(e){}

  console.log(`Encontrados ${schedulings.length} ASOs. Enfileirando em ${queueName}...`);

  for (const s of schedulings) {
    const payload = {
      schedulingId: s._id.toString(),
      url: s.ASOINFO?.url || null,               // <<< URL real do PDF no Blob
      codEmpresa: s.CODIGOEMPRESA || null,
      medico: s.ASOINFO?.codigoProfissional || s.MEDICO || '',
      profissional: s.ASOINFO?.professional || null,
      credentials: s.ASOINFO?.credentials || null,
      nomeFuncionario: s.NOME || 'N/D',
      nomeEmpresa: s.NOMEEMPRESA || 'N/D',
      tipoExame: s.TIPOEXAMENOME || 'N/D'
    };

    const messageText = JSON.stringify(payload);
    // Encode do payload em base64 como padrao Azure Storage Queue string base
    const b64 = Buffer.from(messageText).toString('base64');
    
    await queueClient.sendMessage(b64);
    console.log(`- Enfileirado: ${s.CODIGOPRONTUARIO} | Trabalhador: ${s.NOME} | Antigo Status: ${s.ASOINFO?.status}`);
  }

  console.log('--- LOTE DE TESTE CONCLUIDO ---');
  await client.close();
}

run().catch(console.error);
