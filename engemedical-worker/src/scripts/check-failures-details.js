const { MongoClient } = require('mongodb');

async function run() {
  const mongoUrl = "mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/?appName=engemedical-connect";
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db("cmso-agendamento");

  const query = {
    'ASOINFO.status': 'FALHA'
  };

  const schedulings = await db.collection('schedulings')
    .find(query)
    .sort({ _id: -1 })
    .limit(10)
    .toArray();

  console.log(`Found ${schedulings.length} failures (newest first):\n`);
  for (const s of schedulings) {
    console.log(`ID: ${s._id} | Funcionario: ${s.NOME}`);
    console.log(`ASOINFO: ${JSON.stringify(s.ASOINFO, null, 2)}`);
    console.log(`----------------------------------------`);
  }

  await client.close();
}

run().catch(console.error);
