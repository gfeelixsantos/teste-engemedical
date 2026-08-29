import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGO_URL || 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/';
const MONGO_DB = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';

async function main() {
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const collection = mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION);

  // Busca o documento correspondente pelo id
  const doc = await collection.findOne({ _id: new ObjectId('69d4e82b8d4478166f5f5057') });
  
  if (!doc) {
    console.log('Documento não encontrado no MongoDB.');
    await mongoClient.close();
    return;
  }

  console.log('--- Documento do MongoDB ---');
  console.log('Nome:', doc.NOME);
  console.log('Data Agendamento:', doc.DATAAGENDAMENTO);
  console.log('Status do Atendimento:', doc.ATENDIMENTOSTATUS);
  console.log('Exames:');
  for (const ex of doc.EXAMES || []) {
    console.log(`- [${ex.grupo}] ${ex.nomeExame} | Status: ${ex.status} | URL: "${ex.url}"`);
  }

  await mongoClient.close();
}

main().catch(err => {
  console.error('Erro:', err);
});
