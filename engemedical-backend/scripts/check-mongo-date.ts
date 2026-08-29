require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const uri = process.env.MONGO_URL;
  console.log('Connecting to:', uri?.replace(/\/\/.*@/, '//***@'));
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const db = client.db(dbName);
  const coll = db.collection('schedulings');
  const doc = await coll.findOne({ _id: new ObjectId('6a1d5a4db2302a5f1e627935') });
  console.log('NOME:', doc?.NOME);
  console.log('CPFFUNCIONARIO:', doc?.CPFFUNCIONARIO);
  console.log('DATAAGENDAMENTO:', JSON.stringify(doc?.DATAAGENDAMENTO));
  console.log('DATANASCIMENTO:', JSON.stringify(doc?.DATANASCIMENTO));
  console.log('DATAAGENDAMENTO type:', typeof doc?.DATAAGENDAMENTO);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
