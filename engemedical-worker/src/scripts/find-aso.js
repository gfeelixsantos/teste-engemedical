const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });
async function run() {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.MONGO_DATABASE);
  const docs = await db.collection('schedulings').find({ 
    'ASOINFO.url': { $regex: 'pdf$' } 
  }).sort({_id: -1}).limit(2).toArray();
  docs.forEach(d => console.log(d.CODIGOPRONTUARIO, d.ASOINFO?.url, d.ASOINFO?.codigoProfissional, d.NOME));
  await client.close();
}
run().catch(console.error);
