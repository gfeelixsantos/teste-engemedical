const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cmso-agendamento');
    const snapCol = db.collection('exam_form_snapshots');
    const schedCol = db.collection('schedulings');

    const start = new Date('2026-08-24T00:00:00.000Z');
    const end = new Date('2026-08-24T23:59:59.999Z');

    const snaps = await snapCol.find({
      codigoExame: '225588',
      createdAt: { $gte: start, $lte: end }
    }).toArray();

    console.log(`Encontrados ${snaps.length} snaps de Psicossocial:`);
    for (const snap of snaps) {
      const sched = await schedCol.findOne({ _id: new (require('mongodb').ObjectId)(snap.schedulingId) });
      console.log(`\nSnap: ${snap._id.toString()} | Sched: ${snap.schedulingId} | Name: ${sched ? sched.NOME : 'N/A'}`);
      console.log(`  CreatedAt: ${snap.createdAt.toISOString()}`);
      console.log(`  Prof: ${snap.profissional?.nome}`);
      console.log(`  Formulario:`, JSON.stringify(snap.formulario));
    }

  } finally {
    await client.close();
  }
}

run().catch(console.error);
