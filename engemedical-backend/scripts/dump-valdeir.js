const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/?appName=engemedical-connect';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cmso-agendamento');
    const col = db.collection('schedulings');

    const doc = await col.findOne({ _id: new ObjectId('6a71df4b8960148d09b99462') });
    console.log(JSON.stringify(doc, null, 2));

  } finally {
    await client.close();
  }
}

run().catch(console.error);
