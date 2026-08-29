const { MongoClient } = require('mongodb');
const { QueueServiceClient } = require('@azure/storage-queue');
require('dotenv').config({ path: '.env' });

async function run() {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.MONGO_DATABASE);

  // Conta quantos estao parados. "Gerando PDF" geralmente é PENDENTE ou DIGITALIZADA.
  const query = {
    'ASOINFO.status': { $in: ['DIGITALIZADA', 'PENDENTE', 'FALHA'] },
    'createdAt': { $gte: new Date('2026-04-20T00:00:00Z') }, // Para isolar casos recentes "stuck"
    'ASOINFO': { $exists: true }
  };

  const count = await db.collection('schedulings').countDocuments(query);
  console.log('Total ASO stuck:', count);

  // TODO: Quando autorizado, iterar sobre esse DB e re-publicar na aso-processing
  await client.close();
}

run().catch(console.error);
