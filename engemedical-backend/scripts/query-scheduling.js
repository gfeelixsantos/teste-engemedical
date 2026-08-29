const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  try {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.MONGO_DATABASE);
    
    const doc = await db.collection('schedulings').findOne({
      CODIGOEMPRESA: "1975781",
      CODIGO: "505"
    });
    
    console.log("Scheduling Doc for CODIGO 505:");
    console.log(JSON.stringify(doc, null, 2));

    await client.close();
  } catch(e) {
    console.error(e);
  }
}
run();
