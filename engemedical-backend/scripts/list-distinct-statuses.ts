import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error('MONGO_URL não configurada.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const db = client.db(dbName);
  const coll = db.collection('schedulings');

  console.log('🔍 Buscando valores distintos de ATENDIMENTOSTATUS no banco...');
  const distinctStatuses = await coll.distinct('ATENDIMENTOSTATUS');
  
  const counts: Record<string, number> = {};
  for (const status of distinctStatuses) {
    const count = await coll.countDocuments({ ATENDIMENTOSTATUS: status });
    counts[status || 'Nulo/Indefinido'] = count;
  }

  console.log('=============== STATUS EXISTENTES NO BANCO DE DADOS ===============');
  console.table(counts);
  console.log('===================================================================\n');

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
