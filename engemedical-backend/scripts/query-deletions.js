const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function run() {
  try {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.MONGO_DATABASE);
    
    const start = new Date('2026-08-17T00:00:00.000Z');
    const end = new Date('2026-08-20T23:59:59.999Z');
    
    const docs = await db.collection('deletion_snapshots').find({
      criadoEm: { $gte: start, $lte: end },
      acao: 'REMOVER_ANEXO'
    }).toArray();
    
    fs.writeFileSync('deletions_report.json', JSON.stringify(docs, null, 2));
    console.log(`Saved ${docs.length} deletion snapshots to deletions_report.json`);

    await client.close();
  } catch(e) {
    console.error(e);
  }
}
run();
